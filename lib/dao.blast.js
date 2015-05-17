'use strict';

var dao = require('./dao');

var Message = require('../model/message');

function blast() {
	var message = new Message();

	message.to.push('5558675309');
	message.from = '5551112222';
	message.text = 'blast';
	return dao.sendBro(message);
}

var p = Promise.resolve(true);

var n = 2000;

for (var i = 0; i < n; i++) {
	p = p.then(blast)
}

p.then(process.exit)
