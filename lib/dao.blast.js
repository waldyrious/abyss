'use strict';
var Promise = require('bluebird');
var dao = require('./dao');
var moment = require('moment');
var casual = require('casual').en_US;

var Message = require('../model/message');
var n = 50;

var arr = [];

console.log('blasting ' + n + ' messages');

function blast() {
	var message = new Message();
	message.to.push('5558675309');

	if (Math.random() > 0.5) {
		message.from = '5558675309';
	} else {
		message.from = '1234567890';
	}

	if (Math.random() > 0.8) {
		message.date = moment(message.date).subtract(Math.random()*10, 'days').toDate();
	}

	message.date = moment(message.date).subtract(Math.random()*10, 'hours').toDate();

	if (Math.random() < 0.9) {
		message.to.push('1234567890')
	} else {
		message.to.push('555'+casual.array_of_digits(7).join(''));
	}
		message.text = casual.sentence;
	return message;
}

for (var i = 0; i < n; i++) {
	arr.push(blast());
}

Promise.map(arr, function (message) {
	return dao.sendBro(message);
}, {concurrency: n})
.then(process.exit);
