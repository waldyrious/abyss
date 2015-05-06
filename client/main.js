'use strict';

window.addEventListener("message", receiveMessage, false);

function receiveMessage(message) {
	console.log(message);
}

var m = require('mithril')
var moment = require('moment')
var regsw = require('./regsw')
regsw()

var Login = require('./login')

var login = m.mount(document.getElementById('login'), Login)

