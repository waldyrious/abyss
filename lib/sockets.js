// holds socketio objects since we have one for http and https

const ios = [];
const Promise = require('bluebird');
const secret = require('../secret/secret.json').jwtSecret;
const JWT = Promise.promisifyAll(require('jsonwebtoken'));
const opts = {};
const dao = require('./dao');

module.exports.register = function (io) {
    ios.push(io);

    io.on('connection', function (socket) {
        function cookiestring2object(str) {
            str = str.split('; ');
            var result = {};
            for (var i = 0; i < str.length; i++) {
                var cur = str[i].split('=');
                result[cur[0]] = cur[1];
            }
            return result;
        }

        var cookies = cookiestring2object(socket.handshake.headers.cookie);
        var token = cookies.jwt;

        JWT.verifyAsync(token, secret, opts)
        .then(function (user) {
            dao.getUpdates(user.phonenumber)
            .run()
            .then(function (cursor) {
                socket.on('disconnect', function () {
                    cursor.close();
                })
                cursor.each(function (nothing, changes) {
                    if (changes !== null) {
                        socket.emit('changes', JSON.stringify(changes))
                    }
                })
            })
        })
    });
}
