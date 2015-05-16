'use strict';
var _ = require('lodash');

function Phone(raw) {
	if (!(this instanceof Phone)) {
		return new Phone(raw);
	}

	if (!(_.isString(raw))) {
		throw new TypeError('must be string');
	}

	this.raw = raw;
}

Phone.prototype.strip = function () {
	return this.raw.replace(/\D/g, '');
};

Phone.prototype.isE164 = function () {
	return /^\+\d{10,15}$/.test(this.raw);
};

Phone.prototype.toE164 = function () {
	var stripped = this.strip();
	if (stripped.length === 10) {
		return '+1' + stripped;
	}
	else {
		return '+' + stripped;
	}
};

Phone.prototype.format = function (template) {
	var stripped = this.strip();
	if (stripped.length === 11 && this.isE164() && stripped[0] === '1') {
		stripped = stripped.substring(1);
	}
	var formatted = '';
	var numberPos = 0;
	var templatePos = 0;
	for (templatePos; templatePos < template.length; templatePos++) {
		var templateCharacter = template[templatePos];
		if (templateCharacter === '9') {
			formatted += stripped[numberPos];
			numberPos++;
		}
		else {
			formatted += templateCharacter
		}
	}
	return formatted;
};

Phone.prototype.toString = function () {
	return this.toE164();
};

module.exports = Phone;
