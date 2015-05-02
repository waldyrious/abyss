var dao = require('./dao')
var Promise = require('bluebird')
var request = Promise.promisify(require('request'))

module.exports = function (phonenumber) {
  var ids = getSubIds(phonenumber)

  var options = {
    uri: 'https://android.googleapis.com/gcm/send',
    method: 'POST',
    headers: {
      "Authorization": "key=AIzaSyB53BYAtVgei9UAO2SMYGNAzBTzavzrN0k",
      "Content-Type": "application/json"
    },
    json: {
      "registration_ids": JSON.stringify(ids)
    }
  }

  return request(options)
}
