'use strict';

const dao = require('./dao');
const Promise = require('bluebird');
const request = Promise.promisify(require('request'));
const fs = require('fs');

var chromeNotifications;
var gcmapikey;

const secret = require('../secret/secret.json');

if (secret.gcmapikey) {
	console.log("👍 Sending Chrome notifications.");
	chromeNotifications = true;
	gcmapikey = secret.gcmapikey;
} else {
	console.log("NOT sending Chrome notifications.");
	chromeNotifications = false;
}

module.exports = function (phonenumber) {
	const ids = dao.getSubIds(phonenumber)
	.then(function (response) {
		if (chromeNotifications) {
			var ids = response.subids;

			// var idsplit = id.split('/');
			//
			console.log('Notifying ' + phonenumber + ' at ' + ids);
			// console.log(idsplit[idsplit.length - 1])
			const options = {
				// uri: 'https://android.googleapis.com/gcm/send/',
				url: 'https://android.googleapis.com/gcm/send',
				// uri: id,
				method: 'POST',
				headers: {
					"Authorization": "key=" + gcmapikey,
					"Content-Type": "application/json"
				},
				json: true,
				body: {
					// "registration_ids": [idsplit[idsplit.length - 1]]
					"registration_ids": ids.map(function (id) {
						if (id.startsWith('https://android.googleapis.com/gcm/send')) {
							var idsplit = id.split('/');
							return idsplit[idsplit.length - 1];
						}
					})
				}
			};

			return request(options)
			.then(function (response) {
				console.log(response);
			})
		}
	})
	// })
};
