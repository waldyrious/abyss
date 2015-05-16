'use strict';

const dao = require('./dao');
const Promise = require('bluebird');
const request = Promise.promisify(require('request'));
const fs = require('fs');

var chromeNotifications;
var gcmapikey;

const secret = require('../secret/secret.json');

if (secret.gcmapikey) {
	console.log("Google Cloud Messaging API key found!");
	chromeNotifications = true;
	gcmapikey = secret.gcmapikey;
} else {
	console.log("Google Cloud Messaging API NOT found, disabling Chrome notifications");
	chromeNotifications = false;
}

//const gcmapikey = fs.readFileSync('secret/gcmapikey', {encoding:'utf8'})

module.exports = function (phonenumber) {
	const ids = dao.getSubIds(phonenumber)
	.then(function (response) {
		if (chromeNotifications()) {
			var ids = response.subids;

			console.log('Notifying ' + phonenumber + ' at ' + ids);
			const options = {
				uri: 'https://android.googleapis.com/gcm/send',
				method: 'POST',
				headers: {
					"Authorization": "key=" + gcmapikey,
					"Content-Type": "application/json"
				},
				json: true,
				body: {
					"registration_ids": ids
				}
			};

			return request(options);
		}
	})
};
