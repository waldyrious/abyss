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

var mountedDragAndDrop = false;

module.exports.controller = function(args, extras) {
	// m.redraw.strategy("all")

	var self = this;
	self.working = (function () {
		var working = false;
		return function (bool, delay) {
			if (working !== bool) {
				if (bool) {
					spinner.spin(delay);
				} else {
					spinner.stop();
				}
				working = bool;
			}
		}
	})();

	window.addEventListener('message', receiveMessage);
	window.addEventListener('paste', handlePaste);

	function dragdrop(element, options) {
	    options = options || {}

	    element.addEventListener("dragover", activate)
	    element.addEventListener("dragleave", deactivate)
	    element.addEventListener("dragend", deactivate)
	    element.addEventListener("drop", deactivate)
	    element.addEventListener("drop", update)

	    function activate(e) {
	        e.preventDefault()
	    }
	    function deactivate() {}
	    function update(e) {
	        e.preventDefault()
	        if (typeof options.onchange == "function") {
	            options.onchange((e.dataTransfer || e.target).files)
	        }
	    }
	}

	if (!mountedDragAndDrop) {
		dragdrop(document.getElementsByTagName('body')[0], {
			onchange: function(files) {
				fileuploader.uploadFile(files);
			}
		});
		mountedDragAndDrop = true;
	}

	function receiveMessage(messageEvent) {
		console.log('Received window message: ')
		console.log(messageEvent);
		if (messageEvent.data === 'notificationclick') {
			self.refresh();
		}
	}

	function handlePaste (ev) {
		if (ev.clipboardData && ev.clipboardData.items && ev.clipboardData.items.length > 0) {
			var items = ev.clipboardData.items;
			fileuploader.uploadFile(items);
		}
	}

	self.onunload = function () {
		window.removeEventListener('message', receiveMessage);
		window.removeEventListener('paste', handlePaste);
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
	self.toggleSmallImages = function (id) {
		self.smallImages(!self.smallImages());

		if (id) {
			setImmediate(function () {
				// setImmediate - allow for layout to occur.
				document.getElementById(id).scrollIntoView();
			})
		}
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
		self.page(0);
		self.per_page(Infinity);
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
		m.route('/conversations');
		// self.to = [''];
		// self.reselectGroup();
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
	};

	self.toMinus = function(index) {
		self.to.splice(index, 1);
		self.reselectGroup();
	};

	self.send = function() {
		self.working(true, 0);
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
			})
			.then(self.refresh, self.error)
			.then(function () {
				self.working(false);
			})
	};

	self.getMessages = function() {
		self.working(true);
		m.request({
				method: 'GET',
				config: identity.withAuth,
				url: getMessagesUrl()
			})
			.then(function (response) {
				return response;
			})
			.then(self.setMessages, self.error)
			.then(function () {
				self.working(false);
			})
	};


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
	self.getMessagesStreaming = self.getMessages // quick uncommentable to disable streaming messages


	self.refresh = self.getConversations = function() {
		self.working(true, 0);
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
			.then(function () {
				self.working(false);
			})

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

	var lastTimeDisplayed = null;

	function displayMessageWithFile(message) {

		if (!message.file) return;

		var file = message.file;

		if (file.type.indexOf('image') > -1) {
			return m('img', {
				id: message.id,
				src: '/api/file/' + encodeURIComponent(message.id),
				onclick: m.withAttr('id', ctrl.toggleSmallImages),
				style: ctrl.smallImages() ? {
					'object-fit': 'contain',
					'max-width': '70%',
					'max-height': '70%',
					'cursor': 'zoom-in'
				} : {
					'object-fit': 'contain',
					'max-width': '100%',
					'max-height': '100%',
					'cursor': 'zoom-out'
				}
			})
		} else if (file.type.indexOf('video') > -1) {
			return [
				m('a', {
					'href': '/api/file/' + encodeURIComponent(message.id)
				}, message.file.name),
				' ',
				m('video', {
				src: '/api/file/' + encodeURIComponent(message.id),
				style: {
					'max-width': '100%',
					'max-height': '100%'
				},
				preload: 'none',
				controls: true
			})]
		} else if (file.type.indexOf('audio') > -1) {
			return [
				m('a', {
					'href': '/api/file/' + encodeURIComponent(message.id)
				}, message.file.name),
				' ',
				m('audio', {
				src: '/api/file/' + encodeURIComponent(message.id),
				preload: 'none',
				controls: true
			})]
		} else {
			return m('a', {
				href: '/api/file/' + encodeURIComponent(message.id),
			}, file.name)
		}
	}

	function displayMessage(message) {

		var fromNow = moment(message.date).fromNow();

		if (!message.text) {
			message.text = '';
		}

		var retval = m('div', {
				key: message.id,
				config: fadesIn
			},

			[
				m('div', {
					style: {
						'text-align': 'center',
						'display': lastTimeDisplayed === fromNow ? 'none' : 'inherit',
						'font-style': 'italic',
						'line-height': '400%',
						'font-size': '90%'
					}
				}, fromNow),

				ctrl.editMode() ? m('button.btn btn-danger glyphicon glyphicon-fire', {
					onclick: fadesOut(ctrl.delete.bind(this, message)),
					style: {
						'margin-right': '0.5em',
						'margin-top': '0.5em'
					}
				}) : null,

				// m('i', ' ' + moment(message.date).fromNow()),
				// ' ',
				m('b', fromMe(message) ? (identity.me().nickname ? identity.me().nickname : 'me') : message.from + (ctrl.getNickname(message.from) ? ' ' + ctrl.getNickname(message.from) : '')),
				': ',

				message.file ? displayMessageWithFile(message) :
					m.trust(autolinker.link(html.escape(message.text)).replace(/(?:\r\n|\r|\n)/g, '<br/>'))
			]
		)

		if (lastTimeDisplayed !== fromNow) {
			lastTimeDisplayed = fromNow;
		}
		return retval;
	}

	return m('div', [
		error.renderError(ctrl.error),
		// m('button', buttonify({onclick: ctrl.clearMessages}), 'Delete all messages!'),
		[m('div.col-sm-3#left', [//m('h3', 'Conversations'),
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
			m('div.col-sm-9#right', [
				m('div', {
				// config: fadesIn,
				style: {
					'margin-bottom': '1em'
				}
			}, //'Messages ',

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
					ctrl.to.map(function(item, index) {
						return m('span.nowrap', m('input', {
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
						}),
						m('button.btn btn-default btn-default', {
							index: index,
							style: {
								'border-radius': '10em',
								margin: '1px',
								position: 'relative',
								right: '1em'
							},
							onclick: m.withAttr('index', ctrl.toMinus)
						}, '✗'))
					}),
					' ',
					m('button.btn btn-default btn-success glyphicon glyphicon-plus', {
						style: {
							'border-radius': '10em',
							margin: '1px'
							// position: 'relative',
							// left: '1em'
						},
						onclick: ctrl.toPlus
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
					m('button.btn btn-success glyphicon glyphicon-comment', {
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
				m('div.hoveropaque btn-group', {
						style: {
							position: 'fixed',
							bottom: '10px',
							right: '2px'
						}
				},[
				m('a.leftanchor btn btn-default glyphicon glyphicon-th-list', {
					href: '#left'
				}),
				m('a.rightanchor btn btn-default glyphicon glyphicon-envelope', {
					href: '#right'
				}),
				m('button.btn btn-default glyphicon glyphicon-arrow-left', {
					onclick: ctrl.previousPage,
					disabled: ctrl.page() === 0 || ctrl.per_page() === Infinity,
					style: {
						'margin-right': '1em',
						display: ctrl.per_page() === Infinity ? 'none' : 'initial'
					}
				}),
				// m('span', ctrl.per_page() === Infinity ? '' : 'Page ' + (ctrl.page()+1) + ' '),
				m('button.btn btn-default glyphicon glyphicon-arrow-right', {
					onclick: ctrl.nextPage,
					disabled:  ctrl.per_page() === Infinity || ctrl.messages.length === 0 || ctrl.messages.length < ctrl.per_page(),
					style: {
						'margin-right': '1em',
						display: ctrl.per_page() === Infinity ? 'none' : 'initial'
					}
				}),
				m('button.btn btn-default glyphicon glyphicon-arrow-down', {
					onclick: ctrl.allPages,
					style: {
						'margin-right': '1em',
						display: ctrl.per_page() === Infinity ? 'none' : 'initial'
					}
				})
				])

			])
		]
	])

};
