'use strict';
const Promise = require('bluebird');
const koa = require('koa');
const app = module.exports = koa();
const bodyParser = require('body-parser');
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

if (SEND_CODES)
	console.log("Sending verification codes");
else
	console.log("NOT sending verification codes");

const brute = require('./brute');
const morgan = require('koa-morgan');

const jwtrequired = require('koa-jwt')({
	secret: secret.jwtSecret,
})

const jwtoptional = require('koa-jwt')({
	secret: secret.jwtSecret,
	passthrough: true
})

const jwthelper = require('./jwthelper');

app.use(morgan.middleware());
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

router.get('/api/me', jwtrequired, function *(next) {
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

router.post('/api/me', jwtoptional, function *(next) {
	const self = this;

	if (this.state.user != undefined && this.request.body.nickname != undefined) {
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
				this.body = 'Phone number needs to be 10 digits.';
			}
			const rand = Math.random().toString(10).substring(2, 8);
			this.session.phonenumberUnauthed = ph;
			yield dao.addVerificationCode(ph, rand).then(function () {
				console.log("Code: " + rand + " for " + ph);
				if (SEND_CODES) {
					text.send(ph, "Verification code: " + rand);
				}

				self.response.body = {success:true, message: 'ok'};
			})
		} else if (this.request.body.code) {
			const ph = this.session.phonenumberUnauthed;
			const code = this.request.body.code;
			yield dao.getVerificationCodes(ph)
			.then(function (realCodes) {
				if (_.contains(realCodes, code)) {
					console.log(code + " matched code " + realCodes + " for " + ph);
					// brute.reset(req.ip, null); // reset bruteforce tracking, since user is logged in.
					self.session.phonenumberUnauthed = null;

					updateDao.bind(self)();
					return dao.getUserAndClearVerificationCodes(ph)
					.then(function (response) {
						response.jwt = jwthelper.signDefault({ phonenumber: response.id });
						self.response.body = response;
					})
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

// jwtrequired
router.post('/api/registration/subscription', jwtrequired, function *(next) {
	if (this.request.body.subscriptionId) {
		this.session.subscriptionId = this.request.body.subscriptionId;
		updateDao.bind(this)();
		// todo check status
		this.response.status = 200;
		this.response.body = {
			success: true,
			message: 'Subscribed.'
		}
	} else {
		this.status = 400;
		this.response.body = {
			success: true,
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
	return dao.delete(this.state.user.phonenumber, id)
	.then(function (result) {
		self.status = 204;
	})
});

router.delete('/api/messages', jwtrequired, function *(next) {
	var self = this;

	return dao.deleteAllMessages(this.state.user.phonenumber)
	.then(function (response) {
		self.status = 204;
	})
});

app.use(router.routes());
app.use(router.allowedMethods());
app.use(require('koa-static')('client'));
