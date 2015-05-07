var moment = require('moment')
var m = require('mithril')
var Autolinker = require('autolinker')
var autolinker = new Autolinker();
var styler = require('./styler');

module.exports.controller = function (args, extras) {
  var self = this

  self.bros = m.prop([]);
  self.to = [m.prop('')];
  self.message = m.prop('')

  self.toPlus = function () {
    self.to.push(m.prop(''))
  }

  self.toMinus = function () {
    if (self.to.length > 1) {
      self.to.pop();
    } else {
      self.to[0]('');
    }
  }

  self.send = function () {
    m.request({method: 'POST', url: '/api/bro', data: { to: self.to, text: self.message() } })
    .then(self.getBros)
  }

  self.getBros = function () {
    m.request({method: 'GET', url: '/api/bro'})
    .then(self.bros)
  }

  self.clearBros = function () {
    m.request({method: 'DELETE', url: '/api/bro'})
    .then(self.bros)
  }

  self.delete = function(message) {
    m.request({method: 'DELETE', url: '/api/bro/' + encodeURIComponent(message.id)})
    .then(self.getBros)
  }

  self.getBros()
}

module.exports.view = function (ctrl, args, extras) {

  function fromMe(message) {
    return message.from === args.phonenumber();
  }

  function clickTo(message) {
    return styler.pointer({
      onclick: function(e) {
        ctrl.to(fromMe(message)?message.to:message.from)
      }
    })
  }

  return m('div', [
    m('div', [
      m('label', 'To: '),m('span', ' '),
      m('button', styler.buttonify({onclick: ctrl.toPlus}), '+'),
      m('button', styler.buttonify({onclick: ctrl.toMinus}), '-'),
      m('br'),
      ctrl.to.map(function (item, index) {
        return m('input', {type:'tel', oninput: m.withAttr('value', ctrl.to[index]), value: ctrl.to[index]() })
      }),
      m('br'),
      m('label', 'Message: '),m('br'),
      m('input', {oninput: m.withAttr('value', ctrl.message) }), m('br'),
      m('button', styler.bbuttonify({onclick: ctrl.send, disabled: args.noauth() }), 'Send Bro!'),
    ]),
  	m('br'),
    m('button', styler.buttonify({onclick: ctrl.getBros, disabled: args.noauth() }), 'Get messages!'),
    m('button', styler.buttonify({onclick: ctrl.clearBros, disabled: args.noauth() }), 'Delete all messages!'),
    m('div', ctrl.bros().map(function (bro) {
      return [m('span', clickTo(bro), fromMe(bro)?'To: ':'From: '),
          m('b', clickTo(bro), (fromMe(bro)?bro.to:bro.from) + ' '),
          m('i', moment(bro.date).fromNow()),
          m('br'),
          m('span', m.trust(autolinker.link(bro.text))),
          m('br'),
          m('button', styler.buttonify({onclick: function () { ctrl.delete(bro)}}), 'X'),
          m('hr')
      ]}))
    ])
  }
