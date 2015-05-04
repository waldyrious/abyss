var moment = require('moment')
var m = require('mithril')

module.exports.controller = function (args, extras) {
  var self = this

  this.login = args.login

  this.bros = m.prop([])
  this.to = m.prop('')
  this.message = m.prop('')

  this.broMe = function () {
    m.request({method: 'POST', url: '/api/bro', data: { to: self.phonenumber(), text: 'sup bro!'} })
  }

  this.send = function () {
    m.request({method: 'POST', url: '/api/bro', data: { to: self.to(), text: self.message() } })
  }

  this.getBros = function () {
    m.request({method: 'GET', url: '/api/bro'}).then(self.bros)
  }

  this.clearBros = function () {
    m.request({method: 'DELETE', url: '/api/bro'}).then(self.bros)
  }

  self.getBros()
}

module.exports.view = function (ctrl) {

  function buttonify (obj) {
    obj.class="btn btn-default"
    return obj
  }
  function bbuttonify (obj) {
    obj.class="btn btn-default btn-lg btn-primary"
    return obj
  }

  return m('div', [
    m('div', [
      m('label', 'To: '), m('br'),
      m('input', {oninput: m.withAttr('value', ctrl.to) }),m('br'),
      m('label', 'Message: '),m('br'),
      m('input', {oninput: m.withAttr('value', ctrl.message) }), m('br'),
      m('button', bbuttonify({onclick: ctrl.send, disabled: ctrl.login.noauth() }), 'Send Bro!'),
    ]),
  	m('br'),
    m('button', buttonify({onclick: ctrl.getBros, disabled: ctrl.login.noauth() }), 'Get messages!'),
    m('button', buttonify({onclick: ctrl.clearBros, disabled: ctrl.login.noauth() }), 'Delete all messages!'),
    m('div', ctrl.bros().map(function (bro) {
      return [m('label', 'From: '), m('span', bro.from), m('br'),
      m('label', 'Date: '), m('span', moment(bro.date).fromNow()), m('br'),
      m('span', bro.text), m('hr')]
    }))
  ])
}
