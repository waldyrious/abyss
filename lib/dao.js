'use strict';

const _ = require('lodash');

const notify = require('./notify');
const superb = require('superb');
const Message = require('../model/message');
const r = require('./db');
const secret = require('../secret/secret.json');


exports.addPhoneToSubId = function (ph, id) {
	// associate subscription id with phone ph.
	return r.table('users').insert({
		id: ph,
		subids: []
	})
	.run()
	.then(function (response) {
		return r.table('users')
		.get(ph)
		.update({
			subids: r.row('subids').setInsert(id)
			//.limit(10) // limit number of subscribed devices?
		})
		.run()
	});
};

exports.getSubIds = function (ph) {
	return r.table('users')
	.get(ph)
	.pluck('subids')
	.run()
};


exports.recordLogin = function (ph, ip) {
	return r.table('users')
	.get(ph)
	.update({
		'login': {
			date: new Date(),
			ip: ip
		}
	})
	.run()
};

exports.getNickname = function (ph) {
	debugger
	return r.table('users')
	.get(ph)
	.run()
}

exports.updateNickname = function (ph, nickname) {
	nickname = nickname.substring(0, 20);

	return r.table('users')
	.get(ph)
	.update({
		'nickname': nickname
	})
	.run()
	.then(function () {
		return {
			nickname: nickname
		};
	})
}

exports.addVerificationCode = function (ph, code) {
	// associate subscription id with phone ph.
	return r.table('users').insert({
		id: ph,
		'verification_codes': []
	})
	.run()
	.then(function (response) {
		return r.table('users')
		.get(ph)
		.update({
			'verification_codes': r.row('verification_codes').limit(2).prepend(code),
			date: r.now().toEpochTime()
		})
		.run()
	});
};

function clearCodes() {
	var query = r.table('users')
	.filter(r.row('date').lt(r.now().toEpochTime().sub(300)))
	.update({
		'verification_codes': []
	})
	.run()
	.then(function (result) {
		if (result.deleted > 0) {
			console.log('Clearing codes: ' + JSON.stringify(result));
		}
	})
}

setInterval(clearCodes, 10000);

exports.getVerificationCodes = function (ph) {
	return r.table('users')
	.get(ph)
	.pluck('verification_codes')
	.run()
	.then(function (codes) {
		return codes['verification_codes'];
	})
};

exports.sendMessage = function (message) {

	message.to = _.uniq(message.to);

	if (_.isEqual(message.to, [])) {
		message.to = [message.from];
	}

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


const getMessages = exports.getMessages = function (ph, group) {
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

	var query = r.table('messages')
	.filter(r.not(r.row('deletedBy').contains(ph)).and(r.row('to').contains(ph).or(r.row('from').eq(ph))))
	.map(function (item) {
		return item.merge({'participants': item('to').append(item('from')).distinct().difference([ph])});
	})

	if (group) {
		query = query.filter(r.row('participants').eq(group));
	}
	//return	query.group('participants')
	//.ungroup()
	return query.orderBy(r.desc('date'))
	.toStream()
	.pipe(stringifier)
};

const getConversations = exports.getConversations = function (ph) {
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
	.without('reduction')
	.toStream()
	.pipe(stringifier)
};

var lax = {'returnChanges': false};

function cleanDeletedByAll() {
	console.time('cleanDeletedByAll');
	r.table('messages')
	.filter(function (message) {
		return message('to').isEmpty();
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
			.update({'to': r.row('to').setDifference([ph])})
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
		.update({'to': r.row('to').setDifference([ph])})
		.run()
	})
	.then(cleanDeletedByAll)
	.then(function () {
		console.timeEnd('deleteAll ' + ph);
	})
};
