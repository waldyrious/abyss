'use strict';
const Promise = require('bluebird');
const koa = require('koa');
const app = module.exports = koa();
const session = require('koa-session');
const dao = require('./dao');
const fs = Promise.promisifyAll(require('fs'));
const compress = require('koa-compress')();
const text = Promise.promisifyAll(require('./textbelt/text'));
const Phone = require('../model/phone.js');
const _ = require('lodash');
const secret = require('../secret/secret.json');
const SEND_CODES = secret.sendverificationcodes;
const Message = require('../model/message');
const url = require('url');
const helmet = require('koa-helmet');
const sanitizeto = require('./sanitizeto');

if (SEND_CODES)
	console.log("Sending verification codes");
else
	console.log("NOT sending verification codes");

const brute = require('./brute');
const morgan = require('koa-morgan');

const jwtrequired = require('koa-jwt')({
	secret: secret.jwtSecret,
})

/* jwt must be in cookie for img requests, since we can't add headers to those */
const jwtcookie = require('./jwtcookie')({
	secret: secret.jwtSecret
})

const jwtoptional = require('koa-jwt')({
	secret: secret.jwtSecret,
	passthrough: true
})

const jwthelper = require('./jwthelper');

app.use(require('koa-response-time')());
app.use(morgan.middleware());
app.use(helmet.frameguard());
app.use(helmet.xssFilter());
app.use(helmet.ieNoOpen());


if (secret.wwwredirect) {
	app.use(function *(next) {
		var r = /^www./

		if (this.request.get('host') && this.request.get('host').match(r)) {
			var origUrl;
			if (secret.httpredirect) {
				origUrl = 'https://' + this.request.header.host + this.request.url;
			} else {
				origUrl = this.secure ? 'https://' : 'http://' + this.request.header.host + this.request.url;
			}

			var urlObject = url.parse(origUrl);

			delete urlObject.host;
			urlObject.hostname = urlObject.hostname.replace(r, '');

			this.response.status = 301;
			this.response.redirect(url.format(urlObject));
		} else {
			yield next;
		}
	})
}

if (secret.httpredirect) {
	console.log('Force SSL enabled');
	app.use(require('koa-force-ssl')());
}

app.use(compress)
app.keys = secret.cookieKeys;

app.use(session({
	maxAge: 9999999999000
}, app));

app.use(require('koa-bodyparser')());

// delete old session objects
app.use(function *(next) {
	delete this.session.phonenumber;
	delete this.session.jwt;
	yield next;
})

app.use(function *(next){
  try {
    yield next;
  } catch (err) {
    // some errors will have .status
    // however this is not a guarantee
    this.status = err.status || 500;
    this.type = 'application/json';
    this.body = JSON.stringify({
		success: false,
		message: err.toString()
	})

    // since we handled this manually we'll
    // want to delegate to the regular app
    // level error handling as well so that
    // centralized still functions correctly.
    this.app.emit('error', err, this);
  }
});

const router = require('koa-router')();

var substream = require('./substream');

const Readable = require('stream').Readable;
const SSE = require('./sse');

router.get('/api/updates', jwtcookie, function *(next) {
	this.compress = false;
	// https://github.com/koajs/examples/blob/master/stream-server-side-events/app.js
	this.req.setTimeout(Number.MAX_VALUE);

	// this.type = 'text/event-stream; charset=utf-8';
	this.type = 'text/event-stream';
	this.set('Cache-Control', 'no-cache');
	this.set('Connection', 'keep-alive');

	// if the connection closes or errors,
	// we stop the SSE.
	var socket = this.socket;
	socket.on('error', close);
	socket.on('close', close);

	var rs = Readable();
	var body = this.body = new SSE();
	rs.pipe(body)

	var buffer = [];

	rs._read = function () {} //noop, we push below

	function close() {
		rs.unpipe(body);
		socket.removeListener('error', close);
		socket.removeListener('close', close);
	}
	dao.getUpdates(this.state.user.phonenumber)
	// dao.getUpdates('5558675309')
	.run()
	.then(function (cursor) {
		cursor.each(function (nothing, changes) {
			if (changes !== null) {
				rs.push(JSON.stringify(changes))
			}
		})
	})
})
router.get('/api/me', jwtoptional, function *(next) {
	var self = this;
	if (this.state.user) {
		yield dao.getUser(this.state.user.phonenumber)
		.then(function (response) {
			response.jwt = jwthelper.signDefault({ phonenumber: response.id });
			self.response.body = response;
		})
	} else {
		this.status = 401;
		this.body = {};
	}
})

router.delete('/api/me', jwtrequired, function *(next) {
	this.session = null;
	this.status = 200;
	this.body = {};
});

router.post('/api/me', brute, jwtoptional, function *(next) {
	const self = this;

	if (this.state.user != undefined && this.request.body.nickname != undefined) {
		this.state.brute.reset();
		yield dao.updateNickname(this.state.user.phonenumber, this.request.body.nickname)
		.then(function (response) {
			return dao.getUser(self.state.user.phonenumber)
			.then(function (user) {
				self.response.body = user;
			})
		})
	} else {
		if (this.request.body.phonenumber) {
			const ph = new Phone(this.request.body.phonenumber).strip();
			if (ph.length != 10) {
				this.status = 400;
				this.body = {success:false, message:'Phone number needs to be 10 digits.'};
			} else {
				const rand = Math.random().toString(10).substring(2, 8);
				this.session.phonenumberUnauthed = ph;
				yield dao.addVerificationCode(ph, rand).then(function () {
					console.log("Code: " + rand + " for " + ph);
					if (SEND_CODES) {
						text.send(ph, "Verification code: " + rand);
					}

					self.response.body = {success:true, message: 'Code sent.'};
				})
			}
		} else if (this.request.body.code) {
			const ph = this.session.phonenumberUnauthed;
			const code = this.request.body.code;
			yield dao.getVerificationCodes(ph)
			.then(function (realCodes) {
				if (_.contains(realCodes, code)) {
					console.log(code + " matched code " + realCodes + " for " + ph);
					self.state.brute.reset(); // reset bruteforce tracking, since user is logged in.
					self.session.phonenumberUnauthed = null;

					updateDao.bind(self)();
					return dao.getUserAndClearVerificationCodes(ph)
					.then(function (response) {
						response.jwt = jwthelper.signDefault({ phonenumber: response.id });
						self.response.body = response;
					})
				} else {
					self.response.status = 400;
					self.response.body = {
						success: false,
						message: 'Invalid code.'
					}
				}
			})
		}
	}
})

function updateDao() {
	var self = this;
	if (this.state.user && this.state.user.phonenumber && this.session.subscriptionId) {
		return dao.addSubscriptionToUser(this.state.user.phonenumber, this.session.subscriptionId)
		// todo proper error handle
		.then(function () {
			return dao.recordLogin(self.state.user.phonenumber, self.request.ip)
		})
	}
}

router.post('/api/registration/subscription', jwtrequired, function *(next) {
	var self = this;

	if (this.request.body.subscriptionId) {
		this.session.subscriptionId = this.request.body.subscriptionId;
		yield updateDao.bind(this)()
		.then(function (response) {
			self.response.status = 200;
			self.response.body = {
				success: true,
				message: 'Subscribed.'
			}
		})
	} else {
		this.status = 400;
		this.response.body = {
			success: false,
			message: 'Missing ID.'
		}
	}
});

router.delete('/api/registration/subscription', jwtrequired, function *(next) {
	var self = this;

	const gcmprefix = 'https://android.googleapis.com/gcm/send/';
	const endpoint = this.query.endpoint;

	if (endpoint && endpoint.startsWith(gcmprefix)) {
		const id = endpoint.split(gcmprefix).pop();
		// console.log('unsubscribing id ' + id);
		yield dao.removeSubscriptionFromUser(this.state.user.phonenumber, id)
		this.status = 204;
	} else {
		this.status = 400;
		this.body = {
			success: false,
			message: 'Missing ID or unknown.'
		}
	}
});

router.post('/api/messages', jwtrequired, function *(next) {
	var to = sanitizeto(this.request.query.to);
	const text = this.request.body.text;

	var message = new Message();
	message.to = message.to.concat(to);
	message.from = this.state.user.phonenumber;
	message.text = text;
	yield dao.sendMessage(message);
	this.response.status = 201;
	this.response.body = {
		success: true,
		message: 'Created.'
	}
});

router.get('/api/messages', jwtrequired, function *(next) {
	var to = sanitizeto(this.request.query.to);
	this.set('Content-Type', 'application/json; charset=utf-8');

	var page = Number(this.query.page);
	var per_page = Number(this.query.per_page);

	this.body = dao.getMessages(this.state.user.phonenumber, to, page, per_page);
});

router.get('/api/conversations', jwtrequired, function *(next) {
	var self = this;
	yield dao.getConversations(this.state.user.phonenumber)
	.then(function (result) {
		self.response.body = result;
	})
});


router.delete('/api/messages/:id', jwtrequired, function *(next) {
	var self = this;

	const id = this.params.id;
	yield dao.delete(this.state.user.phonenumber, id)
	.then(function (result) {
		self.status = 204;
	})
});

router.delete('/api/messages', jwtrequired, function *(next) {
	var self = this;

	yield dao.deleteAllMessages(this.state.user.phonenumber)
	.then(function (response) {
		self.status = 204;
	})
});

var parse = require('co-busboy');
var path = require('path');
var os = require('os');
var streamToBuffer = Promise.promisify(require('stream-to-buffer'));

function getFilePath(senderId, fileId) {
	return path.join(secret.blobs, senderId, fileId);
}

router.get('/api/file/:id', jwtcookie, function*(next) {
	var message = yield dao.getFileMessage(this.state.user.phonenumber, this.params.id);
	var path = getFilePath(message.from, message.file.id);
	var stat = yield fs.statAsync(path);
	// this.set('Last-Modified', message.date); // use message creation file
	this.set('Last-Modified', stat.mtime); // use file modification time
	// this.set('Cache-Control', 'no-transform,private,max-age=259200'); // 3 days

	if (message.file.type.indexOf('image/') !== 0) {
		this.set('Content-Disposition', 'attachment; filename="' + encodeURIComponent(message.file.name) + '"');
	}

	if (message.file.type) {
		this.set('Content-Type', message.file.type);
	}

	this.body = fs.createReadStream(getFilePath(message.from, message.file.id));
});

router.post('/api/file', jwtrequired, function*(next) {
	var self = this;
	var to = sanitizeto(this.request.query.to);

	var parts = parse(this);
	var part;

	while (part = yield parts) {
		var fileInfo = {
			from: self.state.user.phonenumber,
			to: to,
			name: this.request.query.name,
			type: this.request.query.type,
			size: this.request.query.size,
			lastModified: this.request.query.lastModified
		}
		yield dao.addFileStreamed(fileInfo, part)
		self.response.status = 204;
	}
});
app.use(router.routes());
app.use(router.allowedMethods());
app.use(require('koa-serve-static')('client'));
