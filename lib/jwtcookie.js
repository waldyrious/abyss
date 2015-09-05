var assert   = require('assert');
var thunkify = require('thunkify');
var _JWT     = require('jsonwebtoken');
var unless   = require('koa-unless');

// Make verify function play nice with co/koa
var JWT = {decode: _JWT.decode, sign: _JWT.sign, verify: thunkify(_JWT.verify)};

module.exports = function(opts) {
    opts = opts || {};
    opts.key = opts.key || 'user';

    assert(opts.secret, '"secret" option is required');

    var middleware = function *jwt(next) {
        var token, msg, user, parts, scheme, credentials;

        var token = this.cookies.get('jwt');

        try {
            user = yield JWT.verify(token, opts.secret, opts);
        } catch(e) {
            msg = 'Invalid token' + (opts.debug ? ' - ' + e.message + '\n' : '\n');
        }

        if (user || opts.passthrough) {
            this.state = this.state || {};
            this.state[opts.key] = user;
            yield next;
        } else {
            this.throw(401, msg);
        }
    };

    middleware.unless = unless;

    return middleware;
};

// Export JWT methods as a convenience
module.exports.sign   = _JWT.sign;
module.exports.verify = _JWT.verify;
module.exports.decode = _JWT.decode;
