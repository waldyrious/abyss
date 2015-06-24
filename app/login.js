'use strict';
var m = require('mithril');
var messages = require('./messages');
var styler = require('./styler');
var regsw = require('./regsw');
var Cookies = require('cookies-js');
var validator = require('validator');

var error = require('./error');

module.exports.controller = function (args, extras) {
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

	self.me = (function () {
		var me = m.prop({});
		return function (value) {
			if (value) {
				if (value.jwt) {
					self.jwt(value.jwt);
					Cookies.set('jwt', value.jwt, {expires: Infinity });
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
	self.changeNickname = function (ev) {
		if (self.isChangingNickname === false) {
			self.isChangingNickname = true;
		} else {
			self.sendNickname();
		}
	}

	this.cancelCode = function () {
		self.codeInput('');
		self.needCode(false);
	};

	this.logout = function () {
		return m.request({method: 'DELETE', config: withAuth, url: '/api/me'})
		.then(function (me) {
			self.me(me);
			Cookies.expire('jwt');
		}, self.error)
	};
	this.whoami = function () {
	    return m.request({url:'/api/me', config: withAuth})
		.then(self.me, self.error)
	  };
	this.noauth = function () { return !self.me().id };
	this.loginClick = function () {
		return m.request({method: 'POST',
		 url: '/api/me', config: withAuth, data: { phonenumber: self.phoneInput().trim() } })
		.then(function (response) {
			self.needCode(true);
			self.codeInput('');
		}, self.error)
	};
	this.submitCode = function () {
		return m.request({method: 'POST',
		 url: '/api/me', config: withAuth, data: { code: self.codeInput().trim() } })
		.then(function (response) {
			self.me().id = response;
			self.needCode(false);
			self.codeInput('');
			self.jwt(response.jwt);
			return self.whoami();
		}, self.error)
	};

	self.sendNickname = function () {
		return m.request({method: 'POST',
			url: '/api/me', config: withAuth, data: { nickname: self.nicknameInput().trim()}
		})
		.then(self.me, self.error)
	};

	this.whoami();
};

module.exports.view = function (ctrl) {
	var phoneInputValid = function () {
		return validator.isMobilePhone(ctrl.phoneInput(), 'en-US');
	}

	var codeInputValid = function () {
		return validator.isLength(ctrl.codeInput(), 6, 6);
	}

	if (ctrl.noauth()) {
		return m('div', [
			m('h1', 'Yobro.net'),
			m('h3', m('i', 'Own your messages!')),
			m('h4', 'Ever sent a message by mistake, or just don\'t want to make it a permanent record?'),
			m('h4', 'Yobro is a fun, easy way to send individual and group messages you can take back at any time.'),
			m('p', 'No signup needed. Simply login with your mobile phone number, and we\'ll send you a confirmation code.'),
			m('i', 'Your phone number is used strictly for authentication purposes only and will not be distributed to third parties.'),
			ctrl.needCode() ? [
				m('div',  'Enter verification code: '),
				m('input', {type: 'tel', oninput: m.withAttr('value', ctrl.codeInput), value: ctrl.codeInput()}),
				m('span', ' '),
				m('button', styler.buttonify({disabled: !codeInputValid(), onclick: ctrl.submitCode}), 'Submit Code'),
				m('span', ' '),
				m('button', styler.buttonify({onclick: ctrl.cancelCode}), 'Cancel')
			]:[
			m('div', ['Carefully enter your 10-digit phone number!', ctrl.me().id]),
			m('input', {type: 'tel', oninput: m.withAttr('value', ctrl.phoneInput), value: ctrl.phoneInput()}),
			m('span', ' '),
			m('button', styler.buttonify({disabled: !phoneInputValid(), onclick: ctrl.loginClick}), 'Login')
			]
		, error.renderError(ctrl.error)
		])
	} else {
		return m('div', [
			m('div', ['Logged in as: ' + ctrl.me().id + ' ',
			ctrl.isChangingNickname ? m('input', {oninput: m.withAttr('value', ctrl.nicknameInput), value: ctrl.nicknameInput()})
			: (ctrl.me().nickname !== '' ? '(' + ctrl.me().nickname + ')' : null),
			' ',
			m('button', styler.buttonify({onclick: ctrl.changeNickname}), 'Change Nickname'),
			' ',
			m('button', styler.buttonify({onclick: ctrl.logout}), 'Logout')]),

			m.component(messages, {
				'me': ctrl.me,
				'jwt': ctrl.jwt
			})
		])
	}
};
