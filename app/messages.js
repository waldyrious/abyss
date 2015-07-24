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
var identity = require('./identity');

module.exports.controller = function(args, extras) {
	// m.redraw.strategy("all")

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

	window.addEventListener('message', receiveMessage);

	function receiveMessage(messageEvent) {
		console.log('Received window message: ')
		console.log(messageEvent);
		if (messageEvent.data === 'notificationclick') {
			self.refresh();
		}
	}

	self.onunload = function () {
		window.removeEventListener('message', receiveMessage);
	}

	self.messages = [];
	self.conversations = [];
	self.nicknames = {};
	self.to = [];
	self.message = m.prop('');
	self.error = error.ErrorHolder();

	self.editMode = m.prop(false);

	self.page = m.prop(0);
	self.per_page = m.prop(50);

	self.smallImages = m.prop(true);
	self.toggleSmallImages = function () {
		self.smallImages(!self.smallImages());
	}

	self.nextPage = function () {
		self.page(self.page() + 1);
		self.getMessagesStreaming()
	}

	self.previousPage = function () {
		if (self.page() !== 0) {
			self.page(self.page() - 1);
			self.getMessagesStreaming()
		}
	}

	self.allPages = function () {
		self.page(null);
		self.getMessagesStreaming()
	}

	self.toggleEditMode = function() {
		if (self.editMode()) {
			self.refresh();
		}
		self.editMode(!self.editMode());
	}

	self.getNickname = function(ph) {
		if (self.nicknames[ph] !== undefined) {
			return self.nicknames[ph];
		} else if (ph === identity.me().id) {
			return identity.me().nickname;
		} else {
			return null;
		}
	}

	self.selectGroup = function(group) {
		m.route('/conversations?' + m.route.buildQueryString({
			to: group
		}));
		return;
		self.page(0);
		self.to = clone(group);
		self.refresh();
	};

	self.newMessage = function () {
		self.to = [''];
		self.reselectGroup();
	}

	self.reselectGroup = function() {
		self.getMessagesStreaming();
	};

	self.selectFirstGroup = function() {
		return; // disable for now, might be nicer from a UI perspe
		if (isEqual(self.to, ['']) && self.conversations[0]) {
			self.page(0);
			self.to = clone(self.conversations[0].group);
			self.getMessagesStreaming();
		}
	};

	function fromMe(message) {
		return message.from === identity.me().id;
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

		if (self.to.length === -1) {
			self.to.push('');
			self.message('');
		}
		self.reselectGroup();
	};

	self.send = function() {
		self.working(true);
		m.request({
				method: 'POST',
				config: identity.withAuth,
				background: false,
				url: getMessagesUrl(),
				data: {
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
				config: identity.withAuth,
				url: getMessagesUrl()
			})
			.then(function (response) {
				self.working(false);
				return response;
			})
			.then(self.setMessages, self.error)

	};

	self.refresh = self.getConversations = function() {
		self.working(true);
		return m.request({
				method: 'GET',
				config: identity.withAuth,
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

	function getMessagesUrl() {
		self.to = filter(self.to, function(item) {
			return item !== '' && item !== ' ' && item !== null;
		});
		 return '/api/messages?' + m.route.buildQueryString({
			to: self.to,
			page: self.page(),
			'per_page': self.per_page()
		});
	}

	self.getMessagesStreaming = function() {
		// Stream in first 10 messages and try to render them ASAP, then we load the rest
		var count = 0;
		var show = 9;

		m.startComputation();
		self.working(true);
		self.messages = [];
		oboe({
				url: getMessagesUrl(),
				headers: identity.oboeAuth()
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
	// self.getMessagesStreaming = self.getMessages // quick uncommentable to disable streaming messages

	self.clearMessages = function() {
		self.working(true);
		m.request({
				method: 'DELETE',
				config: identity.withAuth,
				background: false,
				url: '/api/messages?group=' + encodeURIComponent(JSON.stringify(self.to))
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
				config: identity.withAuth,
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

	if (m.route.param('to')) {
		var to = m.route.param('to');
		if (typeof to === 'string')
		 	to = [to];

		if (to && !isEqual(to, self.to)) {
			self.to = to;
			self.reselectGroup();
		}
	}

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
		return message.from === identity.me().id;
	}

	function groupMessage(message) {
		return !fromMe(message) && message.to.length && message.to.length > 1;
	}

	function simplify(group) {
		var ret = without(flatten(group), identity.me().id);
		if (ret.length === 0)
			ret = [identity.me().id];
		return ret;
	}

	function displayMessageWithFile(message) {

		if (!message.file) return;

		var file = message.file;

		if (file.type.indexOf('image') > -1) {
			return m('img', {
				src: '/api/file/' + encodeURIComponent(message.id),
				onclick: ctrl.toggleSmallImages,
				style: ctrl.smallImages() ? {
					'object-fit': 'contain',
					'max-width': '50%',
					'max-height': '50%',
					'cursor': 'zoom-in'
				} : {
					'object-fit': 'contain',
					'max-width': '100%',
					'max-height': '100%',
					'cursor': 'zoom-out'
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
				m('b', fromMe(message) ? (identity.me().nickname ? identity.me().nickname : 'me') : message.from + (ctrl.getNickname(message.from) ? ' ' + ctrl.getNickname(message.from) : '')),
				': ',

				message.file ? displayMessageWithFile(message) :
					m.trust(autolinker.link(html.escape(message.text)).replace(/(?:\r\n|\r|\n)/g, '<br/>'))
			]
		)
	}

	return m('div', [
		error.renderError(ctrl.error),
		// m('button', buttonify({onclick: ctrl.clearMessages}), 'Delete all messages!'),
		[m('div.col-sm-3#left', [m('h3', 'Conversations'),
				ctrl.conversations.map(function(grouping) {
					return [m('button.btn ', {
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
					})]),
					m('br')]
				})
			]),
			m('div.col-sm-9#right', [m('h3', {
				config: fadesIn
			}, 'Messages ',

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
					}, ' Send message'),

					m('br'),m('br'),
					m('label', 'Upload Files: '), m('br'),

					m.component(fileuploader, {
						to: ctrl.to,
						refresh: ctrl.refresh,
						getMessagesStreaming: ctrl.getMessagesStreaming
					})
				),
				ctrl.messages.map(displayMessage),
				m('button.btn btn-default glyphicon glyphicon-triangle-left', {
					onclick: ctrl.previousPage,
					style: {
						'margin-right': '1em'
					}
				}, ' Previous Page'),
				m('button.btn btn-default glyphicon glyphicon-triangle-right', {
					onclick: ctrl.nextPage,
					style: {
						'margin-right': '1em'
					}
				}, ' Next Page'),
				m('button.btn btn-default glyphicon glyphicon-triangle-bottom', {
					onclick: ctrl.allPages,
					style: {
						'margin-right': '1em'
					}
				}, ' View All'),

			])
		]
	])
};
