'use strict';

var m = require('mithril')
var moment = require('moment')
var regsw = require('./regsw')
regsw()

var Login = require('./login')
var Bro = require('./bro')

var login = m.mount(document.getElementById('login'), Login)
// var bro = m.mount(document.getElementById('bro'), Bro)

