'use strict';
var Promise = require('bluebird');
var dao = require('./dao');

var Message = require('../model/message');
var n = 85;

var arr = [];

console.log('blasting ' + n + ' messages');

function blast() {
	var message = new Message();
	message.to.push('5558675309', '1234567890');
	message.from = '5558675309';
	message.text = 'blast';
	return message;
}

for (var i = 0; i < n; i++) {
	arr.push(blast());
}

Promise.map(arr, function (message) {
	return dao.sendBro(message);
}, {concurrency: n})
.then(process.exit)
