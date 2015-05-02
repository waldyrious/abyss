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
	msgs[to].push({
		from: from,
		text: text,
		date: new Date
	})
	return notify(to)
}

exports.getBros = function (ph) {
	return msgs[ph];
	// return [{
	// 	from: 'brodette',
	// 	to: 'brah',
	// 	text: 'beer bro!'
	// }]
}
