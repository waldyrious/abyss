'use strict';

const _ = require('lodash');

const notify = require('./notify');
const superb = require('superb');
const Message = require('../model/message');
const r = require('./db');


exports.addPhoneToSubId = function (ph, id) {
	// associate subscription id with phone ph.
	return r.table('subscriptions').insert({
		id: ph,
		subids: []
	})
	.run()
	.then(function (response) {
		return r.table('subscriptions')
		.get(ph)
		.update({
			subids: r.row('subids').prepend(id)
		})
		.run()
	});
};

exports.getSubIds = function (ph) {
	return r.table('subscriptions')
	.get(ph)
	.run()
};

exports.addVerificationCode = function (ph, code) {
	// associate subscription id with phone ph.
	return r.table('verifications').insert({
		id: ph,
		codes: []
	})
	.run()
	.then(function (response) {
		return r.table('verifications')
		.get(ph)
		.update({
			codes: r.row('codes').limit(7).prepend(code),
			date: r.now().toEpochTime()
		})
		.run()
	});
};

function clearCodes() {
	return r.table('verifications')
	.filter(r.row('date').lt(r.now().toEpochTime().sub(300)))
	.delete()
	.run()
	.then(function (result) {
		if (result.deleted > 0) {
			console.log('Clearing codes: ' + JSON.stringify(result));
		}
	})
}

setInterval(clearCodes, 10000);

exports.getVerificationCodes = function (ph) {
	return r.table('verifications')
	.get(ph)
	.run()
};

exports.sendBro = function (message) {
	return r.table('messages')
	.insert(message)
	.run()
	.then(function (result) {
		if (message.to && _.isArray(message.to)) {
			message.to.forEach(function (item) {
				notify(item);
			})
		}
	})
};

function defaultMessage(to) {
	const msg = new Message();

	msg.from = 'YoBro';
	msg.to.push(to);
	msg.text = 'Welcome to YoBro! The fastest and easiest way to perform bro-to-bro messaging! '
	+ _.capitalize(superb()) + '!';

	return msg;
}

const getBros = exports.getBros = function (ph) {
	return r.table('messages')
	.filter(r.row('to').contains(ph).or(r.row('from').eq(ph)))
	.orderBy(r.desc('date'))
	.run()
};

var lax = {'returnChanges': false};
var lax2 = {'returnChanges': false, 'durability': 'soft'};

function cleanDeletedByAll() {
	return r.table('messages')
	.filter(r.js('(function (row) { return row.deletedBy.length == row.to.length; })'))
	.delete(lax)
	.run();
}

exports.delete = function (ph, id) {
	console.time('delete ' + ph + ' ' + id);
	return r.table('messages')
	.filter(r.row('id').eq(id).and(r.row('from').eq(ph).or(r.row('to').eq([ph]))))
	.delete(lax)
	.run()
	.then(function (result) {
		console.log(result)
		if (result.deleted === 1) {
			return;
		} else {
			return r.table('messages')
			.filter(r.row('to').contains(ph).and(r.row('id').eq(id)))
			.update({'deletedBy': r.row('deletedBy').setInsert(ph)})
			.run()
			.then(cleanDeletedByAll)
		}
	})
	.then(function () {
		console.timeEnd('delete ' + ph + ' ' + id);
	})
};

exports.deleteAllBros = function (ph) {
	console.time('deleteAll ' + ph);

	return r.table('messages')
		// delete all i have sent
	.filter(r.row('from').eq(ph))
	.delete(lax)
	.run()
	.then(function () {
		return r.table('messages')
		.filter(r.row('to').contains(ph))
		.update({'deletedBy': r.row('deletedBy').setInsert(ph)}, lax)
		.run()
	})
	.then(cleanDeletedByAll)
	.then(function () {
		console.timeEnd('deleteAll ' + ph);
	})
};

/*

 r.table('messages')
 .filter(r.row('to').contains('6123101942'))
 .forEach(function (message) {
 return r.branch(r.row('to').eq(['6123101942']),
 r.table('messages').get(message('id'))).delete(),
 r.table('messages').get(message('id')).update({'deletedBy': message('deletedBy').setInsert('6123101942')}
 )})


 */

/*

 r.table('messages')
 .filter(r.row('to').contains('6123101942'))
 .forEach(function (message) {
 return r.branch(message('to').eq(['6123101942']),
 message.delete(),
 message.update({'deletedBy': message('deletedBy').setInsert('6123101942')})
 )})

 */

/*

 r.table('messages')
 .forEach(function (message) {
 return r.branch(message('to').eq(['6123101942']),
 message.delete(),
 message.update({'deletedBy': message('deletedBy').setInsert('6123101942')})
 )})

 */

/*

 r.table('messages')
 .forEach(function (message) {
 return r.branch(message('to').eq(['6123101942']),
 r.table('messages').get(message('id')).delete(),
 r.table('messages').get(message('id')).update({'deletedBy': message('deletedBy').setInsert('6123101942')})
 )})

 */
