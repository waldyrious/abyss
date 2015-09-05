'use strict';

const secret = require('../secret/secret.json');
const jwt = require('jsonwebtoken');
module.exports = jwt;

module.exports.signDefault = function (o) {
    let options = {};
    // options.expiresInMinutes = 60;
    return jwt.sign(o, secret.jwtSecret, options);
}
