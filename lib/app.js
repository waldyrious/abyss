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

app.set('x-powered-by', false);

const morgan = require('morgan');
app.use(morgan('combined'));
app.use(compression());


app.use(session({
	keys: secret.cookieKeys,
	signed: true,
	maxAge: 9999999000000
}));

app.use(bodyParser.json());

function updateDao(req) {
	if (req.session.phonenumber && req.session.subscriptionId) {
		return dao.addPhoneToSubId(req.session.phonenumber, req.session.subscriptionId)
		.catch(function (error) {
			// todo proper error handle
			console.error(error);
		})
		.finally(function () {
			dao.recordLogin(req.session.phonenumber, req.ip)
		})
	}
}

// security middleware: user must be logged in.
function requireSessionPhonenumber(req, res, next) {
	if (!req.session.phonenumber) {
		res.status(401).send();
	} else {
		next();
	}
}


app.all('/api/messages*', requireSessionPhonenumber);
app.all('/api/conversations*', requireSessionPhonenumber);
app.all('/api/me*', requireSessionPhonenumber);

app.post('/api/me/nickname', function (req, res) {
	dao.updateNickname(req.session.phonenumber, req.body.nickname)
	.then(function (response) {
		res.status(200).json(response);
	})
})

app.get('/api/me/nickname', function (req, res) {
	dao.getNickname(req.session.phonenumber)
	.then(function (response) {
		res.status(200).json(response);
	})
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
	message.from = req.session.phonenumber;
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
	dao.getMessages(req.session.phonenumber, group)
	.pipe(res);
});

app.get('/api/conversations', function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	dao.getConversations(req.session.phonenumber)
	.pipe(res);
});

app.delete('/api/messages/:id', function (req, res) {
	const id = req.params.id;
	dao.delete(req.session.phonenumber, id)
	.then(function (result) {
		return res.status(204).send();
	})
	.catch(function (error) {
		return res.status(500).json(error);
	})
});

app.delete('/api/messages', function (req, res) {
	dao.deleteAllMessages(req.session.phonenumber)
	.then(function (response) {
		res.status(204).send();
	})
});

app.post('/api/registration/logout', function (req, res) {
	req.session = null;
	res.status(200).json('Logged out')
});

app.post('/api/registration/subscription', function (req, res) {
	if (req.body.subscriptionId) {
		req.session.subscriptionId = req.body.subscriptionId;
		updateDao(req);
		// todo check status
		// .then(function () {
		res.status(200).json('subscribed');
		// })
		// .catch(function (error) {
		//   res.status(500).json(error);
		// })
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
				req.session.phonenumber = ph;
				req.session.phonenumberUnauthed = null;
				return updateDao(req)
			} else {
				console.log(code + " didn't match any code " + realCodes + " for " + ph);
			}
		})
		.then(function () {
			if (req.session.phonenumber) {
				res.status(200).json(req.session.phonenumber)
			} else {
				res.status(401).json('invalid code')
			}
		})
	} else {
		res.status(401).json('not logged in')
	}
});

app.get('/api/registration/phone', function (req, res) {
	if (req.session.phonenumber) {
		res.status(200).json(req.session.phonenumber)
	} else {
		res.status(200).json('')
	}
});

app.use(express.static('client'));
