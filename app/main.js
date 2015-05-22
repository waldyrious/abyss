'use strict';
require('!style!css!bootstrap/dist/css/bootstrap.css');
require('!style!css!./s.css');
require('setimmediate');

window.addEventListener("message", receiveMessage, false);

function receiveMessage(message) {
	console.log(message);
}

var m = require('mithril');

var regsw = require('./regsw');
regsw();

var Login = require('./login');

var login = m.mount(document.getElementById('login'), Login);

