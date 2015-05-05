var _ = require('lodash')
var phoneToSub = {};
var msgs = {};
var notify = require('./notify')


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

exports.sendBro = function (from, to, text) {
	if (!msgs[to]) msgs[to] = [];
	msgs[to].unshift({
		from: from,
		text: text,
		date: new Date
	})
	msgs.length = 100
	return notify(to)
}

var superb = require('superb');

function defaultMessage() {
	return {
			from: 'YoBro',
			to: 'You',
			date: new Date(),
			text: 'Welcome to YoBro! The fastest and easiest way to perform bro-to-bro messaging! '
			+ _.capitalize(superb()) + '!'
	}
} 

exports.getBros = function (ph) {
	if (msgs[ph])
		return msgs[ph]
	else {
		return [defaultMessage()]
	}
}

exports.deleteAllBros = function (ph) {
	if (msgs[ph]) {
		return msgs[ph] = [defaultMessage()];
	} else {
		return [defaultMessage()];
	}	 
}
