var m = require('mithril')
var regsw = require('./regsw')
regsw()

var Bro = {}
Bro.controller = function () {
  var self = this
  this.phonenumber = m.prop('')
  this.loginClick = function () {
    console.log(self.phonenumber())
    m.request({method: 'POST', url: '/api/registration/phone', data: { phonenumber: self.phonenumber() } })
  }
}
Bro.view = function (ctrl) {
  return [
    m('label', 'Phone number'),
    m('input', {oninput: m.withAttr('value', ctrl.phonenumber) }),
    m('button', {onclick: ctrl.loginClick},'Login'),
    m('div', 'bro!')
  ]
}

m.mount(document.getElementById('bro'), Bro)
