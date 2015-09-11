'use strict';
// https://developers.google.com/web/updates/2015/03/push-notificatons-on-the-open-web

self.addEventListener('push', function(event) {
	console.log('Received a push message', event);

	var title = 'abyss.online';
	var body = 'New message!';
	//  var icon = '/images/icon-192x192.png';
	var tag = 'simple-push-demo-notification-tag';

    // this does work at all:
	// clients.matchAll({
	// 	includeUncontrolled: true
	// }).then(function(clients) {
	// 	console.log('outer clients');
	// 	console.log(clients)
	// 	windowclients = clients;
	//
	// 	for (var i = 0; i < clients.length; i++) {
	// 		var client = clients[i];
	// 		console.log('client: ' + i);
	// 		console.log(client);
	// 		if (client['postMesssage']) {
	// 			client['postMesssage']('yourmessage');
	// 		}
	//
	// 		// https://developer.mozilla.org/en-US/docs/Web/API/WindowClient
	// 		if (client.focus) {
	// 			client.focus();
	// 		}
	// 	}
	//
	// });

	event.waitUntil(self.registration.showNotification(title, {
		body: body,
		//      icon: icon,
		tag: tag
	}));
});

self.addEventListener('notificationclick', function(event) {
	console.log('On notification click: ', event.notification.tag);
	// Android doesn't close the notification when you click on it
	// See: http://crbug.com/463146
	event.notification.close();

	// This looks to see if the current window is already open and
	// focuses if it is
	event.waitUntil(
		clients.matchAll({
			type: "window"
		})
		.then(function(clientList) {
			for (var i = 0; i < clientList.length; i++) {
				var client = clientList[i];
				// if (client.url == '/' && 'focus' in client)
				if ('focus' in client)
					client.focus();
				if ('postMessage' in client)
					client.postMessage('notificationclick');
			}
			if (clients.openWindow && clientList.length == 0) {
				return clients.openWindow('/');
			}
		})
	);
});
