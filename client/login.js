var m = require('mithril')
var Bro = require('./bro')

function buttonify (obj) {
	obj.class="btn btn-default"
	return obj
}

module.exports.controller = function (args, extras) {
	var self = this
	 
	this.phonenumber = m.prop('')
	this.phonenumberapi = m.prop('')
	this.whoami = function () {
	    m.request({url:'/api/registration/phone'})
	    .then(self.phonenumberapi)
	  }
	this.noauth = function () { return self.phonenumberapi() == '' }
	this.loginClick = function () {
		return m.request({method: 'POST',
		 url: '/api/registration/phone', data: { phonenumber: self.phonenumber() } })
		.then(function (response) {
			self.phonenumberapi(response)
		})
	}
	this.whoami()
}

module.exports.view = function (ctrl) {
	return m('div', [
		m('div', 'Logged in as: ' + ctrl.phonenumberapi()),
		m('label', 'Phone number'),
		m('input', {oninput: m.withAttr('value', ctrl.phonenumber) }),
		m('button', buttonify({onclick: ctrl.loginClick}),'Login'),

		m.component(Bro, {'login': ctrl})
	])
}
