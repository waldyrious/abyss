var m = require('mithril')
var regsw = require('./regsw')
regsw()

var Bro = {}
Bro.controller = function () {
  var self = this
  this.noauth = m.prop(true)
  this.phonenumber = m.prop('')
  this.loginClick = function () {
    console.log(self.phonenumber())
    m.request({method: 'POST', url: '/api/registration/phone', data: { phonenumber: self.phonenumber() } })
    .then(function (response) {
      self.noauth(false)
    })
  }

  this.broMe = function () {
    m.request({method: 'POST', url: '/api/bro', data: { phonenumber: self.phonenumber() , message: 'sup!'} })
  }
}
Bro.view = function (ctrl) {
  return [
    m('div', [
      m('label', 'Phone number'),
      m('input', {oninput: m.withAttr('value', ctrl.phonenumber) }),
      m('button', {onclick: ctrl.loginClick},'Login'),
    ]),
    m('button', {onclick: ctrl.broMe, disabled: ctrl.noauth() },'Bro Myself!'),
  ]
}

m.mount(document.getElementById('bro'), Bro)
