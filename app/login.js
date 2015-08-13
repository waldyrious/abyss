'use strict';
var m = require('mithril');
var identity = require('./identity');
var messages = require('./messages');
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

	self.me = function(value) {
		if (value) {
			identity.me(value);
			self.codeInput('');
			self.needCode(false);
			self.phoneInput('');
			if (identity.me().nickname === null) {
				self.nicknameInput('');
			} else {
				self.nicknameInput(identity.me().nickname);
			}
			self.isChangingNickname = false;
		} else {
			return identity.me();
		}
	};

	self.isChangingNickname = false;
	self.changeNickname = function(ev) {
		if (self.isChangingNickname === false) {
			self.isChangingNickname = true;
		} else {
			return self.sendNickname();
		}
	}

	this.cancelCode = function() {
		self.codeInput('');
		self.needCode(false);
	};

	this.logout = function() {
		return identity.logout()
			.then(null, self.error)
	};

	this.noauth = function() {
		return !identity.me().id
	};

	this.loginClick = function() {
		return m.request({
				method: 'POST',
				url: '/api/me',
				config: identity.withAuth,
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
				config: identity.withAuth,
				data: {
					code: self.codeInput().trim()
				}
			})
			.then(function(response) {
				identity.me(response);
				self.needCode(false);
				self.codeInput('');
				m.route('/conversations');
				return identity.whoami();
			}, self.error)
	};

	self.gotoConversations = function () {	m.route('/conversations');	}
	self.gotoNavbar = function () {	m.route('/navbar');	}
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

	return [
		m('h4', 'Simple group messaging and file sharing. Erasable conversations.'),
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
			m('div', ['Just sign in with your existing mobile phone number. ', identity.me().id]),
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
		m('div.faq', m('a', {
			onclick: showFaqButton,
			style: {
				cursor: 'pointer'
			}
		}, 'Frequently Asked Questions')),
		showFaq ? m.component(faq) : null
	]
};
