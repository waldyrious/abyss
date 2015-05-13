'use strict';

const _ = require('lodash');
const r = require('rethinkdb');
const dbconfig = require('../secret/db.json');
var connection = r.connect(dbconfig)
.catch(function (error) {
	console.error(error);
	process.exit(1);
})

const notify = require('./notify');
const superb = require('superb');
const Message = require('../model/message');


exports.addPhoneToSubId = function (ph, id) {
	// associate subscription id with phone ph.
	return connection.then(function (conn) {
		return r.table('subscriptions').insert({
			id: ph,
			subids: []
		})
		.run(conn)
		.then(function (response) {
			return r.table('subscriptions')
			.get(ph)
			.update({
				subids: r.row('subids').setInsert(id)
			})
			.run(conn)
		});
	})
}

exports.getSubIds = function (ph) {
	return connection.then(function (conn) {

		return r.table('subscriptions')
		.get(ph)
		.run(conn)
	})
}

exports.addVerificationCode = function (ph, code) {
	// associate subscription id with phone ph.
	return connection.then(function (conn) {
		return r.table('verifications').insert({
			id: ph,
			codes: []
		})
		.run(conn)
		.then(function (response) {
			return r.table('verifications')
			.get(ph)
			.update({
				codes: r.row('codes').limit(7).setInsert(code),
				date: r.now().toEpochTime()
			})
			.run(conn)
		});
	})
}

function clearCodes() {
	return connection.then(function (conn) {
		return r.table('verifications')
		.filter(r.row('date').lt(r.now().toEpochTime().sub(300)))
		.delete()
		.run(conn)
	})
	.then(function (result) {
		if (result.deleted > 0) {
			console.log('Clearing codes: ' + JSON.stringify(result));
		}
	})
}

setInterval(clearCodes, 10000);

exports.getVerificationCodes = function (ph) {
	return connection.then(function (conn ) {

		return r.table('verifications')
		.get(ph)
		.run(conn)
	})
}

exports.sendBro = function (message) {
	return connection.then(function (conn ) {

		return r.table('messages').insert(message).run(conn)
		.then(function (result) {
			if (message.to && _.isArray(message.to)) {
				message.to.forEach(function (item) {
					notify(item);
				})
			}
		})
	})
}

function defaultMessage(to) {
	const msg = new Message();

	msg.from = 'YoBro';
	msg.to.push(to);
	msg.text =  'Welcome to YoBro! The fastest and easiest way to perform bro-to-bro messaging! '
	+ _.capitalize(superb()) + '!'

	return msg;
} 

const getBros = exports.getBros = function (ph) {
	return connection.then(function (conn ) {

		return r.table('messages')
		.filter(r.row('to').contains(ph).or(r.row('from').eq(ph)))
		.orderBy(r.desc('date'))
		.run(conn)
	})
}

function cleanDeletedByAll() {
	return connection.then(function (conn ) {
		return r.table('messages')
		.filter( r.js('(function (row) { return row.deletedBy.length == row.to.length; })'))
		.delete()
		.run(conn);
	})
}

exports.delete = function (ph, id) {
	return connection.then(function (conn ) {
		return r.table('messages')
		.filter(r.row('id').eq(id).and(r.row('from').eq(ph)))
		.delete()
		.run(conn)
		.then(function () {
			return r.table('messages')
			.filter(r.row('to').contains(ph).and(r.row('id').eq(id)))
			.update({'deletedBy': r.row('deletedBy').setInsert(ph)})
			.run(conn)
		})
		.then(cleanDeletedByAll)
	})
}

exports.deleteAllBros = function (ph) {
	return connection.then(function (conn ) {
		return r.table('messages')
		// delete all i have sent
		.filter(r.row('from').eq(ph))
		.delete()
		.run(conn)
		.then(function () {
			return r.table('messages')
			.filter(r.row('to').contains(ph))
			.update({'deletedBy': r.row('deletedBy').setInsert(ph)})
			.run(conn)
		})
		.then(cleanDeletedByAll)
	});
}
