var _ = require('lodash')
var phoneToSub = {};

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
