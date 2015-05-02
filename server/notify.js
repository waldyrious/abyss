var dao = require('./dao')
var Promise = require('bluebird')
var request = Promise.promisify(require('request'))

module.exports = function (phonenumber) {
  var ids = dao.getSubIds(phonenumber)

  debugger
  var options = {
    uri: 'https://android.googleapis.com/gcm/send',
    method: 'POST',
    headers: {
      "Authorization": "key=AIzaSyB53BYAtVgei9UAO2SMYGNAzBTzavzrN0k",
      "Content-Type": "application/json"
    },
    json: true,
    body: {
      "registration_ids": ids
    }
  }

  return request(options)
  .then(function (x) {
    debugger
  })
}
