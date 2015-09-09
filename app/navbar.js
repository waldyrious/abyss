var m = require('mithril');

var identity = require('./identity');
var radio = require('./radio');
var messages = require('./messages');
var error = require('./error');
var swhelper = require('./swhelper'); //serviceworker helper
var validator = require('validator');
var resize = require('./resize');

module.exports.controller = function(args, extras) {

	var ctrl = this;
	ctrl.error = error.ErrorHolder();
	ctrl.nicknameInput = m.prop('');

	identity.whoami()
	.then(function (me) {
		if (me && me.nickname) {
			ctrl.nicknameInput(me.nickname);
		}
	})

	ctrl.isChangingNickname = false;
	ctrl.changeNickname = function(ev) {
		if (ctrl.isChangingNickname === false) {
			ctrl.isChangingNickname = true;
		} else {
			identity.changeNickname(ctrl.nicknameInput().trim())
				.then(function() {
					ctrl.nicknameInput(identity.nickname);
					ctrl.isChangingNickname = false;
				}, ctrl.error)
		}
	}
	ctrl.notificationsEnabled = swhelper.isSubscribed;

	ctrl.enableNotifications = function(bool) {
		if (bool) {
			return swhelper.register()
		} else {
			return swhelper.deregister();
		}
	}

	ctrl.logout = function(ev) {
		return identity.logout()
			.then(function() {
				m.route('/')
			})
	}

	ctrl.chooseConfig = (function () {
		var interval;

		return function (el) {

			if (identity.me().nickname === '' && !ctrl.isChangingNickname) {
				clearInterval(interval);
				el.style.transition = 'color 1s ease-in-out';
				interval = setInterval(function () {
					if (el.style.color === 'red') {
						el.style.color = 'blue';
					} else {
						el.style.color = 'red';
					}
				}, 1000)
			} else {
				// el.style.color = '';
				clearInterval(interval);
			}

		}
	})();
}

module.exports.view = function(ctrl, args, extras) {
	return [
		m('nav#nav.navbar navbar-custom navbar-static-top', {
			config: resize.registerNav
		},
			m('div.container-fluid', [
				m('ul.nav navbar-nav', [
					m('li', {
						style: {
							"margin-right": "1em",
							"color": "grey"
						}
					},'abyss.online'),
					m('li', 'Featuring ', m('a', {
						href: 'http://loungetek.com/radio/',
						target: '_blank'
					}, 'LoungeTek Radio')),
					m.component(radio)
				]),
				m('ul.nav navbar-nav navbar-right', [
					navigator.serviceWorker ? m('li', m('a', {
						href: '#',
						onclick: function() {
							ctrl.enableNotifications(!ctrl.notificationsEnabled());
						},
					}, ctrl.notificationsEnabled() ? 'Disable Notifications' : ' Enable Notifications' )) : '',
					m('li', ctrl.isChangingNickname ? m('input.form-control', {
							oninput: m.withAttr('value', ctrl.nicknameInput),
							value: ctrl.nicknameInput(),
							placeholder: 'Nickname...'
						}) : ''
					),
					m('li', [
						m('a', {
							href: '#',
							onclick: ctrl.changeNickname,
							config: ctrl.chooseConfig,
							style: {
								color: identity.me().nickname === '' ? 'red' : ''
							}
						}, ctrl.isChangingNickname ? 'Save Nickname' : (identity.me().nickname === '' ? 'Change Nickname' : 'Change Nickname'))
					]),
					m('li', m('a', {
						href: '#',
						onclick: ctrl.logout
					}, 'Logout ' + identity.me().nickname))
				])
			])),
		m.component(messages)
	]
}
