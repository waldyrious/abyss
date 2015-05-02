module.exports = function () {
  if ('serviceWorker' in navigator) {
    return navigator.serviceWorker.register('/sw.js')
    .then(function(registration) {
      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope);

      if (!registration.pushManager) {
        showError('Ooops Push Isn\'t Supported', 'This is most likely ' +
        'down to the current browser doesn\'t have support for push. ' +
        'Try Chrome.');
        return;
      }

      registration.pushManager.subscribe()
      .then(function(subscription) {
        console.log(subscription);
        fetch('/api/registration/subscription', {
          credentials: 'include',
          method: 'post',
          headers: {
            "Content-type": "application/json"
          },
          body: JSON.stringify(subscription)
        })
      })
    }).catch(function(err) {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    });
  }
}
