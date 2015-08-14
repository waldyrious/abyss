var existingRegistration;

var Promise = require('bluebird');
var m = require('mithril');

var last = module.exports.isSubscribed = m.prop(false);

function checkRegistration() {
	return Promise.try(function () {
		return navigator.serviceWorker.register('/sw.js')
		.then(function (registration) {
			existingRegistration = registration;

			if (!registration.pushManager) {
				last(false);
				return false;
			}
			return registration.pushManager.getSubscription()
			.then(function (subscription) {
				if (subscription != null)
					last(true);
				return subscription;
			})
		})
	})
	.catch(function (err) {
		console.error(err)
		last(false);
		return false;
	})
}
var initialCheck = checkRegistration();

module.exports.register = function (jwt) {
	return initialCheck.then(function(){
		return navigator.serviceWorker.register('/sw.js')
		.then(function (registration) {
			existingRegistration = registration;
			// Registration was successful
			console.log('ServiceWorker registration successful with scope: ', registration.scope);

			if (!registration.pushManager) {
				showError('Push Isn\'t Supported', 'This is most likely ' +
				'because the current browser doesn\'t have support for push. ' +
				'Try Chrome.');
				return;
			}

			return registration.pushManager.subscribe({userVisibleOnly: true})
			.then(function (subscription) {
				console.log(subscription);
				fetch('/api/registration/subscription', {
					credentials: 'include',
					method: 'post',
					headers: {
						'Authorization': 'Bearer ' + jwt,
						'Content-type': 'application/json'
					},
					body: JSON.stringify(subscription)
				})
				.then(function () {
					last(true);
					m.redraw();
				})
			})
		})
	})

};

module.exports.deregister = function (jwt) {
	return initialCheck.then(function(){

		if (existingRegistration) {
			existingRegistration.pushManager.getSubscription().then(function (receivedSubscription) {
				var subscription = receivedSubscription;
				if (subscription !== null) {
					return subscription.unsubscribe()
					.then(function (success) {
						if (success) {
							console.log('deleting subscription ' + JSON.stringify(subscription));
							fetch('/api/registration/subscription/?endpoint=' + encodeURIComponent(subscription.endpoint) , {
								credentials: 'include',
								method: 'delete',
								headers: {
									'Authorization': 'Bearer ' + jwt
								},
							}).then(function () {
								last(false);
								m.redraw();
							})
						}
					})
				}
			})
		}
	})
}
