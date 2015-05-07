var moment = require('moment')
var m = require('mithril')
var Autolinker = require('autolinker')
var autolinker = new Autolinker();
var styler = require('./styler');

module.exports.controller = function (args, extras) {
  var self = this

  this.bros = m.prop([])
  this.to = m.prop('')
  this.message = m.prop('')

  this.broMe = function () {
    m.request({method: 'POST', url: '/api/bro', data: { to: args.phonenumber(), text: 'sup bro!'} })
  }

  this.send = function () {
    m.request({method: 'POST', url: '/api/bro', data: { to: self.to(), text: self.message() } })
    .then(self.getBros)
  }

  this.getBros = function () {
    m.request({method: 'GET', url: '/api/bro'})
    .then(self.bros)
  }

  this.clearBros = function () {
    m.request({method: 'DELETE', url: '/api/bro'})
    .then(self.bros)
  }

  this.delete = function(message) {
    m.request({method: 'DELETE', url: '/api/bro/' + encodeURIComponent(message.id)})
    .then(self.getBros)
  }

  self.getBros()
}

module.exports.view = function (ctrl, args, extras) {

  function fromMe(message) {
    return message.from === args.phonenumber();
  }

  return m('div', [
    m('div', [
      m('label', 'To: '), m('br'),
      m('input', {type:'tel', oninput: m.withAttr('value', ctrl.to), value: ctrl.to() }),
      m('br'),
      m('label', 'Message: '),m('br'),
      m('input', {oninput: m.withAttr('value', ctrl.message) }), m('br'),
      m('button', styler.bbuttonify({onclick: ctrl.send, disabled: args.noauth() }), 'Send Bro!'),
    ]),
  	m('br'),
    m('button', styler.buttonify({onclick: ctrl.getBros, disabled: args.noauth() }), 'Get messages!'),
    m('button', styler.buttonify({onclick: ctrl.clearBros, disabled: args.noauth() }), 'Delete all messages!'),
    m('div', ctrl.bros().map(function (bro) {
      return m('div', {onclick: function(e) { ctrl.to( fromMe(bro)?bro.to:bro.from)}
        , style: {
          cursor:'pointer'
        }
      },
       [ m('span', fromMe(bro)?'To: ':'From: '), m('b', (fromMe(bro)?bro.to:bro.from) + ' '),
        m('i', moment(bro.date).fromNow()),
        m('br'),
        m('span', m.trust(autolinker.link(bro.text))),
        m('br'),
        m('button', styler.buttonify({onclick: function () { ctrl.delete(bro)}}), 'X'),
        m('hr')
        ])}))])
}
