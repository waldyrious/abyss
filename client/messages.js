var moment = require('moment');
var m = require('mithril');
var sugarTags = require('mithril.sugartags')(m);
var Autolinker = require('autolinker');
var autolinker = new Autolinker();
var styler = require('./styler');
var _ = require('lodash');
var Error = require('./error');

module.exports.controller = function (args, extras) {
	var self = this;

	self.messages = m.prop([]);
	self.to = [''];
	self.message = m.prop('');
	self.error = Error.ErrorHolder();

	function fromMe(message) {
		return message.from === args.phonenumber();
	}

	function multiTo(message) {
		return !fromMe(message) && message.to.length && message.to.length > 1;
	}

	self.replyTo = function (message) {
		if (fromMe(message)) {
			if (!_.isArray(message.to)) {
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
		.then(self.messages, self.error)
	};

	self.clearBros = function () {
		m.request({method: 'DELETE', url: '/api/bro'})
		.then(self.getBros, self.error)
	};

	self.delete = function (message) {
		m.request({method: 'DELETE', url: '/api/bro/' + encodeURIComponent(message.id)})
		.then(self.getBros, self.error)
	};

	self.getBros()
};

module.exports.view = function (ctrl, args, extras) {

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

	with (sugarTags) {
		return DIV([
			DIV([
				Error.renderError(ctrl.error),
				LABEL('To: '), SPAN(' '),
				BUTTON(buttonify({onclick: ctrl.toPlus}), '+'),
				BUTTON(buttonify({onclick: ctrl.toMinus}), '-'),
				BR(),
				ctrl.to.map(function (item, index) {
					return m('input', {
						type: 'tel', oninput: m.withAttr('value', function (value) {
							ctrl.to[index] = value
						}), value: ctrl.to[index]
					})
				}),
				BR(),
				LABEL('Message: '), BR(),
				m('input', {
					'style': {'width': '100%'},
					oninput: m.withAttr('value', ctrl.message),
					value: ctrl.message()
				}),
				BR(),
				BR(),
				BUTTON(bbuttonify({onclick: ctrl.send, disabled: args.noauth()}), 'Send Bro!')
			]),
			BR(),
			BUTTON(buttonify({onclick: ctrl.getBros, disabled: args.noauth()}), 'Get messages!'),
			BUTTON(buttonify({onclick: ctrl.clearBros, disabled: args.noauth()}), 'Delete all messages!'),
			DIV(ctrl.messages().map(function (bro) {
				var ret = [SPAN(replyTo(bro), fromMe(bro) ? 'To: ' : 'From: '),
					B(replyTo(bro), (fromMe(bro) ? (bro.to.join(', ')): bro.from) + ' '),
					I(moment(bro.date).fromNow()),
					BR()];
				if (groupMessage(bro)) {
					ret.push(m('span', replyTo(bro), 'To: ' + bro.to.join(', ')));
					ret.push(BR());
				}
				ret = ret.concat([
					SPAN(m.trust(autolinker.link(bro.text))),
					BR(),
					BUTTON(buttonify({
						onclick: function () {
							ctrl.delete(bro)
						}
					}), 'X'),
					HR()
				]);
				return ret;
			}))

		])
	}
};
