'use strict';
var moment = require('moment');
var m = require('mithril');
var Autolinker = require('autolinker');
var autolinker = new Autolinker();
var styler = require('./styler');
var error = require('./error');
var Velocity = require('velocity-animate');
var oboe = require('oboe');
var filter = require('lodash/collection/filter');
var flatten = require('lodash/array/flatten');
var uniq = require('lodash/array/uniq');
var without = require('lodash/array/without');
var difference = require('lodash/array/difference');
var last = require('lodash/array/last');
var isEqual = require('lodash/lang/isEqual');
var clone = require('lodash/lang/clone');
var union = require('lodash/array/union');
var merge = require('lodash/object/merge');


module.exports.controller = function (args, extras) {
	var self = this;
	self.working = m.prop(false);

	self.messages = [];
	self.conversations = [];
	self.nicknames = {};
	self.to = [''];
	self.message = m.prop('');
	self.error = error.ErrorHolder();

	var withAuth = function(xhr) {
		if (args.jwt()) {
			console.log('args jwt' + args.jwt())
    		xhr.setRequestHeader('Authorization', 'Bearer ' + args.jwt());
		}
	}

	self.getNickname = function (ph) {
		if (self.nicknames[ph] !== undefined) {
			return self.nicknames[ph];
		} else if (ph === args.me().id){
			return args.me().nickname;
		} else {
			return null;
		}
	}

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
		return message.from === args.me().id;
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
		self.conversations = value.groupings;
		self.nicknames = value.nicknames;

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
			self.message('');
		}
	};

	self.send = function () {
		self.working(true);
		self.to = filter(self.to, function (item) {
			return item !== '' && item !== ' ' && item !== null;
		});
		m.request({method: 'POST', config: withAuth, background: false, url: '/api/messages', data: {to: self.to, text: self.message()}})
		.then(function () {
			self.message('');
			self.working(true);
		})
		.then(self.refresh, self.error)
	};

	self.getMessages = function () {
		m.request({method: 'GET', config: withAuth, url: '/api/messages?group=' + encodeURIComponent(JSON.stringify(self.to))})
		.then(self.setMessages, self.error)
	};

	self.refresh = self.getConversations = function () {
		self.working(true);
		m.request({method: 'GET', config: withAuth, background: false, url: '/api/conversations'})
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
		.done(function () {
			self.working(false);
			m.endComputation();
		});
	};

	self.clearMessages = function () {
		self.working(true);
		m.request({method: 'DELETE', config: withAuth, background: false, url: '/api/messages'})
		.then(self.refresh, self.error)
	};

	self.delete = function (message) {
		self.working(true);
		m.request({method: 'DELETE', config: withAuth, background: false, url: '/api/messages/' + encodeURIComponent(message.id)})
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
		return message.from === args.me().id;
	}

	function groupMessage(message) {
		return !fromMe(message) && message.to.length && message.to.length > 1;
	}

	function simplify(group) {
		var ret = without(flatten(group), args.me().id);
		if (ret.length === 0)
			ret = [args.me().id];
		return ret;
	}

	var bbuttonify = function (obj) {
		if (!obj) obj = {};
		obj.disabled = ctrl.working() || !args.me().id;

	    return merge(obj, {
	    	class: "btn btn-default btn-lg btn-primary"
	    });
	};

	var buttonify = function (obj) {
		if (!obj) obj = {};
		obj.disabled = ctrl.working() || !args.me().id;

		return merge(obj, {
	    	class: "btn btn-default"
	    });

	};

	function displayMessage(message) {
		return m('div', {
			key: message.id,
			config: fadesIn
		},

		[m('div',
			[m('span', 'From: '),
				m('b', fromMe(message)? (args.me().nickname ? args.me().nickname : 'me') : message.from + (ctrl.getNickname(message.from) ? ' (' + ctrl.getNickname(message.from) + ')' : '')),
				m('i', ' ' + moment(message.date).fromNow())
			]),
			m('div', m.trust(autolinker.link(message.text))),
			m('br'),
			m('button', buttonify({
				onclick: fadesOut(ctrl.delete.bind(this, message))
			}), 'X'),
			m('hr')
		]
		)
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
			m('button', buttonify({onclick: ctrl.refresh}), 'Refresh messages!'),
			' ',
			m('button', bbuttonify({onclick: ctrl.send}), 'Send!')
		]),
		// m('button', buttonify({onclick: ctrl.clearMessages}), 'Delete all messages!'),
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
					return m('div', ph + (ctrl.getNickname(ph) ? ' (' + ctrl.getNickname(ph) + ')' :''))
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
