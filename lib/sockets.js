// holds socketio objects since we have one for http and https
'use strict'
const ios = [];
const Promise = require('bluebird');
const secret = require('../secret/secret.json').jwtSecret;
const JWT = Promise.promisifyAll(require('jsonwebtoken'));
const opts = {};
const dao = require('./dao');

function cookiestring2object(str) {
    str = str.split('; ');
    var result = {};
    for (var i = 0; i < str.length; i++) {
        var cur = str[i].split('=');
        result[cur[0]] = cur[1];
    }
    return result;
}

module.exports.register = function (io) {
    ios.push(io);

    io.on('connection', function (socket) {
        Promise.coroutine(function *() {
            if (socket.handshake.headers && socket.handshake.headers.cookie) {
                var cookies = cookiestring2object(socket.handshake.headers.cookie);
                if (!cookies.jwt) {
                    return;
                }

                let token = cookies.jwt;
                let user = yield JWT.verifyAsync(token, secret, opts);
                if (user.id) {
                    let cursor = yield dao.getUpdates(user.id).run()
                    socket.on('disconnect', function () {
                        cursor.close();
                    })
                    cursor.each(function (nothing, changes) {
                        if (changes !== null) {
                            socket.emit('changes', JSON.stringify(changes))
                        }
                    })
                }
            }
        })();
    });
}
