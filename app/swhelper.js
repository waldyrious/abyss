var existingRegistration;

var Promise = require('bluebird');

module.exports.lastIsSubscribed = false;

function checkRegistration() {
	Promise.try(function () {
		return navigator.serviceWorker.register('/sw.js')
		.then(function (registration) {
			existingRegistration = registration;

			if (!registration.pushManager) {
				module.exports.lastIsSubscribed = false;
				return false;
			}
			return registration.pushManager.getSubscription()
			.then(function (subscription) {
				console.log(subscription);
				module.exports.lastIsSubscribed = true;
				return subscription;
			})
		})
	})
	.catch(function () {
		module.exports.lastIsSubscribed = false;
		return false;
	})
}

module.exports.isSubscribed = function () {
	return module.exports.lastIsSubscribed;
}

module.exports.register = function (jwt) {
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

		return registration.pushManager.subscribe()
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
				module.exports.lastIsSubscribed = true;
			})
		})
	})
};

module.exports.deregister = function (jwt) {
	if (existingRegistration) {
		existingRegistration.pushManager.getSubscription().then(function (receivedSubscription) {
			var subscription = receivedSubscription;
			return subscription.unsubscribe()
			.then(function (success) {
				if (success) {
					console.log('deleting subscription ' + JSON.stringify(subscription));
					fetch('/api/registration/subscription/' + subscription.subscriptionId , {
						credentials: 'include',
						method: 'delete',
						headers: {
							'Authorization': 'Bearer ' + jwt
						},
					}).then(function () {
						module.exports.lastIsSubscribed = false;
					})
				}
			})
		})
	}
}
