'use strict';
var moment = require('moment');
var m = require('mithril');

// auto convert links to HTML tags
var Autolinker = require('autolinker');
var autolinker = new Autolinker();
var Velocity = require('velocity-animate');

// streaming JSON library
var oboe = require('oboe');

// lodash modules
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
var html = require('html-escaper');

// my custom mithril components
var error = require('./error');
var fileuploader = require('./fileuploader');

// spinner
var spinner = require('./spinner');


module.exports.controller = function(args, extras) {
	var self = this;
	self.working = (function () {
		var working = false;
		return function (bool) {
			if (working !== bool) {
				if (bool) {
					spinner.spin();
				} else {
					spinner.stop();
				}
				working = bool;
			}
		}
	})();

	self.messages = [];
	self.conversations = [];
	self.nicknames = {};
	self.to = [''];
	self.message = m.prop('');
	self.error = error.ErrorHolder();

	self.editMode = m.prop(false);

	self.toggleEditMode = function() {
		if (self.editMode()) {
			self.refresh();
		}
		self.editMode(!self.editMode());
	}

	// adds JWT to XHR
	var withAuth = function(xhr) {
		if (args.jwt()) {
			xhr.setRequestHeader('Authorization', 'Bearer ' + args.jwt());
		}
		return xhr;
	}

	// used to add Auth header to Oboe requests
	var oboeAuth = function() {
		return {
			'Authorization': 'Bearer ' + args.jwt()
		}
	}

	self.getNickname = function(ph) {
		if (self.nicknames[ph] !== undefined) {
			return self.nicknames[ph];
		} else if (ph === args.me().id) {
			return args.me().nickname;
		} else {
			return null;
		}
	}

	self.selectGroup = function(group) {
		self.to = clone(group);
		self.getMessagesStreaming();
	};

	self.newMessage = function () {
		self.to = [''];
	}

	self.reselectGroup = function() {
		self.getMessagesStreaming();
	};

	self.selectFirstGroup = function() {
		return; // disable for now, might be nicer from a UI perspe
		if (isEqual(self.to, ['']) && self.conversations[0]) {
			self.to = clone(self.conversations[0].group);
			self.getMessagesStreaming();
		}
	};

	function fromMe(message) {
		return message.from === args.me().id;
	}

	// run a function with setImmediate, then tell mithril to redraw. maybe it should just use m.redraw()
	function immediate(fn) {
		m.startComputation();
		setImmediate(function() {
			fn();
			m.endComputation();
		});
	}

	self.setMessages = function(value) {
		self.messages = value;
	}

	self.setConversations = function(value) {
		self.conversations = value.groupings;
		self.nicknames = value.nicknames;

		immediate(self.selectFirstGroup);
	}

	function multiTo(message) {
		return !fromMe(message) && message.to.length && message.to.length > 1;
	}

	self.toPlus = function() {
		self.to.push('');
		self.reselectGroup();
	};

	self.toMinus = function() {
		self.to.pop();

		if (self.to.length === 0) {
			self.to.push('');
			self.message('');
		}
		self.reselectGroup();
	};

	self.send = function() {
		self.working(true);
		self.to = filter(self.to, function(item) {
			return item !== '' && item !== ' ' && item !== null;
		});
		m.request({
				method: 'POST',
				config: withAuth,
				background: false,
				url: '/api/messages',
				data: {
					to: self.to,
					text: self.message()
				}
			})
			.then(function() {
				self.message('');
				self.working(false);
			})
			.then(self.refresh, self.error)
	};

	self.getMessages = function() {
		self.working(true);
		m.request({
				method: 'GET',
				config: withAuth,
				url: '/api/messages?group=' + encodeURIComponent(JSON.stringify(self.to))
			})
			.then(function (response) {
				self.working(false);
				return response;
			})
			.then(self.setMessages, self.error)

	};

	self.refresh = self.getConversations = function() {
		self.working(true);
		m.request({
				method: 'GET',
				config: withAuth,
				background: false,
				url: '/api/conversations'
			})
			.then(function (result) {
				self.working(false);
				return result;
			})
			.then(self.setConversations, self.error)
			.then(self.getMessagesStreaming, self.error)

	};

	self.getMessagesStreaming = function() {
		// Stream in first 10 messages and try to render them ASAP, then we load the rest
		var count = 0;
		var show = 9;

		m.startComputation();
		self.working(true);
		self.messages = [];
		oboe({
				url: '/api/messages?group=' + encodeURIComponent(JSON.stringify(self.to)),
				headers: oboeAuth()
			}).node('![*]', function(item) {
				self.messages.push(item);
				count++;
				if (count == show) {
					m.endComputation();
					m.startComputation();
				}
				return oboe.drop;
			})
			.done(function() {
				self.working(false);
				m.endComputation();
			});
	};

	self.clearMessages = function() {
		self.working(true);
		m.request({
				method: 'DELETE',
				config: withAuth,
				background: false,
				url: '/api/messages'
			})
			.then(self.refresh, self.error)
			.then(function () {
				self.working(false);
			})
	};

	self.delete = function(message) {
		self.working(true);
		m.request({
				method: 'DELETE',
				config: withAuth,
				background: false,
				url: '/api/messages/' + encodeURIComponent(message.id)
			})
			.then(function () {
				self.working(false);
			})
			// .then(function () {
			// 	self.messages.splice(self.messages.indexOf(message), 1);
			// }, self.error);
			// .then(self.refresh, self.error)
	};

	self.refresh();
};

module.exports.view = function(ctrl, args, extras) {

	var sendButton;
	var textInputArea;

	function withKey(key, callback) {
		return function(e) {
			if (key == e.keyCode && e.ctrlKey) callback(key);
			else m.redraw.strategy("none"); // don't do a redraw, the default is to redraw in event listeners.
		}
	}

	function clickSend(key) {
		sendButton.focus();
		sendButton.click();
		setImmediate(function() {
			sendButton.blur();
			textInputArea.focus();
			m.redraw();
		});
	}

	function sendButtonConfig(element, isInitialized) {
		sendButton = element;
	}

	function textInputAreaConfig(element, isInitialized) {
		textInputArea = element;
	}

	var fadesIn = function(element, isInitialized, context) {
		if (!isInitialized) {
			element.style.opacity = 0;
			Velocity(element, {
				opacity: 1
			})
		}
	};

	var fadesOut = function(callback) {
		return function(e) {
			//don't redraw yet
			m.redraw.strategy("none");

			Velocity(e.target.parentNode, {
				opacity: 0
			}, {
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

	function displayMessageWithFile(message) {

		if (!message.file) return;

		var file = message.file;

		if (file.type.indexOf('image') > -1) {
			return m('img', {
				src: '/api/file/' + encodeURIComponent(message.id),
				style: {
					'max-width': '100%',
					'max-height': '100%'
				}
			})
		} else if (file.type.indexOf('video') > -1) {
			return m('video', {
				src: '/api/file/' + encodeURIComponent(message.id),
				style: {
					'max-width': '100%',
					'max-height': '100%'
				},
				preload: 'none',
				controls: true
			})
		} else if (file.type.indexOf('audio') > -1) {
			return m('audio', {
				src: '/api/file/' + encodeURIComponent(message.id),
				preload: 'none',
				controls: true
			})
		} else {
			return m('a', {
				href: '/api/file/' + encodeURIComponent(message.id),
			}, file.name)
		}
	}

	function displayMessage(message) {

		if (!message.text) {
			message.text = '';
		}

		return m('div', {
				key: message.id,
				config: fadesIn
			},

			[
				ctrl.editMode() ? m('button.btn btn-default glyphicon glyphicon-erase', {
					onclick: fadesOut(ctrl.delete.bind(this, message))
				}) : null,

				m('i', ' ' + moment(message.date).fromNow()),
				' ',
				m('b', fromMe(message) ? (args.me().nickname ? args.me().nickname : 'me') : message.from + (ctrl.getNickname(message.from) ? ' ' + ctrl.getNickname(message.from) : '')),
				': ',

				message.file ? displayMessageWithFile(message) :
					m.trust(autolinker.link(html.escape(message.text)).replace(/(?:\r\n|\r|\n)/g, '<br/>'))
			]
		)
	}

	return m('div', {
		config: fadesIn
	}, [
		error.renderError(ctrl.error),
		// m('button', buttonify({onclick: ctrl.clearMessages}), 'Delete all messages!'),
		[m('div.col-sm-3#left', [m('h3', 'Conversations'),
				ctrl.conversations.map(function(grouping) {
					return m('button.btn ', {
						style: {
							'border-radius': '1em',
							cursor: 'pointer',
							margin: '4px'
						},
						onclick: function() {
							ctrl.selectGroup(grouping.group)
						},
						class: isEqual(flatten(grouping.group), ctrl.to) ? 'btn-success' : 'btn-default'
					}, [simplify(grouping.group).map(function(ph) {
						return m('div', ph + (ctrl.getNickname(ph) ? ' ' + ctrl.getNickname(ph) : ''))
					}), ])
				})
			]),
			m('div.col-sm-9#right', [m('h3', 'Messages ',

				m('.input-group',
					m('button.btn btn-default glyphicon glyphicon-refresh', {
						onclick: ctrl.refresh
					}, ' Refresh'),
					m('button.btn btn-default glyphicon glyphicon-envelope', {
						onclick: ctrl.newMessage,
					}, ' New Message'),
					m('button.btn btn-default glyphicon glyphicon-edit', {
						onclick: ctrl.toggleEditMode,
					}, ctrl.editMode() ? ' Done' : ' Show Actions')
				)),

				m('div', [
					m('label', 'To: '), m('span', ' '),
					m('button.btn btn-default', {
						style: {
							'border-radius': '1em',
							margin: '1px'
						},
						onclick: ctrl.toPlus
					}, '+'),
					m('button.btn btn-default', {
						style: {
							'border-radius': '1em',
							margin: '1px'
						},
						onclick: ctrl.toMinus
					}, '-'),
					m('br'),
					ctrl.to.map(function(item, index) {
						return m('input', {
							style: {
								margin: '2px',
								padding: '4px'
							},
							placeholder: 'Phone number...',
							type: 'tel',
							onchange: m.withAttr('value', function(value) {
								ctrl.to[index] = value
							}),
							value: ctrl.to[index]
						})
					}),
					m('br'),
				]),

				m('div.form-group', m('label', 'New Message: '), m('br'),
					m('textarea.form-control', {
						rows: 2,
						placeholder: 'Message Text...\nControl + Enter sends.',
						onchange: m.withAttr('value', function(value) {
							// debugger
							ctrl.message(value);
						}),
						onkeyup: withKey(13, clickSend),
						config: textInputAreaConfig,
						value: ctrl.message()
					}),
					m('button.btn btn-success glyphicon glyphicon-send', {
						onclick: ctrl.send,
						config: sendButtonConfig,
						style: {
							'margin-right': '1em'
						}
					}, ' Send'),

					m.component(fileuploader, {
						jwt: args.jwt,
						to: ctrl.to,
						refresh: ctrl.refresh,
						getMessagesStreaming: ctrl.getMessagesStreaming
					})
				),
				ctrl.messages.map(displayMessage)
			])
		]
	])
};
