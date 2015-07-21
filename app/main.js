'use strict';
require('bootstrap/less/bootstrap.less');
require('./s.css');
require('setimmediate');

var m = require('mithril');
var Login = require('./login');
var login = m.mount(document.getElementById('login'), Login);
