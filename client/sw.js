self.addEventListener('push', function (event) {
	console.log('Received a push message', event);

	var title = 'Bro!';
	var body = 'New bro!';
	//  var icon = '/images/icon-192x192.png';
	var tag = 'simple-push-demo-notification-tag';


	clients.matchAll({includeUncontrolled: true}).then(function (clients) {
		console.log('outer clients');
		console.log(clients);
		for (var i = 0; i < clients.length; i++) {
			var client = clients[i];
			console.log('clients ' + i);
			console.log(client);
			if (client['postMesssage']) {
				client['postMesssage']('yourmessage');
			}
		}
	});

	event.waitUntil(
	self.registration.showNotification(title, {
		body: body,
		//      icon: icon,
		tag: tag
	})
	);
});
