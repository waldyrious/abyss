'use strict';

var nav;
var left;
var right;

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
    var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0)
    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0)

    if (w < 768) {
        document.body.style.background = 'black';
    }

    if (nav && left && right) {
        var navHeight = nav.clientHeight;
        var newHeight = h - navHeight + "px";
        if (w > 768) {
            left.style.height = newHeight;
            left.style.overflowY = 'scroll';
            right.style.height = newHeight;
            right.style.overflowY = 'scroll';
        } else {
            left.style.height = '100%';
            right.style.height = '100%';
        }
    }
}

window.onresize = resize;

// document.documentElement.style.backgroundImage = require('./img/intro-bg.jpg');
