'use strict';

const dao = require('./dao')
const Promise = require('bluebird')
const request = Promise.promisify(require('request'))
const fs = require('fs')

const gcmapikey = fs.readFileSync('secret/gcmapikey', {encoding:'utf8'})

module.exports = function (phonenumber) {
  const ids = dao.getSubIds(phonenumber)
  .then(function (response) {
    var ids = response.subids;
    
    console.log('notifing ' + phonenumber + ' at ' + ids);
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
    }

    return request(options);   
  })  
}
