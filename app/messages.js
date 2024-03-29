'use strict';
var Promise = require('bluebird');
var moment = require('moment');
var m = require('mithril');
var Autolinker = require('autolinker');
var autolinker = new Autolinker();
var Velocity = require('velocity-animate');
var html = require('html-escaper');
var _ = require('lodash');
// my custom mithril components
var error = require('./error');
var fileuploader = require('./fileuploader');
var resize = require('./resize');
var spinner = require('./spinner');
var identity = require('./identity');

var mountedDragAndDrop = false;

var conversations = null;
var nicknames = {};

function renderPhoneNumber(p) {
	if (p.length !== 10)
		return p;

	return '(' + p[0]+p[1]+p[2] + ') ' + p[3]+p[4]+p[5] + '-' + p[6]+p[7]+p[8]+p[9];
}

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
		var to = ctrl.to.sort();

		// {"new_val":{"date":"2015-08-20T01:15:04.881Z","from":"5558675309","id":"8582e043-0663-4775-be6a-778b340730d8","text":"","to":["5558675309"]},"old_val":null}
		if (msg.new_val && msg.old_val === null) {
			// new message
			msg = msg.new_val;
			group = _.without(_.union(msg.to, [msg.from]), identity.me().id).sort();

			console.log('group');
			console.log(group);
			console.log('to');
			console.log(to);
			if (_.isEqual(group, to)) {
				// new messsage in current conversation
				ctrl.messages.unshift(msg);
				ctrl.refreshConversations({force:true,loadingindicator:false});
			} else {
				// new messsage in another conversation
				ctrl.refreshConversations({force:true,loadingindicator:false});
			}
		} else if (msg.new_val === null && msg.old_val) {
			// message deleted
			msg = msg.old_val;
			group = _.without(_.union(msg.to, [msg.from]), identity.me().id).sort();
			if (_.isEqual(group, to)) {
				// deleted messsage in current conversation
				ctrl.messages = _.reject(ctrl.messages, function(message) {
						return message.id === msg.id;
					})
					// ctrl.messages.splice(ctrl.messages.indexOf(msg), 1);
				ctrl.refreshConversations({force:true,loadingindicator:false});
			} else {
				// deleted messsage in another conversation
				ctrl.refreshConversations({force:true,loadingindicator:false});
			}
		} else {
			ctrl.refresh({force:true,loadingindicator:false});
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
		ctrl.getMessages()
	}

	ctrl.previousPage = function() {
		if (ctrl.page() !== 0) {
			ctrl.page(ctrl.page() - 1);
			ctrl.getMessages()
		}
	}

	ctrl.allPages = function() {
		ctrl.page(0);
		ctrl.per_page(Infinity);
		ctrl.getMessages()
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
		ctrl.getMessages();
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
				ctrl.working(false);
			})
	};

	ctrl.getMessages = function() {
		ctrl.working(true);

		var initial;
		if (ctrl.to.length === 1 && ctrl.to[0].trim() === '') {
			initial = Promise.resolve([])
		} else {
			initial = m.request({
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

	ctrl.refreshConversations = function(opts) {
		opts = opts || {force: false, loadingindicator: true};
		if (conversations !== null && !opts.force) {
			return Promise.resolve(conversations);
		}

		if (opts.loadingindicator)
			ctrl.working(true, 0);

		return m.request({
				method: 'GET',
				config: identity.withAuth,
				background: false,
				url: '/api/conversations'
			})
			.then(function(result) {
				if (opts.loadingindicator)
					ctrl.working(false);
				return result;
			})
			.then(ctrl.setConversations, ctrl.error)
	};

	ctrl.refresh = ctrl.getConversations = function(opts) {
		opts = opts || {force: false, loadingindicator: true};

		return ctrl.refreshConversations(opts)
			.then(ctrl.getMessages, ctrl.error)
			.then(function() {
				if (opts.loadingindicator)
					ctrl.working(false);
			})

	};


	function getMessagesUrl() {
		ctrl.to = _.filter(ctrl.to, function(item) {
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

		if (to && !_.isEqual(to, ctrl.to)) {
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
		var ret = _.without(_.flatten(group), identity.me().id);
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
					"font-size": "1.15em"
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
				}, fromMe(message) ? (identity.me().nickname ? identity.me().nickname : 'me') : (ctrl.getNickname(message.from) ? ctrl.getNickname(message.from) : message.from)),
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

				m('div',
					m('button.btn btn-default glyphicon glyphicon-refresh', {
						style: {
							'border-radius': '4em 0 0 4em'
						},
						onclick: function() {
							ctrl.refresh(true);
						}
					}, ' '),
					m('button.btn btn-default glyphicon glyphicon-new-window', {
						style: {
							'border-radius': '0 4em 4em 0'
						},
						onclick: ctrl.newMessage,
					}, ' New')
				),
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
							class: _.isEqual(_.flatten(grouping.group), ctrl.to) ? 'btn-success' : 'btn-default'
						}, [simplify(grouping.group).map(function(ph) {
							// return m('div', (ctrl.getNickname(ph) ? ctrl.getNickname(ph) + ' ' : '') + renderPhoneNumber(ph))
							return m('div', ctrl.getNickname(ph) ? ctrl.getNickname(ph) : renderPhoneNumber(ph))
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
						m('button.btn btn-default glyphicon glyphicon-plus', {
							onclick: ctrl.toPlus
						}, ' To'),
						m('button.btn btn-default glyphicon glyphicon-edit', {
							onclick: ctrl.toggleEditMode,
						}, ' Actions')
					)),

				m('div.form-group', [

					ctrl.to.map(function(item, index) {
						return m('span.nowrap', m('input.black', {
								style: {
									'margin-bottom': '4px',
									padding: '4px',
									width: '10em'
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
									right: '2em'
								},
								onclick: m.withAttr('index', ctrl.toMinus)
							}, '✗'))
					})
				]),

				m('table.form-group',
					m('tr', [
						m('td', {
							style: {
								width: '100%'
							}
						}, m('textarea.form-control', {
							style: {
								width: '100%',
								'margin-top': '1px'
							},
							rows: 1,
							placeholder: 'Message...',
							onkeydown: function (ev) {
								if (13 === ev.keyCode && !ev.shiftKey) {
									 // prevent enter key from making a new line
									ev.preventDefault();
								} else if (13 !== ev.keyCode) {
									m.redraw.strategy("none");
								}
							},
							onkeyup: function (ev) {
								ctrl.message(ev.target.value);
								if (13 == ev.keyCode && !ev.shiftKey) {
									ctrl.send();
								} else if (13 !== ev.keyCode) {
									m.redraw.strategy("none");
								}
							},
							onchange: m.withAttr('value', ctrl.message),
							config: textInputAreaConfig,
							value: ctrl.message()
						})),
						m('td.btn btn-default glyphicon glyphicon-comment', {
							onclick: ctrl.send,
							config: sendButtonConfig,
							style: {
								'margin-left': '8px',
							}
						}, '')
					])
				),
				m.component(fileuploader, {
					to: ctrl.to,
					refresh: ctrl.refresh,
					getMessages: ctrl.getMessages
				}),
				ctrl.messages.map(displayMessage),
				m('div.hoveropaque btn-group', {
					style: {
						position: 'fixed',
						bottom: '3px',
						right: '1em'
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
						// disabled: ctrl.page() === 0 || ctrl.per_page() === Infinity,
						style: {
							display: ctrl.page() === 0 || ctrl.per_page() === Infinity ? 'none' : ''
						}
					}),
					// m('span', ctrl.per_page() === Infinity ? '' : 'Page ' + (ctrl.page()+1) + ' '),
					m('button.btn btn-default glyphicon glyphicon-arrow-right', {
						onclick: ctrl.nextPage,
						// disabled: ctrl.per_page() === Infinity || ctrl.messages.length === 0 || ctrl.messages.length < ctrl.per_page(),
						style: {
							display: ctrl.per_page() === Infinity || ctrl.messages.length === 0 || ctrl.messages.length < ctrl.per_page() ? 'none' : ''
						}
					}),
					m('button.btn btn-default glyphicon glyphicon-arrow-down', {
						onclick: ctrl.allPages,
						style: {
							display:ctrl.per_page() === Infinity || ctrl.messages.length === 0 || ctrl.messages.length < ctrl.per_page() ? 'none' : 'initial'
						}
					})
				])

			])
		]
	])

};
