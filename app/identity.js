'use strict';
var m = require('mithril');
var Cookies = require('cookies-js');

// check localStorage and populate cookie at startup.
// some corporate defense software aggressively clears our cookies :(
if (window.localStorage && window.localStorage.getItem('jwt')) {
    var ls = window.localStorage.getItem('jwt');
    var cs = Cookies.get('jwt');

    if (!cs && ls) {
        Cookies.set('jwt', ls);
    } else if (!ls && window.localStorage) {
        // backup our jwt to localstorage
        window.localStorage.setItem('jwt', cs);
    }
}


Object.defineProperty(module.exports, 'jwt', {
    get: function () {
        if (!Cookies.get('jwt') && window.localStorage && window.localStorage.getItem('jwt')) {
            var ls = window.localStorage.getItem('jwt');
            Cookies.set('jwt', ls);
        }
        return Cookies.get('jwt');
    }
});

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


Object.defineProperty(module.exports, 'authHeaders', {
    get: function () {
        return {
            'Authorization': 'Bearer ' + module.exports.jwt
        }
    }
});

// adds jwt Authorization header to XHRs.
var withAuth = module.exports.withAuth = function withAuth (xhr) {
    var jwt = module.exports.jwt;

    if (jwt) {
        xhr.setRequestHeader('Authorization', 'Bearer ' + jwt);
    }
    return xhr;
}

var _me = m.prop({});

var me = module.exports.me = function (item) {
    if (item) {
        _me(item);
        if (Cookies.get('jwt') && window.localStorage) {
            window.localStorage.setItem('jwt', Cookies.get('jwt'));
        }
    } else {
        return _me();
    }
}

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
                // Cookies.expire('jwt');
                // localStorage.removeItem('jwt');
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
            localStorage.removeItem('jwt');
            m.route('/login');
        })
};

whoami();
