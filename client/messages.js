"use strict";
var moment = require('moment');
var m = require('mithril');
var Autolinker = require('autolinker');
var autolinker = new Autolinker();
var styler = require('./styler');
var Error = require('./error');
var Velocity = require('velocity-animate');
var request = require('request');
var oboe = require('oboe');
var flatten = require('lodash/array/flatten');
var uniq = require('lodash/array/uniq');
var without = require('lodash/array/without');
var difference = require('lodash/array/difference');
var isEqual = require('lodash/lang/isEqual');

module.exports.controller = function (args, extras) {
	var self = this;

	self.messages = [];
	self.to = [''];
	self.message = m.prop('');
	self.error = Error.ErrorHolder();

	self.selectedGroup = (function () {
		var myGroup = null;

		return function (group) {
			if (group) {
				myGroup = flatten(group);
			} else if (group === null) {
				myGroup = null;
			} else {
				return myGroup;
			}
		}
	})();

	self.selectFirstGroup = function () {
		if (self.selectedGroup() === null) {
			self.selectedGroup(self.messages[0].group);
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

	function setMessages(value) {
		immediate(function () {
			self.messages = value;
			self.selectFirstGroup();
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

	self.refresh = function () {
		//self.selectedGroup(null);
		self.getBros();
	};

	self.getBros = function () {
		m.request({method: 'GET', url: '/api/bro'})
		.then(setMessages, self.error)
	};

	//self.getBrosStreaming = function () {
	//	// Stream in first 10 messages and try to render them ASAP as we load the rest
	//	var count = 0;
	//	var show = 9;
	//
	//	request({url: location.protocol + "//" + location.host + '/api/bro'})
	//	.pipe(JSONStream.parse('*'))
	//	.pipe(es.mapSync(function (data) {
	//		if (count == 0) {
	//			m.startComputation();
	//		}
	//
	//		if (count < show) {
	//			self.messages.push(data);
	//			count++;
	//		} else if (count == show) {
	//			self.messages.push(data);
	//			m.endComputation();
	//			m.startComputation();
	//			count++;
	//		} else {
	//			self.messages.push(data);
	//		}
	//	}))
	//	.on('end', function () {
	//		if (count == show + 1) {
	//			m.endComputation();
	//		} else if (count > show + 1) {
	//			throw new Error('program error');
	//		} else if (count < show ) {
	//			m.endComputation();
	//		}
	//	})
	//};


	self.getBrosStreaming = function () {
		// Stream in first 10 messages and try to render them ASAP as we load the rest
		var count = 0;
		var show = 9;

		m.startComputation();
		oboe('/api/bro').node('![*]', function (item) {
			self.messages.push(item);
			count++;
			if (count == show) {
				m.endComputation();
				m.startComputation();
			}
		})
		.done(m.endComputation);
	};

	self.clearBros = function () {
		m.request({method: 'DELETE', url: '/api/bro'})
		.then(self.getBros, self.error)
	};

	self.delete = function (message) {
		m.request({method: 'DELETE', url: '/api/bro/' + encodeURIComponent(message.id)})
		.then(self.getBros, self.error)

		// this dont work anymore with grouping of msgs
		//.then(immediate(function () {
		//	self.messages.splice(self.messages.indexOf(message), 1);
		//}), self.error)
	};

	immediate(self.refresh);
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

	function replyTo(message) {
		return styler.pointer({
			onclick: function (e) {
				ctrl.replyTo(message)
			}
		})
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
		}, [m('span', replyTo(message), 'From: '),
			m('b', replyTo(message), message.from),
			m('i', ' ' + moment(message.date).fromNow()),
			m('br'),
			m('span', 'To: ' + message.to.join(', ')),
			m('br'),
			m('span', m.trust(autolinker.link(message.text))),
			m('br'),
			m('button', buttonify({
				onclick: fadesOut(ctrl.delete.bind(this, message))
			}), 'X'),
			m('hr')
		])
	}

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
		m('button', buttonify({onclick: ctrl.refresh, disabled: args.noauth()}), 'Refresh messages!'),
		m('button', buttonify({onclick: ctrl.clearBros, disabled: args.noauth()}), 'Delete all messages!'),
		m('div', [m('div.col-sm-4#left',
		[m('h3', 'Conversations'),
			ctrl.messages.map(function (grouping) {
				//console.log('Selected group');
				//console.log(ctrl.selectedGroup());
				//console.log('Grouping group');
				//console.log(grouping.group);

				return m('div', styler.pointer({
					onclick: function () {
						ctrl.selectedGroup(grouping.group)
					},
					class: isEqual(flatten(grouping.group), ctrl.selectedGroup()) ? 'bg-info' : null
				}),
				[simplify(grouping.group).map(function (ph) {
					return m('div', ph)
				}),
					m('hr')
				])
			})]),
			m('div.col-sm-8#right', [m('h3', 'Messages'),
				ctrl.messages.filter(function (grouping) {
					return isEqual(flatten(grouping.group), ctrl.selectedGroup());
				}).map(function (grouping) {
					return grouping.reduction.map(displayMessage)
				})])
		])
	])
};
