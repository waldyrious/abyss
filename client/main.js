var m = require('mithril')
var regsw = require('./regsw')
regsw()

var Bro = {}
Bro.controller = function () {
  var self = this
  this.phone = m.prop('')
  this.loginClick = function () {
    console.log(self.phone())
  }
}
Bro.view = function (ctrl) {
  return [
    m('label', 'Phone number'),
    m('input', {oninput: m.withAttr('value', ctrl.phone) }),
    m('button', {onclick: ctrl.loginClick},'Login'),
    m('div', 'bro!')
  ]
}

m.mount(document.getElementById('bro'), Bro)
