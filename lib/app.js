'use strict';
const Promise = require('bluebird');
const express = require('express');
const app = module.exports = express();
const bodyParser = require('body-parser');
const session = require('cookie-session');
const dao = require('./dao');
const fs = require('fs');
const compression = require('compression');
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
const morgan = require('morgan');
const jwt = require('express-jwt')({
	secret: secret.jwtSecret,
	getToken: function (req) {
		if (req.session && req.session.jwt) {
			return req.session.jwt;
		} else {
			return null;
		}
	}
})

const jwthelper = require('./jwthelper');
app.set('x-powered-by', false);
app.use(morgan('combined'));
app.use(compression());
app.use(session({
	keys: secret.cookieKeys,
	signed: true,
	maxAge: 9999999000000
}));
app.use(bodyParser.json());

// migrate to JWTs
app.use(function (req, res, next) {
	if (req.session && req.session.phonenumber) {
		console.log('Migrated ' + req.session.phonenumber + ' to JWT');
		req.session.jwt = jwthelper.signDefault({ phonenumber: req.session.phonenumber });
	}
	delete req.session.phonenumber;
	next();
})

app.all('/api/messages*', jwt);
app.all('/api/conversations*', jwt);
app.all('/api/me*');

app.post('/api/me/nickname', jwt, function (req, res) {
	dao.updateNickname(req.user.phonenumber, req.body.nickname)
	.then(function (response) {
		res.status(200).json(response);
	})
})

app.get('/api/me/nickname', function (req, res) {
	if (req.user && req.user.phonenumber) {
		dao.getNickname(req.user.phonenumber)
		.then(function (response) {
			res.status(200).json(response);
		})
	} else {
		res.status(401).send();
	}
})

app.post('/api/messages', function (req, res) {
	var to = req.body.to;

	if (!_.isArray(to)) {
		res.status(400).json('To field must be an array.');
	}

	to = to.map(function (item) {
		return new Phone(item).strip()
	});

	var invalid = false;

	to.forEach(function (item) {
		var x = new Phone(item);
		if (x.strip().length != 10) {
			invalid = true;
		}
	});

	if (invalid) {
		res.status(400).json('Invalid recipient. Make sure the to field contains ten digit phone numbers.');
		return;
	}

	const text = req.body.text;

	var message = new Message();
	message.to = message.to.concat(to);
	message.from = req.user.phonenumber;
	message.text = text;
	dao.sendMessage(message);
	res.status(201);
	res.send();
});

app.get('/api/messages', function (req, res) {
	if (req.query.group) {
		try {
			var group = JSON.parse(req.query.group);
		} catch (e) {
			return res.status(400).send('Invalid JSON');
		}
	}
	res.setHeader('Content-Type', 'application/json');
	dao.getMessages(req.user.phonenumber, group)
	.pipe(res);
});

app.get('/api/conversations', function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	dao.getConversations(req.user.phonenumber)
	.then(function (result) {
		return res.status(200).json(result);
	})
});

app.delete('/api/messages/:id', function (req, res) {
	const id = req.params.id;
	dao.delete(req.user.phonenumber, id)
	.then(function (result) {
		return res.status(204).send();
	})
	.catch(function (error) {
		return res.status(500).json(error);
	})
});

app.delete('/api/messages', function (req, res) {
	dao.deleteAllMessages(req.user.phonenumber)
	.then(function (response) {
		res.status(204).send();
	})
});

app.post('/api/registration/logout', jwt, function (req, res) {
	req.session = null;
	res.status(200).json('Logged out')
});

function updateDao(req) {
	if (req.user && req.user.phonenumber && req.session.subscriptionId) {
		return dao.addPhoneToSubId(req.user.phonenumber, req.session.subscriptionId)
		// todo proper error handle
		.finally(function () {
			dao.recordLogin(req.user.phonenumber, req.ip)
		})
	}
}

app.post('/api/registration/subscription', function (req, res) {
	if (req.body.subscriptionId) {
		req.session.subscriptionId = req.body.subscriptionId;
		updateDao(req);
		// todo check status
		res.status(200).json('subscribed');
	} else {
		res.status(400).json('missing id')
	}
});

function genRand() {
	return Math.random().toString(10).substring(2, 8);
}

app.post('/api/registration/phone', brute.prevent, function (req, res) {
	if (req.body.phonenumber) {
		const ph = new Phone(req.body.phonenumber).strip();

		if (ph.length != 10) {
			res.status(400).json('Phone number needs to be 10 digits.');
			return;
		}

		const rand = genRand();
		req.session.phonenumberUnauthed = ph;

		dao.addVerificationCode(ph, rand)
		.then(function () {
			console.log("Code: " + rand + " for " + ph);

			if (SEND_CODES) {
				text.send(ph, "Verification code: " + rand);
			}
		})

	} else {
		res.status(400).json('Invalid phone number.')
	}

	if (req.session.phonenumberUnauthed) {
		res.status(200).json('Code sent.')
	} else {
		res.status(400).json('Invalid phone number.')
	}
});

app.post('/api/registration/code', brute.prevent, function (req, res) {
	if (req.body.code) {
		const ph = req.session.phonenumberUnauthed;
		const code = req.body.code;
		dao.getVerificationCodes(ph)
		.then(function (realCodes) {
			if (_.contains(realCodes, req.body.code)) {
				console.log(code + " matched code " + realCodes + " for " + ph);
				brute.reset(req.ip, null); // reset bruteforce tracking, since user is logged in.
				req.session.phonenumberUnauthed = null;
				req.session.jwt = jwthelper.signDefault({ phonenumber: ph });

				updateDao(req)
				return res.status(200).json(ph);

			} else {
				console.log(code + " didn't match any code " + realCodes + " for " + ph);
				return res.status(401).json('invalid code');
			}
		})
	} else {
		res.status(401).json('not logged in')
	}
});

app.get('/api/registration/phone', function (req, res) {
	if (req.user.phonenumber) {
		res.status(200).json(req.user.phonenumber)
	} else {
		res.status(200).json('')
	}
});

app.use(express.static('client'));

app.use(function (err, req, res, next) {
	if (err.name === 'UnauthorizedError') {
		res.status(401).send('invalid token');
	} else return next();
});
