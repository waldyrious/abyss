'use strict';
var m = require('mithril');
var identity = require('./identity');
var messages = require('./messages');
var validator = require('validator');

var radio = require('./radio');
var faq = require('./faq');

var error = require('./error');

var resize = require('./resize');

module.exports.controller = function(args, extras) {
	resize.resize();

	var ctrl = this;
	ctrl.error = error.ErrorHolder();
	ctrl.phoneInput = m.prop('');
	ctrl.needCode = m.prop(false);
	ctrl.codeInput = m.prop('');
	ctrl.nicknameInput = m.prop('');

	ctrl.me = function(value) {
		if (value) {
			identity.me(value);
			ctrl.codeInput('');
			ctrl.needCode(false);
			ctrl.phoneInput('');
			if (identity.me().nickname === null) {
				ctrl.nicknameInput('');
			} else {
				ctrl.nicknameInput(identity.me().nickname);
			}
			ctrl.isChangingNickname = false;
		} else {
			return identity.me();
		}
	};

	ctrl.isChangingNickname = false;
	ctrl.changeNickname = function(ev) {
		if (ctrl.isChangingNickname === false) {
			ctrl.isChangingNickname = true;
		} else {
			return ctrl.sendNickname();
		}
	}

	this.cancelCode = function() {
		ctrl.codeInput('');
		ctrl.needCode(false);
	};

	this.logout = function() {
		return identity.logout()
			.then(null, ctrl.error)
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
					phonenumber: ctrl.phoneInput().trim()
				}
			})
			.then(function(response) {
				ctrl.needCode(true);
				ctrl.codeInput('');
			}, ctrl.error)
	};

	this.submitCode = function() {
		return m.request({
				method: 'POST',
				url: '/api/me',
				config: identity.withAuth,
				data: {
					code: ctrl.codeInput().trim()
				}
			})
			.then(function(response) {
				identity.me(response);
				ctrl.needCode(false);
				ctrl.codeInput('');
				m.route('/conversations');
			}, ctrl.error)
	};

	ctrl.gotoConversations = function() {
		m.route('/conversations');
	}
	ctrl.gotoNavbar = function() {
		m.route('/navbar');
	}
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

	return m('div.container', [
		m('h4', {
			style: {
				"margin-top": "1em"
			}
		}, 'Ephemeral group messaging and file sharing.'),
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
			m('div',
				identity.me().id ? ['Logged in as: ' + identity.me().id, m("a[href='/conversations']", {
						config: m.route
					}, ' Conversations'),
					m("a[href='#']", {
						onclick: ctrl.logout
					}, ' Logout')
				] : 'Enter your mobile phone number:'
			),
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
		}, 'What is this?')),
		showFaq ? m.component(faq) : null
	])
};
