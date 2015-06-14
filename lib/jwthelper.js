var secret = require('../secret/secret.json');

var jwt = require('jsonwebtoken');

module.exports = jwt;

module.exports.signDefault = function (o) {
    var options = {};
    // options.expiresInMinutes = 60;
    return jwt.sign(o, secret.jwtSecret, options);
}
