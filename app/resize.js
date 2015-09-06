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

    if (nav && left && right) {
        var navHeight = nav.clientHeight;
        var newHeight = h - navHeight + "px";
        if (w > 768) {
            left.style.height = newHeight;
            right.style.height = newHeight;
        } else {
            left.style.height = '100%';
            right.style.height = '100%';
        }
    }
}

window.onresize = resize;
