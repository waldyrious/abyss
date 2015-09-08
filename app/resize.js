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

function resize(ev) {
    var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    var route = m.route();
    if (route) {
        route = route.split('/');
        console.log(route);
    }

    // if (w > 768 && route && route[1] === 'login') {
    if (route && route[1] === 'login') {
        if (body.style.background !== "url('img/dark.jpg') no-repeat") {
            // if check avoids repaint in safari.
            body.style.background = "url('img/dark.jpg') no-repeat";
            body.style.backgroundSize = "cover";
            body.style.backgroundColor = 'black';
        }
        // body.style.background = "inherit";
        // body.style.backgroundImage = "url('img/dark.jpg')";
        // body.style.backgroundRepeat = "none";
    } else {
        body.style.background = 'black';
        // body.style.backgroundColor = "black";
    }

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
}
window.onresize = resize;
module.exports = resize;
