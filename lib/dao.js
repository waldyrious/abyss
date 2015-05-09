"use strict";

const _ = require('lodash');
const r = require('rethinkdb');
const dbconfig = require('../secret/db.json');
var conn;

r.connect(dbconfig)
.then(function (connection) {
  conn = connection;
})
.catch(function (error) {
	console.error(error);
	process.exit(1);
})

const notify = require('./notify');
const superb = require('superb');
const Message = require('../model/message');


exports.addPhoneToSubId = function (ph, id) {
	// associate subscription id with phone ph.
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
}

exports.getSubIds = function (ph) {
	return r.table('subscriptions')
	.get(ph)
	.run(conn)
}

exports.sendBro = function (message) {
	return r.table('messages').insert(message).run(conn)
	.then(function (result) {
		console.log(result)
		if (message.to && _.isArray(message.to)) {
			message.to.forEach(function (item) {
				notify(item);
			})
		}
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
	return r.table('messages')
	.filter(r.row('to').contains(ph).or(r.row('from').eq(ph)))
	.orderBy(r.desc('date'))
	.run(conn)
}

function cleanDeletedByAll() {
	return r.table('messages')
	.filter( r.js('(function (row) { return row.deletedBy.length == row.to.length; })'))
	.delete()
	.run(conn);
}

exports.delete = function (ph, id) {
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
}

exports.deleteAllBros = function (ph) {
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
}
