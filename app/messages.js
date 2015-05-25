'use strict';
var moment = require('moment');
var m = require('mithril');
var Autolinker = require('autolinker');
var autolinker = new Autolinker();
var styler = require('./styler');
var error = require('./error');
var Velocity = require('velocity-animate');
var oboe = require('oboe');
var flatten = require('lodash/array/flatten');
var uniq = require('lodash/array/uniq');
var without = require('lodash/array/without');
var difference = require('lodash/array/difference');
var last = require('lodash/array/last');
var isEqual = require('lodash/lang/isEqual');
var clone = require('lodash/lang/clone');
var union = require('lodash/array/union');

module.exports.controller = function (args, extras) {
	var self = this;

	self.messages = [];
	self.conversations = [];
	self.to = [''];
	self.message = m.prop('');
	self.error = error.ErrorHolder();

	self.selectGroup = function (group) {
		self.to = clone(group);
		self.getMessagesStreaming();
	};

	self.selectFirstGroup = function () {
		if (isEqual(self.to, ['']) && self.conversations[0]) {
			self.to = clone(self.conversations[0].group);
			self.getMessagesStreaming();
		}
	};

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

	self.setMessages = function (value) {
		self.messages = value;
	}

	self.setConversations = function (value) {
		self.conversations = value;
		immediate(self.selectFirstGroup);
	}

	function multiTo(message) {
		return !fromMe(message) && message.to.length && message.to.length > 1;
	}

	self.toPlus = function () {
		self.to.push('');
	};

	self.toMinus = function () {
		self.to.pop();

		if (self.to.length === 0) {
			self.to.push('');
		}
	};

	self.send = function () {
		m.request({method: 'POST', background: true, url: '/api/messages', data: {to: self.to, text: self.message()}})
		.then(self.refresh, self.error)
	};

	self.getMessages = function () {
		m.request({method: 'GET', url: '/api/messages?group=' + encodeURIComponent(JSON.stringify(self.to))})
		.then(self.setMessages, self.error)
	};

	self.refresh = self.getConversations = function () {
		m.request({method: 'GET', background: true, url: '/api/conversations'})
		.then(self.setConversations, self.error)
		.then(self.getMessagesStreaming, self.error)
	};

	self.getMessagesStreaming = function () {
		// Stream in first 10 messages and try to render them ASAP as we load the rest
		var count = 0;
		var show = 9;

		m.startComputation();
		self.messages = [];
		oboe('/api/messages?group=' + encodeURIComponent(JSON.stringify(self.to))).node('![*]', function (item) {
			self.messages.push(item);
			count++;
			if (count == show) {
				m.endComputation();
				m.startComputation();
			}
			return oboe.drop;
		})
		.done(m.endComputation);
	};

	self.clearMessages = function () {
		m.request({method: 'DELETE', background: true, url: '/api/messages'})
		.then(self.refresh, self.error)
	};

	self.delete = function (message) {
		m.request({method: 'DELETE', background: true, url: '/api/messages/' + encodeURIComponent(message.id)})
		// .then(function () {
		// 	self.messages.splice(self.messages.indexOf(message), 1);
		// }, self.error);
		.then(self.refresh, self.error)
	};

	self.refresh();
};

module.exports.view = function (ctrl, args, extras) {

	var fadesIn = function (element, isInitialized, context) {
		if (!isInitialized) {
			element.style.opacity = 0;
			Velocity(element, {opacity: 1})
		}
	};

	var fadesOut = function (callback) {
		return function (e) {
			//don't redraw yet
			m.redraw.strategy("none");

			Velocity(e.target.parentNode, {opacity: 0}, {
				complete: function () {
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

	function simplify(group) {
		var ret = without(flatten(group), args.phonenumber());
		if (ret.length === 0)
			ret = [args.phonenumber()];
		return ret;
	}

	var bbuttonify = styler.bbuttonify;
	var buttonify = styler.buttonify;

	function displayMessage(message) {
		return m('div', {
			key: message.id,
			config: fadesIn
		}, [ m('div', [m('span', 'From: '),
			m('b', fromMe(message)? 'me' : message.from),
			m('i', ' ' + moment(message.date).fromNow())])
			,
			//fromMe(message) ?  m('div', [
			//	m('span', 'To: '), m('b', message.to.join(', ')),
			//	m('i', ' ' + moment(message.date).fromNow())
			//]) : null,
			m('div', m.trust(autolinker.link(message.text))),
			m('br'),
			m('button', buttonify({
				onclick: fadesOut(ctrl.delete.bind(this, message))
			}), 'X'),
			m('hr')
		])
	}

	return m('div', {config: fadesIn}, [
		m('div', [
			error.renderError(ctrl.error),
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
			m('button', bbuttonify({onclick: ctrl.send, disabled: args.noauth()}), 'Send!')
		]),
		m('br'),
		m('button', buttonify({onclick: ctrl.refresh, disabled: args.noauth()}), 'Refresh messages!'),
		m('button', buttonify({onclick: ctrl.clearMessages, disabled: args.noauth()}), 'Delete all messages!'),
		m('div', [m('div.col-sm-4#left',
		[m('h3', 'Conversations'),
			ctrl.conversations.map(function (grouping) {
				return m('div', styler.pointer(styler.round({
					onclick: function () {
						ctrl.selectGroup(grouping.group)
					},
					class: isEqual(flatten(grouping.group), ctrl.to) ? 'bg-info' : null
				})),
				[simplify(grouping.group).map(function (ph) {
					return m('div', ph)
				}),
					m('hr')
				])
			})]),
			m('div.col-sm-8#right', [m('h3', 'Messages'),
				ctrl.messages.map(displayMessage)
			])
		])
	])
};
