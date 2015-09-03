'use strict';
var m = require('mithril');
var Cookies = require('cookies-js');

// adds jwt Authorization header to XHRs.
var withAuth = module.exports.withAuth = function withAuth (xhr) {
    var jwt = Cookies.get('jwt');

    if (jwt) {
        xhr.setRequestHeader('Authorization', 'Bearer ' + jwt);
    }
    return xhr;
}

module.exports.oboeAuth = function() {
    return {
        'Authorization': 'Bearer ' +  Cookies.get('jwt')
    }
}

var me = module.exports.me = (function() {
    var currentMe = m.prop({});

    return function (value) {
        if (value) {
            // console.log("new identity " + JSON.stringify(value));
            // if (value.jwt) {
            //     Cookies.set('jwt', value.jwt, {
            //         expires: Infinity
            //     });
            //     console.log('New jwt ' + value.jwt);
            // }

            if (!value.nickname) {
                value.nickname = '';
            }
            currentMe(value);
            return value;
        } else {
            // console.log("current identity " + JSON.stringify(me()));
            return currentMe();
        }
    };
})();

var changeNickname = module.exports.changeNickname = function(nickname) {
    return m.request({
            method: 'POST',
            url: '/api/me',
            config: withAuth,
            data: {
                nickname: nickname.trim()
            }
        })
        .then(me)
};

var whoami = module.exports.whoami = function() {
    return m.request({
            url: '/api/me',
            config: withAuth
        })
        .then(me)
};

module.exports.logout = function() {
    return m.request({
            method: 'DELETE',
            config: withAuth,
            url: '/api/me'
        })
        .then(function(response) {
            me(response);
            Cookies.expire('jwt');
        })
};

whoami();

Object.defineProperty(module.exports, 'nickname', {
    get: function () {
        if (me() && me().nickname) {
            return me().nickname;
        } else {
            return '';
        }
    },

    set: function (value) {
        return changeNickname(value);
    }
})
