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

var me = module.exports.me = m.prop({});

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

var whoami = module.exports.whoami = (function () {
    var promise = null;

    return function (retry) {
        if (promise === null || retry) {
            promise = m.request({
                url: '/api/me',
                config: withAuth
            })
            .then(me, function (err) {
                Cookies.expire('jwt');
                m.route('/login');
            })
        }
        return promise;
    }
})();

module.exports.logout = function() {
    return m.request({
            method: 'DELETE',
            config: withAuth,
            url: '/api/me'
        })
        .then(function(response) {
            me(response);
            Cookies.expire('jwt');
            m.route('/login');
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
});

Object.defineProperty(module.exports, 'jwt', {
    get: function () {
        return Cookies.get('jwt');
    }
});


Object.defineProperty(module.exports, 'authHeaders', {
    get: function () {
        return {
            'Authorization': 'Bearer ' + Cookies.get('jwt')
        }
    }
});
