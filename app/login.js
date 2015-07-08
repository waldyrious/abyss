'use strict';
var m = require('mithril');
var messages = require('./messages');
var radio = require('./radio');
var styler = require('./styler');
var regsw = require('./regsw');
var Cookies = require('cookies-js');
var validator = require('validator');

var error = require('./error');

module.exports.controller = function(args, extras) {
	var self = this;
	self.error = error.ErrorHolder();
	self.phoneInput = m.prop('');
	self.needCode = m.prop(false);
	self.codeInput = m.prop('');
	self.nicknameInput = m.prop('');
	self.jwt = m.prop(Cookies.get('jwt'));

	var withAuth = function(xhr) {
		if (self.jwt()) {
			xhr.setRequestHeader('Authorization', 'Bearer ' + self.jwt());
		}
	}

	self.me = (function() {
		var me = m.prop({});
		return function(value) {
			if (value) {
				if (value.jwt) {
					self.jwt(value.jwt);
					Cookies.set('jwt', value.jwt, {
						expires: Infinity
					});
					console.log('New jwt ' + value.jwt);
				}
				me(value);
				self.codeInput('');
				self.needCode(false);
				self.phoneInput('');
				if (me().nickname === null) {
					self.nicknameInput('');
				} else {
					self.nicknameInput(me().nickname);
				}
				self.isChangingNickname = false;
				regsw(self.jwt());
			} else {
				return me();
			}
		};
	})();

	self.isChangingNickname = false;
	self.changeNickname = function(ev) {
		if (self.isChangingNickname === false) {
			self.isChangingNickname = true;
		} else {
			self.sendNickname();
		}
	}

	this.cancelCode = function() {
		self.codeInput('');
		self.needCode(false);
	};

	this.logout = function() {
		return m.request({
				method: 'DELETE',
				config: withAuth,
				url: '/api/me'
			})
			.then(function(me) {
				self.me(me);
				Cookies.expire('jwt');
			}, self.error)
	};
	this.whoami = function() {
		return m.request({
				url: '/api/me',
				config: withAuth
			})
			.then(self.me, self.error)
	};
	this.whoamiSansErrorHandling = function() {
		return m.request({
				url: '/api/me',
				config: withAuth
			})
			.then(self.me)
	};

	this.noauth = function() {
		return !self.me().id
	};
	this.loginClick = function() {
		return m.request({
				method: 'POST',
				url: '/api/me',
				config: withAuth,
				data: {
					phonenumber: self.phoneInput().trim()
				}
			})
			.then(function(response) {
				self.needCode(true);
				self.codeInput('');
			}, self.error)
	};
	this.submitCode = function() {
		return m.request({
				method: 'POST',
				url: '/api/me',
				config: withAuth,
				data: {
					code: self.codeInput().trim()
				}
			})
			.then(function(response) {
				self.me().id = response;
				self.needCode(false);
				self.codeInput('');
				self.jwt(response.jwt);
				return self.whoami();
			}, self.error)
	};

	self.sendNickname = function() {
		return m.request({
				method: 'POST',
				url: '/api/me',
				config: withAuth,
				data: {
					nickname: self.nicknameInput().trim()
				}
			})
			.then(self.me, self.error)
	};

	this.whoamiSansErrorHandling(); // don't want errors to show up on login page when user isn't logged in yet
};
var showFaq = false;

module.exports.view = function(ctrl) {
	var phoneInputValid = function() {
		return validator.isMobilePhone(ctrl.phoneInput(), 'en-US');
	}

	var codeInputValid = function() {
		return validator.isLength(ctrl.codeInput(), 6, 6);
	}

	var showFaqButton = function() {
		showFaq = !showFaq;
	}

	if (ctrl.noauth()) {
		return [
			m('h1', 'YoBro.net'),
			// m('h3', m('i', 'Own your messages!')),
			// m('h4', 'Ever sent a message by mistake, or just don\'t want to make it a permanent record?'),
			m('h4', 'Simple group and individual messaging, with messages that you can erase at any time.'),
			ctrl.needCode() ? [
				m('.col-md1',
				m('.input-group', {
						style: {
							width: '30em'
						}
					},
					m('input.form-control', {
						placeholder: 'Enter 6-digit verification code...',
						type: 'tel',
						oninput: m.withAttr('value', ctrl.codeInput),
						value: ctrl.codeInput()
					}),
					m('span.input-group-btn', m('button', styler.buttonify({
						disabled: !codeInputValid(),
						onclick: ctrl.submitCode
					}), 'Submit Code')),
					m('span.input-group-btn', m('button', styler.buttonify({
						onclick: ctrl.cancelCode
					}), 'Cancel'))))
			] : [
				m('div', ['Just sign in with your existing mobile phone number.', ctrl.me().id]),
				m('div.input-group', {
						style: {
							width: '18em'
						}
					},
					m('input.form-control', {
						placeholder: '10-digit phone number',
						type: 'tel',
						oninput: m.withAttr('value', ctrl.phoneInput),
						value: ctrl.phoneInput()
					}),
					m('span.input-group-btn', m('button', styler.buttonify({
						disabled: !phoneInputValid(),
						onclick: ctrl.loginClick
					}), 'Login')))
			], error.renderError(ctrl.error),
			m('br'),
			m('br'),
			m('div.faq', m('button.btn btn-default btn-large', {
				onclick: showFaqButton
			}, 'Frequently Asked Questions')),
			showFaq ?
			m('ul.list-unstyled faq', [
				m('li', 'Q. What is the point of this site?'),
				m('li', 'A. Twitter and SMS are perfect for short messages, and e-mail is great for long messages. But what about ', m('i', 'medium'), ' length, web-only, erasable messaging? You probably didn\'t even know you needed that!'),
				m('br'),
				m('li', 'Q. Why do I sign in with my phone number?'),
				m('li', 'A. Usernames are hard to remember. Passwords are a little easier (perhaps you cleverly use the same one on every site). However, according to our scientific research, 55% of mobile phone users can recall their own phone number on command. We like those odds.'),
				m('br'),
				m('li', 'Q. How does message erasing work?'),
				m('li', 'A. Pressing the trash can looking button next to a message will instantly erase it. Now, the way this site works is, senders and recipients always see the same copy of the message. So if the sender or recipient erases the message, it\'s gone for good!'),
				m('br'),
				m('li', 'Q. How does erasing work with group messages?'),
				m('li', 'A. If you sent the message, it\'s gone for everybody. If you received the message, you are removed from the recipients list and no longer see the message. The other recipients will still see the message until the sender or all of the recipients erases it.'),
				m('br'),
				m('li', 'Q. Can I get notified of new messages?'),
				m('li', 'A. Notifications work in Chrome on the desktop and Chrome for Android. Unfortunately, notifications are not yet available for Chrome or Safari in iOS. Sorry. Oh, and you can turn them on and off with the padlock icon in the browser\'s location bar.'),
				m('br'),
				m('li', 'Q. Does this work on mobile devices?'),
				m('li', 'A. Yes, and it looks good too.'),
				m('br'),
				m('li', 'Q. Can I send files, photos, or sound?'),
				m('li', 'A. No. You can send text! Look, this is a free service. You can send links, too...which I suppose are just text.'),
				m('br'),
				m('li', 'Q. But I can\'t remember my friends phone numbers!'),
				m('li', 'A. Listen bucko, unlike other services, this site doesn\'t coddle you. What happens if you get stranded somewhere and lose your cell phone? If you used this site enough, you might just might remember a friend\'s number and be able to call from a pay phone. If you can find one. Which they won\'t recognize the number of or probably answer. Regardless, you\'re welcome.'),
				m('br'),
				m('li', 'Q. What do I do if YoBro goes down?'),
				m('li', 'A. YoBro is probably all you need to communicate most of the time, but in the unfortunate circumstance that it is not working, you will not be able to read this message.'),
				m('br'),
				m('li', 'Q. Why the dumb name?'),
				m('li', 'A. All the good domains were taken.'),
			]) : null

		]
	} else {
		return [
			m('nav.navbar navbar-default', {
				style: {
					'margin-top': '1rem',
					'padding-top': '7px'
				}
			},

			m('div.container-fluid', ['Logged in as: ' + ctrl.me().id + ' ',
				ctrl.isChangingNickname ? m('input', {
					oninput: m.withAttr('value', ctrl.nicknameInput),
					value: ctrl.nicknameInput()
				}) : (ctrl.me().nickname !== '' ? ctrl.me().nickname : null),
				' ',
				m('button.btn btn-default', {
					onclick: ctrl.changeNickname
				}, 'Change Nickname'),
				' ',
				m('button.btn btn-default', {
					onclick: ctrl.logout,
					style: {
						float: 'right'
					}
				}, 'Logout'),
				m.component(radio),
				m('span', {
					style: {
						float: 'right',
						'margin-right': '1em'
					}
				}, 'Featuring LoungeTek Radio'),
			])),

			m.component(messages, {
				'me': ctrl.me,
				'jwt': ctrl.jwt
			})
		]
	}
};
