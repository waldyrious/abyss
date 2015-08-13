var Spinner = require('spin.js');

var opts = {
  lines: 12 // The number of lines to draw
, length: 12 // The length of each line
, width: 7 // The line thickness
, radius: 42 // The radius of the inner circle
, scale: 1 // Scales overall size of the spinner
, corners: 1 // Corner roundness (0..1)
, color: '#000' // #rgb or #rrggbb or array of colors
, opacity: 0.25 // Opacity of the lines
, rotate: 0 // The rotation offset
, direction: 1 // 1: clockwise, -1: counterclockwise
, speed: 1.5 // Rounds per second
, trail: 60 // Afterglow percentage
, fps: 60 // Frames per second when using setTimeout() as a fallback for CSS
, zIndex: 2e9 // The z-index (defaults to 2000000000)
, className: 'spinner' // The CSS class to assign to the spinner
, top: '50%' // Top position relative to parent
, left: '50%' // Left position relative to parent
, shadow: true // Whether to render a shadow
, hwaccel: true // Whether to use hardware acceleration
, position: 'fixed' // Element positioning
}

var spinner;
var count = 0;

var Promise = require('bluebird');

var promise;

module.exports = {
    spin: function () {
        count++;
        if (count === 1) {
            var target = document.getElementById('spinner');
            promise = Promise.delay(300)
            .cancellable()
            .then(function () {
                spinner = new Spinner(opts).spin(target);
            })
        }
    },

    stop: function () {
        count--;
        if (count === 0) {
            if (promise) {
                promise.cancel()
                .catch(function () {})
                .finally(function () {
                    if (spinner)
                        spinner.stop();
                })
            }
        }
    }
};
