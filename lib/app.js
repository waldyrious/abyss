'use strict';
const Promise = require('bluebird');
const koa = require('koa');
const app = module.exports = koa();
const session = require('koa-session');
const dao = require('./dao');
const fs = require('fs');
const compress = require('koa-compressor')();
const text = Promise.promisifyAll(require('./textbelt/text'));
const Phone = require('../model/phone.js');
const _ = require('lodash');
const secret = require('../secret/secret.json');
const SEND_CODES = secret.sendverificationcodes;
const Message = require('../model/message');
const url = require('url');
const helmet = require('koa-helmet');

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
app.use(helmet.iexss());
app.use(helmet.xframe('deny'));
app.use(helmet.ienoopen());
app.use(helmet.contentTypeOptions());
app.use(helmet.permittedCrossDomainPolicies());


if (secret.wwwredirect) {
	app.use(function *(next) {
		var r = /^www./

		if (this.request.header.host.match(r)) {
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

const router = require('koa-router')();

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

router.post('/api/messages', jwtrequired, function *(next) {
	var to = this.request.body.to;

	if (!_.isArray(to)) {
		this.response.status = 400;
		this.response.body = {
			success: false,
			message: 'To field must be an array.'
		}
		return;
	}

	to = to.map(function (item) {
		return new Phone(item).strip()
	});

	to.forEach(function (item) {
		var x = new Phone(item);
		if (x.strip().length != 10) {
			this.response.status = 400;
			this.response.body = {
				success: false,
				message: 'Invalid recipient. Make sure the to field contains ten digit phone numbers.'
			}
			return;
		}
	});

	const text = this.request.body.text;

	var message = new Message();
	message.to = message.to.concat(to);
	message.from = this.state.user.phonenumber;
	message.text = text;
	dao.sendMessage(message);
	this.response.status = 201;
	this.response.body = {
		success: false,
		message: 'Created.'
	}
});

router.get('/api/messages', jwtrequired, function *(next) {
	if (this.request.query.group) {
		var group = JSON.parse(this.request.query.group);
	}
	this.response.headers['content-type'] = 'application/json';
	this.body = dao.getMessages(this.state.user.phonenumber, group);
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

router.get('/api/file/:id', jwtcookie, function*(next) {
	var self = this;
	var file = yield dao.getFile(this.state.user.phonenumber, this.params.id);
	this.set('Last-Modified', file.date);
	this.set('Cache-Control', 'no-transform,private,max-age=1600');
	this.response.body = file.data;
});

router.post('/api/file', jwtrequired, function*(next) {
	var self = this;

	if (this.request.query.group) {
		var to = JSON.parse(this.request.query.group);
	}

	if (!_.isArray(to))	 {
		this.response.status = 400;
		this.response.body = {
			success: false,
			message: 'Group must be an array.'
		}
		return;
	}

	to = to.map(function (item) {
		return new Phone(item).strip()
	});

	to.forEach(function (item) {
		var x = new Phone(item);
		if (x.strip().length != 10) {
			self.response.status = 400;
			self.response.body = {
				success: false,
				message: 'Invalid recipient. Make sure the to field contains ten digit phone numbers.'
			}
			return;
		}
	});

	var parts = parse(this);
	var part;

	while (part = yield parts) {
		var stream = fs.createWriteStream(path.join(os.tmpdir(), Math.random().toString()));
		var buffer = yield streamToBuffer(part);
		yield dao.addFile(self.state.user.phonenumber, to, 'filename', buffer);
		self.response.status = 204;
		// self.response.body = {
		// 	success: true,
		// 	message: 'File uploaded.'
		// }
		// part.pipe(dao.uploadFilePipeable(function () {
		// 	console.log('done');
		// }));
		// console.log('uploading %s -> %s', part.filename, stream.path);
	}
});
app.use(router.routes());
app.use(router.allowedMethods());
app.use(require('koa-serve-static')('client'));
