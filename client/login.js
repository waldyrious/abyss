var m = require('mithril');
var Bro = require('./bro');
var styler = require('./styler');

module.exports.controller = function (args, extras) {
	var self = this
	 
	this.phoneInput = m.prop('')
	this.phonenumberapi = m.prop('')

	this.logout = function () {
		return m.request({method: 'POST',
		 url: '/api/registration/logout', data: { phonenumber: self.phonenumberapi() } })
		.then(function (response) {
			self.phonenumberapi('')
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
			self.phonenumberapi(response)
		})
	}
	this.whoami()
}

module.exports.view = function (ctrl) {

	if (ctrl.noauth()) {
		return m('div', [
			m('div', 'Log in with your phone number!' + ctrl.phonenumberapi()),
			// m('label', 'Phone number: '),
			m('input', {oninput: m.withAttr('value', ctrl.phoneInput) }),
			m('button', styler.buttonify({onclick: ctrl.loginClick}), 'Login'),

			m.component(Bro, {
				'phonenumber': ctrl.phonenumberapi,
				'noauth': ctrl.noauth
			})
		])	
	} else {
		return m('div', [
			m('div', 'Logged in as: ' + ctrl.phonenumberapi()),
			m('button', styler.buttonify({onclick: ctrl.logout}), 'Logout'),

			m.component(Bro, {
				'phonenumber': ctrl.phonenumberapi,
				'noauth': ctrl.noauth
			})
		])	
	}

	
}
