var existingRegistration;

var Promise = require('bluebird');

module.exports.isSubscribed = function () {
	return Promise.try(function () {
		return navigator.serviceWorker.register('/sw.js')
		.then(function (registration) {
			existingRegistration = registration;

			if (!registration.pushManager) {
				return false;
			}
			return registration.pushManager.getSubscription()
			.then(function (subscription) {
				console.log(subscription);
				return subscription;
			})
		})
	})
	.catch(function () {
		return false;
	})
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
					})
				}
			})
		})
	}
}
