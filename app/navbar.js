var m = require('mithril');

var identity = require('./identity');
var radio = require('./radio');
var messages = require('./messages');
var error = require('./error');
var swhelper = require('./swhelper'); //serviceworker helper
var validator = require('validator');
var resize = require('./resize');

module.exports.controller = function(args, extras) {

	var self = this;
	self.error = error.ErrorHolder();
	self.nicknameInput = m.prop('');

	identity.whoami()
	.then(function (me) {
		if (me && me.nickname) {
			self.nicknameInput(me.nickname);
		}
	})

	self.isChangingNickname = false;
	self.changeNickname = function(ev) {
		if (self.isChangingNickname === false) {
			self.isChangingNickname = true;
		} else {
			identity.changeNickname(self.nicknameInput().trim())
				.then(function() {
					self.nicknameInput(identity.nickname);
					self.isChangingNickname = false;
				}, self.error)
		}
	}
	self.notificationsEnabled = swhelper.isSubscribed;

	self.enableNotifications = function(bool) {
		if (bool) {
			return swhelper.register()
		} else {
			return swhelper.deregister();
		}
	}

	self.logout = function(ev) {
		return identity.logout()
			.then(function() {
				m.route('/')
			})
	}
}

module.exports.view = function(ctrl, args, extras) {
	return [
		m('nav#nav.navbar navbar-custom navbar-static-top', {
			config: resize.registerNav
		},
			m('div.container-fluid', [
				m('ul.nav navbar-nav', [
					m('li', ['Logged in as: ' + identity.me().id + ' ',
						ctrl.isChangingNickname ? m('input.black', {
							oninput: m.withAttr('value', ctrl.nicknameInput),
							value: ctrl.nicknameInput()
						}) : identity.me().nickname
					]),
					m('li', [
						m('button.btn btn-default', {
							onclick: ctrl.changeNickname
						}, 'Change Nickname')
					]),
					navigator.serviceWorker ? m('li', m('input[type=checkbox]', {
						onclick: function() {
							ctrl.enableNotifications(this.checked);
						},
						checked: ctrl.notificationsEnabled()
					}), ' Receive notifications (on this browser)') : '',
					m('li', 'Featuring ', m('a', {
						href: 'http://loungetek.com/radio/',
						target: '_blank'
					}, 'LoungeTek Radio')),
					m.component(radio)
				]),
				m('ul.nav navbar-nav navbar-right', [
					m('li', m('a', {
						href: '#',
						onclick: ctrl.logout
					}, 'Logout ' + identity.me().nickname))
				])
			])),
		m.component(messages)
	]
}
