"use strict";

const Promise = require('bluebird');
const _ = require('lodash');
const fs = Promise.promisifyAll(require('fs'));
const phoneToSub = {};
const filename = './messages.json'
var msgs;
try {
	msgs = JSON.parse(fs.readFileSync(filename));
} catch (e) {
	console.log(e);
	msgs = [];
}
const notify = require('./notify');
const superb = require('superb');
const Message = require('../model/message');


function writeOut() {
	return fs.writeFileAsync(filename, JSON.stringify(msgs))
}

exports.addPhoneToSubId = function (ph, id) {
	if (!phoneToSub[ph]) {
		phoneToSub[ph] = [id]
		console.log(' addPhoneToSubId '+phoneToSub[ph])
		debugger
	} else if (phoneToSub[ph].indexOf(id) < 0) {
		phoneToSub[ph].push(id)
	}
}

exports.getSubIds = function (ph) {
	return phoneToSub[ph]
}

// exports.sendBro = function (from, to, text) {
// 	if (!msgs[to]) msgs[to] = [];
// 	msgs[to].unshift({
// 		from: from,
// 		text: text,
// 		date: new Date
// 	})
// 	msgs.length = 100
// 	return notify(to)
// }

exports.sendBro = function (message) {
	msgs.unshift(message)
	writeOut();
	return notify(message.to)
}


function defaultMessage(to) {

	const msg = new Message();

	msg.from = 'YoBro';
	msg.to = to;
	msg.text =  'Welcome to YoBro! The fastest and easiest way to perform bro-to-bro messaging! '
			+ _.capitalize(superb()) + '!'

	return msg;
} 

const getBros = exports.getBros = function (ph) {
	const retVal = _.filter(msgs, function (message) {
		return message.to === ph || message.from === ph || message.to.indexOf(ph) > -1
	})

	if (retVal.length === 0) {
		return [defaultMessage(ph)]
	} else {
		return retVal;
	}
}

exports.delete = function (ph, id) {
	msgs = _.filter(msgs, function (message) {
		if (message.id === id && (message.from === ph || message.to === ph) ) {
			return false;
		} else {
			return true;
		}
	});
	writeOut();
}

exports.deleteAllBros = function (ph) {
	msgs = _.filter(msgs, function (message) {
		if (message.from === ph) {
			return false;
		} else if (message.to === ph) {
			return false;
		}
	})
	writeOut();
	return getBros(ph);
}
