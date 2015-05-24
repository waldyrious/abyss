'use strict';
var m = require('mithril');
var messages = require('./messages');
var styler = require('./styler');

var error = require('./error');

module.exports.controller = function (args, extras) {
	var self = this;
	
	this.error = error.ErrorHolder();

	this.phoneInput = m.prop('');
	this.needCode = m.prop(false);
	this.codeInput = m.prop('');
	this.phonenumberapi = m.prop('');

	this.cancelCode = function () {
		self.codeInput('');
		self.needCode(false);
	};

	this.logout = function () {
		return m.request({method: 'POST',
		 url: '/api/registration/logout', data: { phonenumber: self.phonenumberapi() } })
		.then(function (response) {
			self.phonenumberapi('');
			self.codeInput('');
		}, self.error)
	};
	this.whoami = function () {
	    m.request({url:'/api/registration/phone'})
	    .then(self.phonenumberapi, self.error)
	  };
	this.noauth = function () { return self.phonenumberapi() === '' };
	this.loginClick = function () {
		return m.request({method: 'POST',
		 url: '/api/registration/phone', data: { phonenumber: self.phoneInput().trim() } })
		.then(function (response) {
			self.needCode(true);
			self.codeInput('');
		}, self.error)		
	};
	this.submitCode = function () {
		return m.request({method: 'POST',
		 url: '/api/registration/code', data: { code: self.codeInput().trim() } })
		.then(function (response) {
			self.phonenumberapi(response);
			self.needCode(false);
			self.codeInput('');
		}, self.error);
	};
	this.whoami()
};

module.exports.view = function (ctrl) {

	if (ctrl.noauth()) {
		if (ctrl.needCode()) {
			return m('div', [
				error.renderError(ctrl.error),
				m('div',  'Enter verification code: '),
				m('input', {type: 'tel', oninput: m.withAttr('value', ctrl.codeInput), value: ctrl.codeInput()}),
				m('button', styler.buttonify({onclick: ctrl.submitCode}), 'Submit Code'),
				m('button', styler.buttonify({onclick: ctrl.cancelCode}), 'Cancel')
			])
		} else {
			return m('div', [
				error.renderError(ctrl.error),
				m('h3', 'Own your messages!'),
				m('h4', 'Ever sent a message by mistake, or just don\'t want to make it a permanent record?'),
				m('h4', 'Yobro is a fun, easy way to send individual and group messages you can take back at any time.'),
				m('div', 'No signup needed! Simply login with your mobile phone number, and we\'ll send you a confirmation code.'),
				m('i', 'Your phone number is used purely for authentication purposes only and will not be distributed to third parties.'),
				m('div', ['Log in with', m('i', ' just '), 'your 10-digit phone number!', ctrl.phonenumberapi()]),
				m('input', {type: 'tel', oninput: m.withAttr('value', ctrl.phoneInput), value: ctrl.phoneInput()}),
				m('button', styler.buttonify({onclick: ctrl.loginClick}), 'Login')
			])
		}
	} else {
		return m('div', [
			m('div', 'Logged in as: ' + ctrl.phonenumberapi()),
			m('button', styler.buttonify({onclick: ctrl.logout}), 'Logout'),

			m.component(messages, {
				'phonenumber': ctrl.phonenumberapi,
				'noauth': ctrl.noauth
			})
		])
	}
};
