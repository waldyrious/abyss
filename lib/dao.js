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

exports.sendMessage = function (message) {

	message.to = _.uniq(message.to);

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

var stream = require('stream');




const getMessages = exports.getMessages = function (ph) {
	console.time('get');
	var first = true;
	var stringifier = new stream.Transform();
	stringifier._writableState.objectMode = true;
	stringifier._transform = function (data, encoding, done) {
		if (first) {
			first = false;
			this.push('[');
		} else {
			this.push('\n,')
		}
		this.push(JSON.stringify(data));
		done();
	};

	stringifier._flush = function (done) {
		if (first) {
			this.push('[');
		}
		this.push(']');
		console.timeEnd('get');
		done();
	};

	return r.table('messages')
	.filter(r.not(r.row('deletedBy').contains(ph)).and(r.row('to').contains(ph).or(r.row('from').eq(ph))))
	.orderBy(r.desc('date'))
	.map(function (item) {
		return item.merge({'participants': item('to').append(item('from')).distinct().difference([ph])});
	})
	.group('participants')
	.ungroup()
	.orderBy(r.desc('reduction'))
	.toStream()
	.pipe(stringifier)
};

var lax = {'returnChanges': false};
//var lax = {'returnChanges': false, 'durability': 'soft'};

// Slow
//function cleanDeletedByAll() {
//	console.time('cleanDeletedByAll');
//	return r.table('messages')
//	.filter(r.js('(function (row) { return row.deletedBy.length == row.to.length; })'))
//	.delete(lax)
//	.run()
//	.tap(function () {
//		console.timeEnd('cleanDeletedByAll');
//	})
//}

// Faster
//function cleanDeletedByAll() {
//	console.time('cleanDeletedByAll');
//	r.table('messages')
//	.filter(function (message) {
//		return r.eq(message('deletedBy').count(), message('to').count())
//	})
//	.delete(lax)
//	.run()
//	.tap(function () {
//		console.timeEnd('cleanDeletedByAll');
//	})
//}

// Fastest
function cleanDeletedByAll() {
	console.time('cleanDeletedByAll');
	r.table('messages')
	.filter(function (message) {
		return message('deletedBy').contains(message('to'))
	})
	.delete(lax)
	.run()
	.tap(function () {
		console.timeEnd('cleanDeletedByAll');
	})
}



exports.delete = function (ph, id) {
	console.time('delete ' + ph + ' ' + id);
	return r.table('messages')
	.filter(r.row('id').eq(id).and(r.row('from').eq(ph).or(r.row('to').eq([ph]))))
	.delete(lax)
	.run()
	.then(function (result) {
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

exports.deleteAllMessages = function (ph) {
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
