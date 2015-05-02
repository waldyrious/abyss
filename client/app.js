if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
  .then(function(registration) {
    // Registration was successful
    console.log('ServiceWorker registration successful with scope: ',    registration.scope);
    
    if (!registration.pushManager) {
        showError('Ooops Push Isn\'t Supported', 'This is most likely ' +
          'down to the current browser doesn\'t have support for push. ' +
          'Try Chrome.');
        return;
    }
    
    registration.pushManager.subscribe()
    .then(function(subscription) {
        console.log(subscription);
     })
  }).catch(function(err) {
    // registration failed :(
    console.log('ServiceWorker registration failed: ', err);
  });
}