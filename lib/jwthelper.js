var secret = require('../secret/secret.json');

var jwt = require('jsonwebtoken');

module.exports = jwt;

module.exports.signDefault = function (o) {
    return jwt.sign(o, secret.jwtSecret);
}
