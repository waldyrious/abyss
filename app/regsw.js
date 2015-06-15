module.exports = function (jwt) {
	if ('serviceWorker' in navigator) {
		return navigator.serviceWorker.register('/sw.js')
		.then(function (registration) {
			// Registration was successful
			console.log('ServiceWorker registration successful with scope: ', registration.scope);

			if (!registration.pushManager) {
				showError('Push Isn\'t Supported', 'This is most likely ' +
				'because the current browser doesn\'t have support for push. ' +
				'Try Chrome.');
				return;
			}

			registration.pushManager.subscribe()
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
	}
};
