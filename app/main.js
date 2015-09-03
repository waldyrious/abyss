'use strict';
require('bootstrap/less/bootstrap.less');
require('./less/grayscale.less');
require('./s.css');

require('setimmediate');

var m = require('mithril');
var mainElement = document.getElementById('main');

var login = require('./login');
var messages = require('./messages');
var navbar = require('./navbar');
var radio = require('./radio');
var faq = require('./faq');

m.route(mainElement, "/conversations", {
    '/faq': faq,
    '/navbar': navbar,
    '/login': login,
    '/message': messages,
    '/conversations': navbar,
    '/conversations/:group': navbar,
    '/radio': radio
});

// var login = m.mount(mainElement, Login);
