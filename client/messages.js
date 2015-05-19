"use strict";

var moment = require('moment');
var m = require('mithril');
var Autolinker = require('autolinker');
var autolinker = new Autolinker();
var styler = require('./styler');
var Error = require('./error');
var Velocity = require('velocity-animate');
var request = require('request');
var JSONStream = require('JSONStream');
var es = require('event-stream');

module.exports.controller = function (args, extras) {
	var self = this;

	self.messages = [];
	self.to = [''];
	self.message = m.prop('');
	self.error = Error.ErrorHolder();

	function fromMe(message) {
		return message.from === args.phonenumber();
	}

	function immediate(fn) {
		m.startComputation();
		setImmediate(function () {
			fn();
			m.endComputation();
		});
	}

	function setMessages(value) {
		immediate(function () {
			self.messages = value;
		});
	}
	function multiTo(message) {
		return !fromMe(message) && message.to.length && message.to.length > 1;
	}

	self.replyTo = function (message) {
		if (fromMe(message)) {
			if (!Array.isArray(message.to)) {
				throw new TypeError('To field must be array');
			} else {
				self.to = [];
				for (var i = 0; i < message.to.length; i++) {
					self.to.push(message.to[i]);
				}
			}
		} else {
			self.to = [];
			self.to.push(message.from);
			for (var i = 0; i < message.to.length; i++) {
				if (message.to[i] !== args.phonenumber()) {
					self.to.push(message.to[i]);
				} else {
				}
			}
		}
	};

	self.toPlus = function () {
		self.to.push('')
	};

	self.toMinus = function () {
		if (self.to.length > 1) {
			self.to.pop();
		} else {
			self.to[0] = '';
		}
	};

	self.send = function () {
		m.request({method: 'POST', url: '/api/bro', data: {to: self.to, text: self.message()}})
		.then(self.getBros, self.error)
	};

	self.getBros = function () {
		m.request({method: 'GET', url: '/api/bro'})
		.then(setMessages, self.error)
	};

	self.getBrosStreaming = function () {
		request({url: location.protocol + "//" + location.host + '/api/bro'})
		.pipe(JSONStream.parse('*'))
		.pipe(es.mapSync(function (data) {
			m.startComputation();
			self.messages.push(data);
			m.endComputation();
		}))
	};

	self.clearBros = function () {
		m.request({method: 'DELETE', url: '/api/bro'})
		.then(self.getBros, self.error)
	};

	self.delete = function (message) {
		m.request({method: 'DELETE', url: '/api/bro/' + encodeURIComponent(message.id)})
		.then(immediate(function () {
			self.messages.splice(self.messages.indexOf(message), 1);
		}), self.error)
	};

	setTimeout(self.getBros, 0);
};

module.exports.view = function (ctrl, args, extras) {

	var fadesIn = function(element, isInitialized, context) {
		if (!isInitialized) {
			element.style.opacity = 0;
			Velocity(element, {opacity: 1})
		}
	};

	var fadesOut = function(callback) {
		return function(e) {
			//don't redraw yet
			m.redraw.strategy("none");

			Velocity(e.target.parentNode, {opacity: 0}, {
				complete: function() {
					//now that the animation finished, redraw
					m.startComputation();
					callback();
					m.endComputation()
				}
			})
		}
	};

	function fromMe(message) {
		return message.from === args.phonenumber();
	}

	function groupMessage(message) {
		return !fromMe(message) && message.to.length && message.to.length > 1;
	}

	function replyTo(message) {
		return styler.pointer({
			onclick: function (e) {
				ctrl.replyTo(message)
			}
		})
	}

	var bbuttonify = styler.bbuttonify;
	var buttonify = styler.buttonify;

	return m('div', {config: fadesIn}, [
		m('div', [
			Error.renderError(ctrl.error),
			m('label', 'To: '), m('span', ' '),
			m('button', buttonify({onclick: ctrl.toPlus}), '+'),
			m('button', buttonify({onclick: ctrl.toMinus}), '-'),
			m('br'),
			ctrl.to.map(function (item, index) {
				return m('input', {
					type: 'tel', onchange: m.withAttr('value', function (value) {
						ctrl.to[index] = value
					}), value: ctrl.to[index]
				})
			}),
			m('br'),
			m('label', 'Message: '), m('br'),
			m('input', {
				'style': {'width': '100%'},
				onchange: m.withAttr('value', ctrl.message),
				value: ctrl.message()
			}),
			m('br'),
			m('br'),
			m('button', bbuttonify({onclick: ctrl.send, disabled: args.noauth()}), 'Send Bro!')
		]),
		m('br'),
		m('button', buttonify({onclick: ctrl.getBros, disabled: args.noauth()}), 'Get messages!'),
		m('button', buttonify({onclick: ctrl.clearBros, disabled: args.noauth()}), 'Delete all messages!'),
		m('div', ctrl.messages.map(function (message) {
			return m('div', {key: message.id, config: fadesIn }, [m('span', replyTo(message), fromMe(message) ? 'To: ' : 'From: '),
				m('b', replyTo(message), (fromMe(message) ? (message.to.join(', ')): message.from) + ' '),
				m('i', moment(message.date).fromNow()),
				m('br'),
				groupMessage(message) ? m('span', replyTo(message), 'To: ' + message.to.join(', ')) : null,
				m('br'),
				m('span', m.trust(autolinker.link(message.text))),
				m('br'),
				m('button', buttonify({
					onclick: fadesOut(ctrl.delete.bind(this, message))
				}), 'X'),
				m('hr')
			])
		}))
	])
};
