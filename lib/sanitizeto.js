const _ = require('lodash');
const Phone = require('../model/phone.js');

function arrayify(item) {
	if (!item) {
		return [];
	}

	if (!_.isArray(item)) {
		return [item];
	}

	return item;
}

function sanitizeto(to) {
	to = arrayify(to);

	to = to.map(function (item) {
		var item = new Phone(item).strip();

		if (item.length != 10) {
			return null;
		} else {
			return item;
		}
	});

	to = _.filter(to, function (item) {
		return item !== undefined && item !== null;
	})

	return to;
}

module.exports = sanitizeto;
