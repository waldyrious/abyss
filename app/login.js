'use strict';
var m = require('mithril');
var messages = require('./messages');
var regsw = require('./regsw');
var Cookies = require('cookies-js');
var validator = require('validator');

var radio = require('./radio');
var faq = require('./faq');

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
					m('span.input-group-btn', m('button.btn btn-default', {
						class: codeInputValid() ? 'btn-success' : '',
						disabled: !codeInputValid(),
						onclick: ctrl.submitCode
					}, 'Submit Code')),
					m('span.input-group-btn', m('button.btn btn-default', {
						onclick: ctrl.cancelCode
					}, 'Cancel'))))
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
						autofocus: true,
						oninput: m.withAttr('value', ctrl.phoneInput),
						value: ctrl.phoneInput()
					}),
					m('span.input-group-btn', m('button.btn btn-default', {
						class: phoneInputValid() ? 'btn-success' : '',
						disabled: !phoneInputValid(),
						onclick: ctrl.loginClick
					}, 'Login')))
			], error.renderError(ctrl.error),
			m('br'),
			m('br'),
			m('div.faq', m('button.btn btn-default btn-large', {
				onclick: showFaqButton
			}, 'Frequently Asked Questions')),
			showFaq ? m.component(faq) : null
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
