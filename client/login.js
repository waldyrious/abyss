var m = require('mithril');
var messages = require('./messages');
var styler = require('./styler');

module.exports.controller = function (args, extras) {
	var self = this
	 
	this.phoneInput = m.prop('')
	this.needCode = m.prop(false)
	this.codeInput = m.prop('')
	this.phonenumberapi = m.prop('')

	this.cancelCode = function () {
		self.codeInput('');
		self.needCode(false);
	}

	this.logout = function () {
		return m.request({method: 'POST',
		 url: '/api/registration/logout', data: { phonenumber: self.phonenumberapi() } })
		.then(function (response) {
			self.phonenumberapi('')
			self.codeInput('')
		})
	}
	this.whoami = function () {
	    m.request({url:'/api/registration/phone'})
	    .then(self.phonenumberapi)
	  }
	this.noauth = function () { return self.phonenumberapi() == '' }
	this.loginClick = function () {
		return m.request({method: 'POST',
		 url: '/api/registration/phone', data: { phonenumber: self.phoneInput() } })
		.then(function (response) {
			self.needCode(true)
			self.codeInput('')
		})
	}
	this.submitCode = function () {
		return m.request({method: 'POST',
		 url: '/api/registration/code', data: { code: self.codeInput() } })
		.then(function (response) {
			self.phonenumberapi(response)
			self.needCode(false)
			self.codeInput('')
		})
	}
	this.whoami()
}

module.exports.view = function (ctrl) {

	if (ctrl.noauth()) {
		if (ctrl.needCode()) {
			return m('div', [
				m('div', 'Enter verification code: '),
				m('input', {type:'tel', oninput: m.withAttr('value', ctrl.codeInput), value: ctrl.codeInput()}),
				m('button', styler.buttonify({onclick: ctrl.submitCode}), 'Submit Code'),
				m('button', styler.buttonify({onclick: ctrl.cancelCode}), 'Cancel'),
			])
		} else {
			return m('div', [
				m('div', 'Log in with your phone number!' + ctrl.phonenumberapi()),
				m('input', {type:'tel', oninput: m.withAttr('value', ctrl.phoneInput), value: ctrl.phoneInput()}),
				m('button', styler.buttonify({onclick: ctrl.loginClick}), 'Login'),
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

	
}
