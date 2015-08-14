var m = require('mithril');

var identity = require('./identity');
var radio = require('./radio');
var messages = require('./messages');
var error = require('./error');
var swhelper = require('./swhelper'); //serviceworker helper
var validator = require('validator');

module.exports.controller = function(args, extras) {

	var self = this;
	self.error = error.ErrorHolder();
	self.nicknameInput = m.prop(identity.nickname);

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

	self.enableNotifications = function (bool) {
		if (bool) {
			return swhelper.register(identity.me().jwt)
		} else {
			swhelper.deregister(identity.me().jwt);
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
		m('nav.navbar navbar-default', {
				style: {
					'margin-top': '1rem',
					'padding-top': '7px'
				}
			},

			m('div.container-fluid', ['Logged in as: ' + identity.me().id + ' ',
				ctrl.isChangingNickname ? m('input', {
					oninput: m.withAttr('value', ctrl.nicknameInput),
					value: ctrl.nicknameInput()
				}) : identity.me().nickname,
				' ',
				m('button.btn btn-default', {
					onclick: ctrl.changeNickname
				}, 'Change Nickname'),
				m('label', {
						style: {
							'margin-left': '1em'
						}
				},[
					m('input[type=checkbox]', {
						onclick: function() {
				            ctrl.enableNotifications(this.checked);
				        },
						checked: ctrl.notificationsEnabled()
					}), ' Receive notifications (on this browser)']),
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
				}, 'Featuring ', m('a', {
					href: 'http://loungetek.com/radio/',
					target: '_blank'
				}, 'LoungeTek Radio')),
			])),
		m.component(messages)
	]
}
