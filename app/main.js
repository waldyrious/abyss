'use strict';
require('bootstrap/less/bootstrap.less');
require('./s.css');
require('setimmediate');

var m = require('mithril');
var mainElement = document.getElementById('login');

var login = require('./login');
var messages = require('./messages');
var navbar = require('./navbar');
var radio = require('./radio');
var faq = require('./faq');

m.route(mainElement, "/login", {
    '/faq': faq,
    '/navbar': navbar,
    '/login': login,
    '/message': messages,
    '/conversations/:group': navbar,
    '/conversations': navbar,
    '/radio': radio
});

// var login = m.mount(mainElement, Login);
