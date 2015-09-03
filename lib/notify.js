'use strict';

const Promise = require('bluebird');
const dao = require('./dao');
const request = require('request-promise');
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

module.exports = Promise.coroutine(function* (id) {
	if (chromeNotifications) {
		const ids = (yield dao.getSubIds(id)).subids;

		if (ids && ids.length > 0) {
			console.log('Notifying ' + id + ' at ' + ids);
			const options = {
				url: 'https://android.googleapis.com/gcm/send',
				method: 'POST',
				headers: {
					"Authorization": "key=" + gcmapikey,
					"Content-Type": "application/json"
				},
				json: true,
				body: {
					"registration_ids": ids.map(function (id) {
						if (id.startsWith('https://android.googleapis.com/gcm/send')) {
							var idsplit = id.split('/');
							return idsplit[idsplit.length - 1];
						}
					})
				}
			};

			let response = yield request(options);
			console.log(response);
		}
	}
});
