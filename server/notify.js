var dao = require('./dao')
var Promise = require('bluebird')
var request = Promise.promisify(require('request'))
var fs = require('fs')

var gcmapikey = fs.readFileSync('secret/gcmapikey', {encoding:'utf8'})

module.exports = function (phonenumber) {
  var ids = dao.getSubIds(phonenumber)

  debugger
  var options = {
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

  return request(options)
  // .then(function (x) {
  //   debugger
  // })
}
