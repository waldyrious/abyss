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
	msgs.length = 10
	return notify(to)
}

exports.getBros = function (ph) {
	if (msgs[ph])
		return msgs[ph]
	else
		return []
}

exports.deleteAllBros = function (ph) {
	if (msgs[ph])
		return msgs[ph] = []
	else
		return []
}
