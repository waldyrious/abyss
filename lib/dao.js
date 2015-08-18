'use strict';

const Promise = require('bluebird');
const path = require('path');
const _ = require('lodash');

const notify = require('./notify');
const superb = require('superb');
const Message = require('../model/message');
const r = require('./db');
const secret = require('../secret/secret.json');
const fs = Promise.promisifyAll(require('fs'));
const tmp = Promise.promisifyAll(require('tmp'));
const SlowStream = require('slow-stream');
const cuid = require('cuid');
const exec = require('child_process').exec;

function createUser(ph) {
	return r.table('users').insert({
		id: ph,
		subids: [],
		login: {},
		'verification_codes': [],
		'nickname': null
	});
}

function getUser (id) {
	return r.table('users')
	.get(id)
	.without('verification_codes');
}
exports.getUser = getUser;

function getUserAndClearVerificationCodes (id) {
	return r.table('users')
	.get(id)
	.update({'verification_codes': []})
	.without('verification_codes')
	.then(function () {
		return getUser(id);
	})
}
exports.getUserAndClearVerificationCodes = getUserAndClearVerificationCodes;

exports.addFileStreamed = function (fileInfo, inputStream) {

	const to = fileInfo.to;
	const from = fileInfo.from;

	var fileId = cuid();

	try {
		fs.mkdirSync(path.join(secret.blobs, String(from)));
	} catch (e) {}

	return Promise.resolve(path.join(secret.blobs, String(from), fileId))
	//  tmp.tmpNameAsync({
	// 	template: path.join(secret.blobs, String(from)) + '/XXXXXX'
	// })
	.then(function (savedFilePath) {
		console.log(savedFilePath)
		return new Promise(function (resolve, reject) {
			const outputStream = fs.createWriteStream(savedFilePath);
			inputStream.on('end', function () {
				resolve(savedFilePath);
			})
			inputStream.on('error', function (err) {
				reject(err);
			})

			if (secret.slowstreams) {
				inputStream
				.pipe(new SlowStream({ maxWriteInterval:  20}))
				.pipe(outputStream);
			} else {
				inputStream
				.pipe(outputStream);
			}
		})
	})
	.then(function (savedFilePath) {
		delete fileInfo.to;
		delete fileInfo.from;
		fileInfo.id = fileId;

		// auto rotate with imagemagick
		// convert filename -auto-orient newfilename
		return new Promise (function (resolve, reject) {
			if (fileInfo.type.indexOf('image/') === 0) {
				console.log('detected image, attempting to rotate');
				var child = exec('convert ' + savedFilePath + ' -auto-orient ' + savedFilePath,
				function (error, stdout, stderr) {
					if (stdout)
						console.log('stdout: ' + stdout);
					if (stderr)
						console.log('stderr: ' + stderr);
					if (error !== null) {
						reject(error);
					} else {
						resolve(savedFilePath);
					}
				})
			} else {
				resolve(savedFilePath);
			}
		})
		.catch(function (err) {
			// Ignore rotate files, e.g. from invalid image files.
			console.error(err);
		})
		.then(function () {
			return r.table('messages')
			.insert({
				from: from,
				to: to,
				date: new Date(),
				file: fileInfo
			})
			.run()
			.then(function () {
				if (fileInfo.to && _.isArray(fileInfo.to)) {
					fileInfo.to.forEach(function (item) {
						notify(item);
					})
				}
			})
		})
	})
}

exports.getFileMessage = function (ph, id) {
	return r.table('messages')
	.filter(r.row('id').eq(id).and(r.row('to').contains(ph).or(r.row('from').eq(ph))))
	.then(function (message) {
		return message[0];
	})
}

// var fs = require('fs');
// var stream = require('stream');
// var util = require('util');
// var Transform = stream.Transform;
//
// function StreamFile(options) {
// 	if (!(this instanceof StreamFile)) {
// 	return new StreamFile(options);
// 	}
// 	options.objectMode = true;
// 	Transform.call(this, options);
// }
// util.inherits(StreamFile, Transform);
//
// StreamFile.prototype._transform = function (chunk, enc, done) {
// 	if (chunk.file && chunk.file.data) {
// 		this.push(chunk.file.data);
// 	}
// 	done();
// };
//
// exports.getFileStreamed = function (ph, id) {
// 	return r.table('messages')
// 	.filter(r.row('id').eq(id).and(r.row('to').contains(ph).or(r.row('from').eq(ph))))
// 	.toStream()
// 	.pipe(new StreamFile({objectMode:true}))
// }
//
// exports.getFile = function (ph, id) {
// 	return r.table('messages')
// 	.filter(r.row('id').eq(id).and(r.row('to').contains(ph).or(r.row('from').eq(ph))))
// 	.then(function (result) {
// 		return result[0].file;
// 	})
// }

exports.addSubscriptionToUser = function (ph, id) {
	// associate subscription id with phone ph.
	return createUser(ph)
	.then(function (response) {
		return r.table('users')
		.get(ph)
		.update({
			subids: r.row('subids').setInsert(id)
			// .limit(20) // limit number of subscribed devices
		})
	});
};

exports.removeSubscriptionFromUser = function (ph, id) {
	// associate subscription id with phone ph.
	return r.table('users')
	.get(ph)
	.update({
		'subids': r.row('subids').setDifference([id])
	})
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

exports.updateNickname = function (ph, nickname) {
	if (nickname === null) {
		nickname = '';
	}
	nickname = nickname.substring(0, 20);

	return r.table('users')
	.get(ph)
	.update({
		'nickname': nickname
	})
	.run()
	.then(function () {
		return getUser(ph);
	})
}

exports.addVerificationCode = function (ph, code) {
	// associate subscription id with phone ph.
	return createUser(ph)
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


const getMessages = exports.getMessages = function (ph, group, page, per_page) {
	console.time('get messages, group');
	console.log(group);

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
		this.push(JSON.stringify(data, null, 2));
		done();
	};

	stringifier._flush = function (done) {
		if (first) {
			this.push('[');
		}
		this.push(']');
		console.time('get messages, group');
		done();
	};

	var query = r.table('messages')
	.filter(r.row('to').contains(ph).or(r.row('from').eq(ph)))
	.map(function (item) {
		return item.merge({'participants': item('to').append(item('from')).distinct().difference([ph])});
	})

	if (group) {
		query = query.filter(r.row('participants').eq(group));
	}
	//return	query.group('participants')
	//.ungroup()
	query = query.orderBy(r.desc('date'));

	if (_.isFinite(page) && _.isFinite(per_page)) {
		query = query.slice( page*per_page, page*per_page+per_page)
	}

	// .without({file: 'data'})
	return query.toStream()
	.pipe(stringifier)
};

/*

r.table('messages').filter(r.row('to').contains('5558675309').or(r.row('from').eq('5558675309')))
  .map(function (message) {
    return r.table('users').get(message('from')).default({})
      //.map( function (user) {
      //  return user.merge({"fromNickname": user('nickname').coerceTo('string')})
      //})
    .merge(message)
  })

  */


/*

r.table('messages').filter(r.row('to').contains('5558675309').or(r.row('from').eq('5558675309')))
  .map(function (message) {
    return r.table('users').get(message('from')).default({}).map(function (user) {
        return user.merge({'fromnickname': user('nickname')})
	  })
    .merge(message)
  })

  */


/*

r.table('messages').filter(r.row('to').contains('5558675309').or(r.row('from').eq('5558675309')))
  .map(function (message) {
    return r.table('users').get(message('from')).default({}).merge(message)
  })

  */


/*

r.table('messages').concatMap(function (message) {
  return r.table('users').getAll(message('to'))
  .map(function(user) {
		return { left: message, right: user }
	})
})

*/

/*

r.table('messages')
   .eqJoin(r.row('from'), r.table('users'))
  .zip().withFields('nickname', 'id')

	.filter(r.row('to').contains('5558675309').or(r.row('from').eq('5558675309')))
	.orderBy(r.desc('date'))
	.map(function (item) {
		return item.merge({'participants': item('to').append(item('from')).distinct().difference(['5558675309'])});
	})
	.group('participants')
	.ungroup()
	.orderBy(r.desc('reduction'))
	.without('reduction')

	*/


/*

r.table('messages')
	.filter(r.row('to').contains('5558675309').or(r.row('from').eq('5558675309')))
	.orderBy(r.desc('date'))
	.map(function (item) {
		return item.merge({'participants': item('to').append(item('from')).distinct().difference(['5558675309'])});
	})
	.group('participants')
	.ungroup()
	.orderBy(r.desc('reduction'))
	.without('reduction')

	*/

	/*

	r.table('messages')
.filter(r.row('to').contains('5558675309').or(r.row('from').eq('5558675309')))
.orderBy(r.desc('date'))
.map(function (item) {
	return item.merge({'participants': item('to').append(item('from')).distinct().difference(['5558675309'])});
})
.group('participants')
.ungroup()
.orderBy(r.desc('reduction'))
.without('reduction')
.concatMap(function (item) {
  return item('group').map(function (to) {
	return {
	  to: to,
	  participants: item('group')
	}
  })
})



*/

/*

r.table('messages')
.filter(r.row('to').contains('5558675309').or(r.row('from').eq('5558675309')))
.orderBy(r.desc('date'))
.map(function (item) {
	return item.merge({'participants': item('to').append(item('from')).distinct().difference(['5558675309'])});
})
.group('participants')
.ungroup()
.orderBy(r.desc('reduction'))
.without('reduction')
.concatMap(function (item) {
  return item('group').map(function (to) {
	return {
	  group: item('group'),
	  nicknames: r.table('users').get(to)
	}
  })
})

*/

/*

r.table('messages')
.filter(r.row('to').contains('5558675309').or(r.row('from').eq('5558675309')))
.orderBy(r.desc('date'))
.map(function (item) {
	return item.merge({'participants': item('to').append(item('from')).distinct().difference(['5558675309'])});
})
.group('participants')
.ungroup()
.orderBy(r.desc('reduction'))
.without('reduction')
.map(function (item) {
  return {
	  group: item('group'),
	  nicknames: item('group').map(function (to) {
		return {
		  to: r.table('users').get(to).default({}).pluck('nickname')
		}
	 })
  }
})

*/

/*

r.table('messages')
.filter(r.row('to').contains('5558675309').or(r.row('from').eq('5558675309')))
.orderBy(r.desc('date'))
.map(function (item) {
	return item.merge({'participants': item('to').append(item('from')).distinct().difference(['5558675309'])});
})
.group('participants')
.ungroup()
.orderBy(r.desc('reduction'))
.without('reduction')
.map(function (item) {
  return {
	  group: item('group'),
	  nicknames: item('group').map(function (to) {
		return r.table('users').get(to).default({}).pluck('nickname')
	 })
  }
})

*/

/*

r.table('messages')
.filter(r.row('to').contains('5558675309').or(r.row('from').eq('5558675309')))
.orderBy(r.desc('date'))
.map(function (item) {
	return item.merge({'participants': item('to').append(item('from')).distinct().difference(['5558675309'])});
})
.group('participants')
.ungroup()
.orderBy(r.desc('reduction'))
.without('reduction')
.map(function (item) {
  return {
	  group: item('group'),
	  nicknames: item('group').map(function (to) {
		return r.table('users').get(to).default({}).pluck('nickname')
	 })
  }
})

*/

const getConversations = exports.getConversations = function (ph) {
	return r.table('messages')
	.filter(r.row('to').contains(ph).or(r.row('from').eq(ph)))
	.orderBy(r.desc('date'))
	.map(function (item) {
		return item.merge({'participants': item('to').append(item('from')).distinct().difference([ph])});
	})
	.group('participants')
	.ungroup()
	.orderBy(r.desc('reduction'))
	.without('reduction')
	.map(function (item) {
		return {
			group: item('group'),
			details: item('group').map(function (to) {
				return r.table('users').get(to).default({}).pluck('nickname')
			})
		}
	})
}

// const oldGetConversations = function (ph) {
// const getConversations = exports.getConversations = function (ph) {
//
// 	console.time('get');
//
// 	return r.table('messages')
// 	.filter(r.row('to').contains(ph).or(r.row('from').eq(ph)))
// 	.orderBy(r.desc('date'))
// 	.map(function (item) {
// 		return item.merge({'participants': item('to').append(item('from')).distinct().difference([ph])});
// 	})
// 	.group('participants')
// 	.ungroup()
// 	.orderBy(r.desc('reduction'))
// 	.without('reduction')
// 	.then(function (response) {
//
// 		var retval = {};
// 		retval.groupings = response;
// 		retval.nicknames = {};
//
// 		return Promise.map(response, function (response) {
// 			return Promise.map(response.group, function (item) {
// 				if (retval.nicknames[item] === undefined) {
// 					return getNickname(item).then(function (nickname) {
// 						retval.nicknames[item] = nickname;
// 					})
// 				}
// 			})
// 		})
// 		// .delay(500)
// 		.then(function () {
// 			return retval;
// 		})
// 	})
// };

function getNickname (ph) {
	return r.table('users')
	.get(ph)
	.then(function (user) {
		if (user && user['nickname']) {
			return user['nickname'];
		} else {
			return null;
		}
	});
}

function cleanAssociatedFiles(changeSet) {
	if (changeSet.changes) {
		Promise.map(changeSet.changes, function (change) {
			if (change.old_val.file) {
				const thepath = path.join(secret.blobs, String(change.old_val.from), change.old_val.file.id);
				console.log('DELETING ' + thepath);
				return fs.unlinkAsync(thepath);
			}
		})
	}
}

function cleanDeletedByAll() {
	console.time('cleanDeletedByAll');
	r.table('messages')
	.filter(function (message) {
		return message('to').isEmpty();
	})
	.delete({'returnChanges': true})
	.run()
	.tap(cleanAssociatedFiles)
	.tap(function () {
		console.timeEnd('cleanDeletedByAll');
	})
}

exports.delete = function (ph, id) {
	console.time('delete ' + ph + ' ' + id);
	return r.table('messages')
	.filter(r.row('id').eq(id).and(r.row('from').eq(ph).or(r.row('to').eq([ph]))))
	.delete({'returnChanges': true})
	.run()
	.tap(cleanAssociatedFiles)
	.then(function (changeSet) {
		if (changeSet.deleted === 1) {
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
	.delete({'returnChanges': true})
	.run()
	.tap(cleanAssociatedFiles)
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
