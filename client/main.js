'use strict';

var m = require('mithril')
var moment = require('moment')
var regsw = require('./regsw')
regsw()

var Bro = {}
Bro.controller = function () {
  var self = this
  this.phonenumber = m.prop('')
  this.bros = m.prop([])
  this.phonenumberapi = m.prop('')
  this.noauth = function () { return self.phonenumberapi() == '' }

  this.whoami = function () {
    m.request({url:'/api/registration/phone'})
    .then(self.phonenumberapi)
  }

  self.whoami()

  this.loginClick = function () {
    console.log(self.phonenumber())
    m.request({method: 'POST', url: '/api/registration/phone', data: { phonenumber: self.phonenumber() } })
    .then(function (response) {
      self.phonenumberapi(response)
    })
  }

  this.broMe = function () {
    m.request({method: 'POST', url: '/api/bro', data: { to: self.phonenumber(), text: 'sup bro!'} })
  }

  this.getBros = function () {
    m.request({method: 'GET', url: '/api/bro'}).then(self.bros)
  }
}
Bro.view = function (ctrl) {
  return [
    m('div', [
      m('label', 'Phone number'),
      m('input', {oninput: m.withAttr('value', ctrl.phonenumber) }),
      m('button', {onclick: ctrl.loginClick},'Login'),
    ]),
    m('div', 'logged in as ' + ctrl.phonenumberapi()),
    m('button', {onclick: ctrl.broMe, disabled: ctrl.noauth() },'Bro Myself!'),
    m('button', {onclick: ctrl.getBros, disabled: ctrl.noauth() },'Get messages!'),
    m('div', ctrl.bros().map(function (bro) {
      return [m('label', 'From: '), m('span', bro.from), m('br'),
      m('label', 'Date: '), m('span', moment(bro.date).fromNow()), m('br'),
      m('span', bro.text), m('hr')]
    }))
  ]
}

m.mount(document.getElementById('bro'), Bro)
