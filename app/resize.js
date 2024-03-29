'use strict';

var m = require('mithril');
var nav;
var left;
var right;

var body = document.getElementsByTagName('body')[0];

module.exports.registerNav = function (theNav) {
    nav = theNav;
    resize();
}

module.exports.registerLeft = function (theLeft) {
    left = theLeft;
    resize();
}
module.exports.registerRight = function (theRight) {
    right = theRight;
    resize();
}

var lastRouteWasLogin = false;
function resize(ev) {
    var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

    if (nav && left && right && w > 768) {
        var navHeight = nav.clientHeight;
        var newHeight = h - navHeight + "px";

        left.style.height = newHeight;
        right.style.height = newHeight;
        left.style.overflowY = 'scroll';
        right.style.overflowY = 'scroll';
    } else {
        if (left) {
            left.style.height = '100%';
        }
        if (right) {
            right.style.height = '100%';
        }
    }

    var route = m.route();
    if (route) {
        route = route.split('/');
    }

    // if (w > 768 && route && route[1] === 'login') {
    if (route && route[1] === 'login') {
        // The if check avoids repaints in safari.
        if (body.style.background !== "url('img/dark.jpg') no-repeat black") {
            body.style.backgroundColor = '';
            body.style.background = "url('img/dark.jpg') no-repeat black";
            body.style.backgroundSize = "cover";
            lastRouteWasLogin = true;
        }
    } else {
        if (lastRouteWasLogin) {
            lastRouteWasLogin = false;
            body.style.transition = 'background 0s ease-in-out';
            body.style.background = 'none white';
            setTimeout(function () {
                body.style.transition = 'background 1s ease-in-out';
                body.style.background = 'none black';
            }, 100);
        } else {
            body.style.background = 'none black';
        }
    }

}
window.onresize = resize;
module.exports.resize = resize;
