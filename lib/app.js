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
const moment = require('moment');
const notify = require('./notify');
const favicon = require('koa-favicon');

if (SEND_CODES)
	console.log("Sending verification codes");
else
	console.log("NOT sending verification codes");

const brute = require('./brute');
const morgan = require('koa-morgan');

const jwtrequired = require('koa-jwt')({secret: secret.jwtSecret})
/* jwt must be in cookie for img requests, since we can't add headers to those */
const jwtcookie = require('./jwtcookie')({secret: secret.jwtSecret})
const jwtoptional = require('koa-jwt')({secret: secret.jwtSecret, passthrough: true})
const jwthelper = require('./jwthelper');

app.use(favicon(__dirname + '/../app/favicon/favicon.ico'));

app.use(require('koa-response-time')());
app.use(morgan.middleware());
app.use(helmet.frameguard());
app.use(helmet.xssFilter());
app.use(helmet.ieNoOpen());

if (secret.wwwredirect) {
	app.use(require('./wwwredirect'));
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
		message: err.stack
	})

    // since we handled this manually we'll
    // want to delegate to the regular app
    // level error handling as well so that
    // centralized still functions correctly.
    this.app.emit('error', err, this);
  }
});

const router = require('koa-router')();

router.get('/api/me', jwtoptional, function *(next) {
	if (this.state.user) {
		if (!this.state.user.id) {
			this.cookies.set('jwt', '', {expires: new Date(1), path: '/'});
			this.status = 401;
		} else {
			let response = yield dao.getUser(this.state.user.id)
			this.response.body = response;
		}
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
		let response = yield dao.updateNickname(this.state.user.id, this.request.body.nickname)
		let user = yield dao.getUser(this.state.user.id);
		self.response.body = user;
	} else {
		if (this.request.body.phonenumber) {
			const ph = new Phone(this.request.body.phonenumber).strip();
			if (ph.length != 10) {
				this.status = 400;
				this.body = {success:false, message:'Phone number needs to be 10 digits.'};
			} else {
				const rand = Math.random().toString(10).substring(2, 8);
				this.session.phonenumberUnauthed = ph;
				yield dao.addVerificationCode(ph, rand);
				console.log("Code: " + rand + " for " + ph);
				if (SEND_CODES) {
					text.send(ph, "Verification code: " + rand);
				}

				self.response.body = {success:true, message: 'Code sent.'};
			}
		} else if (this.request.body.code) {
			const ph = this.session.phonenumberUnauthed;
			const code = this.request.body.code;
			let realCodes = yield dao.getVerificationCodes(ph);
			if (_.contains(realCodes, code)) {
				console.log(code + " matched code " + realCodes + " for " + ph);
				self.state.brute.reset(); // reset bruteforce tracking, since user is logged in.
				self.session.phonenumberUnauthed = null;

 				this.state.user = yield dao.getUser(ph);

				try {
					yield dao.recordLogin(this.state.user.id, self.request.ip);
				} catch (e) {
					console.error(e.stack);
				}

				let response = yield dao.getUserAndClearVerificationCodes(ph);
				let jwt = jwthelper.signDefault(response);
				// response.jwt = jwthelper.signDefault({ phonenumber: response.id });
				this.cookies.set('jwt', jwt, {httpOnly: false, signed: false, expires: moment().add(365, 'days').toDate()});

				self.response.body = response;
			} else {
				self.response.status = 400;
				self.response.body = {
					success: false,
					message: 'Invalid code.'
				}
			}
		}
	}
})

router.post('/api/registration/subscription', jwtrequired, function *(next) {
	if (this.request.body.endpoint) {
		this.session.endpoint = this.request.body.endpoint;

		let response = yield dao.addSubscriptionToUser(this.state.user.id, this.session.endpoint);
		this.status = 200;
		this.body = {
			success: true,
			message: 'Subscribed.',
			endpoint: this.session.endpoint
		}
		notify(this.state.user.id);
	} else {
		this.status = 400;
		this.body = {
			success: false,
			message: 'Missing endpoint.'
		}
	}
});

router.delete('/api/registration/subscription', jwtrequired, function *(next) {
	const endpoint = this.query.endpoint;

	if (endpoint) {
		yield dao.removeSubscriptionFromUser(this.state.user.id, endpoint)
		this.status = 204;
	} else {
		this.status = 400;
		this.body = {
			success: false,
			message: 'Missing endpoint.'
		}
	}
});

router.post('/api/messages', jwtrequired, function *(next) {
	let to = sanitizeto(this.request.query.to);
	const text = this.request.body.text;

	let message = new Message();
	message.to = message.to.concat(to);
	message.from = this.state.user.id;
	message.text = text;
	yield dao.sendMessage(message);
	this.response.status = 201;
	this.response.body = {
		success: true,
		message: 'Created.'
	}
});

router.get('/api/messages', jwtrequired, function *(next) {
	let to = sanitizeto(this.request.query.to);
	this.set('Content-Type', 'application/json; charset=utf-8');

	let page = Number(this.query.page);
	let per_page = Number(this.query.per_page);

	this.body = dao.getMessages(this.state.user.id, to, page, per_page);
});

router.get('/api/conversations', jwtrequired, function *(next) {
	this.response.body = yield dao.getConversations(this.state.user.id);
});

router.delete('/api/messages/:id', jwtrequired, function *(next) {
	const id = this.params.id;
	yield dao.delete(this.state.user.id, id);
	this.status = 204;
});

router.delete('/api/messages', jwtrequired, function *(next) {
	yield dao.deleteAllMessages(this.state.user.id);
	self.status = 204;
});

const parse = require('co-busboy');
const path = require('path');
const os = require('os');
const streamToBuffer = Promise.promisify(require('stream-to-buffer'));

function getFilePath(senderId, fileId) {
	return path.join(secret.blobs, senderId, fileId);
}

router.get('/api/file/:id', jwtcookie, function*(next) {
	let message = yield dao.getFileMessage(this.state.user.id, this.params.id);
	let path = getFilePath(message.from, message.file.id);
	let stat = yield fs.statAsync(path);
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
	let self = this;
	let to = sanitizeto(this.request.query.to);

	let parts = parse(this);
	let part;

	while (part = yield parts) {
		let fileInfo = {
			from: self.state.user.id,
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
