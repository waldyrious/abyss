'use strict';
var Promise = require('bluebird');
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
var _ = require('lodash');

// my custom mithril components
var error = require('./error');
var fileuploader = require('./fileuploader');

var resize = require('./resize');

// spinner
var spinner = require('./spinner');
var identity = require('./identity');

var mountedDragAndDrop = false;

var conversations = null;
var nicknames = {};

module.exports.controller = function(args, extras) {
	// m.redraw.strategy("all")
	resize.resize();

	var ctrl = this;
	ctrl.working = (function() {
		var working = false;
		return function(bool, delay) {
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
			ctrl.refresh();
		}
	}

	function handlePaste(ev) {
		if (ev.clipboardData && ev.clipboardData.items && ev.clipboardData.items.length > 0) {
			var items = ev.clipboardData.items;
			var hasImage = false;
			_.map(items, function(item) {
				if (item.type.startsWith('image')) {
					hasImage = true;
				}
			})
			if (hasImage) {
				fileuploader.uploadFile(items);
			}
		}
	}


	var io = require('socket.io-client')
	var socket = io();

	socket.on('changes', handleChange);

	function handleChange(msg) {
		console.log(msg);

		msg = JSON.parse(msg);
		var group;

		// {"new_val":{"date":"2015-08-20T01:15:04.881Z","from":"5558675309","id":"8582e043-0663-4775-be6a-778b340730d8","text":"","to":["5558675309"]},"old_val":null}
		if (msg.new_val && msg.old_val === null) { // new message!
			msg = msg.new_val;
			group = _.without(_.union(msg.to, [msg.from]), identity.me().id);
			if (_.isEqual(group, ctrl.to)) {
				console.log('new messsage in current conversation');
				ctrl.messages.unshift(msg);
				var convo_index = _.findIndex(conversations, function(item) {
					return _.isEqual(item.group, group);
				})
				var convo = conversations[convo_index];
				convo.last = msg.date;
				conversations.splice(convo_index, 1)
				conversations.unshift(convo);

				if (convo_index !== 0) {
					ctrl.refresh(true);
				}
				m.redraw();
			} else {
				console.log('dunno, just gonna refresh')
				ctrl.refresh(true);
			}
		} else if (msg.new_val === null && msg.old_val) { // message deleted!
			msg = msg.old_val;
			group = _.without(_.union(msg.to, [msg.from]), identity.me().id);
			if (_.isEqual(group, ctrl.to)) {
				console.log('deleted messsage in current conversation' + msg.id);
				ctrl.messages = _.reject(ctrl.messages, function(message) {
						return message.id === msg.id;
					})
					// ctrl.messages.splice(ctrl.messages.indexOf(msg), 1);
				m.redraw();
			} else {
				console.log('dunno, just gonna refresh')
				ctrl.refresh(true);
			}
		} else {
			console.log('dunno, just gonna refresh')
			ctrl.refresh(true);
		}
	}

	ctrl.onunload = function() {
		socket.off('changes', handleChange);
		window.removeEventListener('message', receiveMessage);
		window.removeEventListener('paste', handlePaste);
	}

	ctrl.messages = [];
	ctrl.to = [];
	ctrl.message = m.prop('');
	ctrl.error = error.ErrorHolder();

	ctrl.editMode = m.prop(false);

	ctrl.page = m.prop(0);
	ctrl.per_page = m.prop(50);

	ctrl.smallImages = m.prop(true);
	ctrl.toggleSmallImages = function(id) {
		ctrl.smallImages(!ctrl.smallImages());

		if (id) {
			setImmediate(function() {
				// setImmediate - allow for layout to occur.
				document.getElementById(id).scrollIntoView();
			})
		}
	}

	ctrl.nextPage = function() {
		ctrl.page(ctrl.page() + 1);
		ctrl.getMessagesStreaming()
	}

	ctrl.previousPage = function() {
		if (ctrl.page() !== 0) {
			ctrl.page(ctrl.page() - 1);
			ctrl.getMessagesStreaming()
		}
	}

	ctrl.allPages = function() {
		ctrl.page(0);
		ctrl.per_page(Infinity);
		ctrl.getMessagesStreaming()
	}

	ctrl.toggleEditMode = function() {
		// if (ctrl.editMode()) {
		// 	ctrl.refresh();
		// }
		ctrl.editMode(!ctrl.editMode());
	}

	ctrl.getNickname = function(ph) {
		if (nicknames[ph] !== undefined) {
			return nicknames[ph];
		} else if (ph === identity.me().id) {
			return identity.me().nickname;
		} else {
			return '';
		}
	}

	ctrl.selectGroup = function(group) {
		m.route('/conversations?' + m.route.buildQueryString({
			to: group
		}));
		return;
		// ctrl.page(0);
		// ctrl.to = clone(group);
		// ctrl.refresh();
	};

	ctrl.newMessage = function() {
		m.route('/newmessage');
		// ctrl.to = [''];
		// ctrl.reselectGroup();
	}

	ctrl.reselectGroup = function() {
		ctrl.getMessagesStreaming();
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

	ctrl.setMessages = function(value) {
		ctrl.messages = value;
	}

	ctrl.setConversations = function(value) {
		conversations = value;
		value.map(function(item) {
			item.group.map(function(member, index) {
				nicknames[member] = item.details[index].nickname;
			})
		})
	}

	function multiTo(message) {
		return !fromMe(message) && message.to.length && message.to.length > 1;
	}

	ctrl.toPlus = function() {
		ctrl.to.push('');
		ctrl.messages = [];
	};

	ctrl.toMinus = function(index) {
		ctrl.to.splice(index, 1);
		ctrl.reselectGroup();
	};

	ctrl.send = function() {
		ctrl.working(true, 0);
		m.request({
				method: 'POST',
				config: identity.withAuth,
				background: false,
				url: getMessagesUrl(),
				data: {
					text: ctrl.message()
				}
			})
			.then(function() {
				ctrl.message('');
			})
			// .then(ctrl.refresh, ctrl.error)
			.then(function() {
				ctrl.working(false);
			})
	};

	ctrl.getMessages = function() {
		ctrl.working(true);

		var initial;
		if (ctrl.to.length === 1 && ctrl.to[0].trim() === '') {
			initial = Promise.resolve([])
		} else {
			initial =  m.request({
					method: 'GET',
					config: identity.withAuth,
					url: getMessagesUrl()
				})
		}

		return initial
			.then(ctrl.setMessages, ctrl.error)
			.then(function() {
				ctrl.working(false);
			})
	};


	ctrl.getMessagesStreaming = function() {
		// Stream in first 10 messages and try to render them ASAP, then we load the rest
		var count = 0;
		var show = 9;

		m.startComputation();
		ctrl.working(true);
		ctrl.messages = [];
		oboe({
				url: getMessagesUrl(),
				headers: identity.oboeAuth()
			}).node('![*]', function(item) {
				ctrl.messages.push(item);
				count++;
				if (count == show) {
					m.endComputation();
					m.startComputation();
				}
				return oboe.drop;
			})
			.done(function() {
				ctrl.working(false);
				m.endComputation();
			});
	};
	ctrl.getMessagesStreaming = ctrl.getMessages // quick uncommentable to disable streaming messages

	ctrl.refreshConversations = function(force) {
		if (conversations !== null && !force) {
			return Promise.resolve(conversations);
		}

		ctrl.working(true, 0);
		return m.request({
				method: 'GET',
				config: identity.withAuth,
				background: false,
				url: '/api/conversations'
			})
			.then(function(result) {
				ctrl.working(false);
				return result;
			})
			.then(ctrl.setConversations, ctrl.error)
	};

	ctrl.refresh = ctrl.getConversations = function(force) {
		return ctrl.refreshConversations(force)
			.then(ctrl.getMessagesStreaming, ctrl.error)
			.then(function() {
				ctrl.working(false);
			})

	};


	function getMessagesUrl() {
		ctrl.to = filter(ctrl.to, function(item) {
			return item !== '' && item !== ' ' && item !== null;
		});
		return '/api/messages?' + m.route.buildQueryString({
			to: ctrl.to,
			page: ctrl.page(),
			'per_page': ctrl.per_page()
		});
	}

	ctrl.clearMessages = function() {
		ctrl.working(true);
		m.request({
				method: 'DELETE',
				config: identity.withAuth,
				background: false,
				url: '/api/messages?group=' + encodeURIComponent(JSON.stringify(ctrl.to))
			})
			.then(ctrl.refresh, ctrl.error)
			.then(function() {
				ctrl.working(false);
			})
	};

	ctrl.delete = function(message) {
		ctrl.working(true);
		m.request({
				method: 'DELETE',
				config: identity.withAuth,
				background: false,
				url: '/api/messages/' + encodeURIComponent(message.id)
			})
			.then(function() {
				ctrl.working(false);
			})
			// .then(function () {
			// 	ctrl.messages.splice(ctrl.messages.indexOf(message), 1);
			// }, ctrl.error);
			// .then(ctrl.refresh, ctrl.error)
	};

	if (m.route.param('to')) {
		var to = m.route.param('to');
		if (typeof to === 'string')
			to = [to];

		if (to && !isEqual(to, ctrl.to)) {
			ctrl.to = to;
			// ctrl.reselectGroup();
		}
	}
	if (m.route() === '/newmessage') {
		ctrl.to = [''];
	}
	ctrl.refresh()
};

module.exports.view = function(ctrl, args, extras) {

	var sendButton;
	var textInputArea;

	function withKey(key, callback) {
		return function(e) {
			if (key == e.keyCode && !e.shiftKey) {
				e.preventDefault();
				callback(key);
			}
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
			new Velocity(element, {
				opacity: 1
			})
		}
	};

	var fadesOut = function(callback) {
		return function(e) {
			//don't redraw yet
			m.redraw.strategy("none");

			new Velocity(e.target.parentNode, {
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
	var lastConversationTimeDisplayed = null;


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
					'max-width': '50%',
					'max-height': '40em',
					'cursor': 'zoom-in'
				} : {
					'object-fit': 'contain',
					'max-width': '100%',
					'max-height': '80em',
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
				})
			]
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
				})
			]
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
				config: fadesIn,
				style: {
					"font-size": "1.15em",
					"margin-bottom": "1em"
				}
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

				ctrl.editMode() ? m('button.btn btn-default btn-lg glyphicon glyphicon-fire', {
					onclick: fadesOut(ctrl.delete.bind(this, message)),
					style: {
						'margin-right': '0.5em',
						'margin-top': '0.5em'
					}
				}) : null,

				// m('i', ' ' + moment(message.date).fromNow()),
				// ' ',
				m('b', {
					style: {
						opacity: "0.5"
					}
				}, fromMe(message) ? (identity.me().nickname ? identity.me().nickname : 'me') :(ctrl.getNickname(message.from) ? ctrl.getNickname(message.from) :  message.from)),
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

	return m('div#messages', [
		error.renderError(ctrl.error),
		// m('button', buttonify({onclick: ctrl.clearMessages}), 'Delete all messages!'),
		[m('section.col-sm-3#left', {
			config: resize.registerLeft,
			style: {
				"text-align": "center"
			}
		}, [ //m('h3', 'Conversations'),
				conversations.map(function(grouping) {
					var fromNow = moment(grouping.last).fromNow();

					var retval = [
						m('div', {
							style: {
								'text-align': 'center',
								'font-style': 'italic',
								'display': lastConversationTimeDisplayed === fromNow ? 'none' : 'inherit',
								'line-height': '400%',
								'font-size': '90%'
							}
						}, moment(grouping.last).fromNow()),
						m('button.btn ', {
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
						m('br')
					]

					if (lastConversationTimeDisplayed !== fromNow) {
						lastConversationTimeDisplayed = fromNow;
					}

					return retval;
				})
			]),
			m('section.col-sm-9#right', {
				config: resize.registerRight,
				style: {
					"word-wrap": "break-word"
				}
			}, [
				m('div', {
						// config: fadesIn,
						style: {
							'margin-bottom': '1em'
						}
					}, //'Messages ',

					m('.input-group',
						m('button.btn btn-default glyphicon glyphicon-refresh', {
							onclick: function () {
								ctrl.refresh(true);
							}
						}, ' Refresh'),
						m('button.btn btn-default glyphicon glyphicon-envelope', {
							onclick: ctrl.newMessage,
						}, ' New Message'),
						m('button.btn btn-default glyphicon glyphicon-edit', {
							onclick: ctrl.toggleEditMode,
						}, ctrl.editMode() ? ' Done' : ' Show Actions')
					)),

				m('div.form-group', [
					m('button.btn btn-default btn-sm glyphicon glyphicon-plus', {
						onclick: ctrl.toPlus
					}, ' To'),
					ctrl.to.map(function(item, index) {
						return m('span.nowrap', m('input.black', {
								style: {
									margin: '8px',
									padding: '4px'
								},
								placeholder: 'Phone number...',
								type: 'tel',
								onchange: m.withAttr('value', function(value) {
									ctrl.to[index] = value;
									ctrl.reselectGroup();
								}),
								value: ctrl.to[index]
							}),
							m('button.btn btn-default btn-xs', {
								index: index,
								style: {
									position: 'relative',
									right: '2.7em'
								},
								onclick: m.withAttr('index', ctrl.toMinus)
							}, '✗'))
					})
				]),

				m('div.form-group',
					// m('label', 'New Message: '), m('br'),
					m('textarea.form-control', {
						rows: 1,
						placeholder: 'Message...',
						onchange: m.withAttr('value', function(value) {
							ctrl.message(value);
						}),
						onkeyup: withKey(13, clickSend),
						config: textInputAreaConfig,
						value: ctrl.message()
					}),
					m('button.btn btn-default btn-sm glyphicon glyphicon-comment', {
						onclick: ctrl.send,
						config: sendButtonConfig,
						style: {
							'margin-right': '1em'
						}
					}, ' Send message'),

					m('br'), m('br'),
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
						bottom: '3px',
						right: '0'
					}
				}, [
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
						disabled: ctrl.per_page() === Infinity || ctrl.messages.length === 0 || ctrl.messages.length < ctrl.per_page(),
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
