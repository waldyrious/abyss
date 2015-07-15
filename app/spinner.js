var Spinner = require('spin.js');

var opts = {
  lines: 24 // The number of lines to draw
, length: 12 // The length of each line
, width: 14 // The line thickness
, radius: 42 // The radius of the inner circle
, scale: 1 // Scales overall size of the spinner
, corners: 1 // Corner roundness (0..1)
, color: '#4cae4c' // #rgb or #rrggbb or array of colors
, opacity: 0.05 // Opacity of the lines
, rotate: 0 // The rotation offset
, direction: 1 // 1: clockwise, -1: counterclockwise
, speed: 3 // Rounds per second
, trail: 60 // Afterglow percentage
, fps: 60 // Frames per second when using setTimeout() as a fallback for CSS
, zIndex: 2e9 // The z-index (defaults to 2000000000)
, className: 'spinner' // The CSS class to assign to the spinner
, top: '50%' // Top position relative to parent
, left: '50%' // Left position relative to parent
, shadow: true // Whether to render a shadow
, hwaccel: true // Whether to use hardware acceleration
, position: 'absolute' // Element positioning
}

var target = document.getElementById('spinner');
var spinner = new Spinner(opts).spin(target);
var count = 1;

module.exports = {
    spin: function () {
        count++;
        if (count === 1) {
            spinner = new Spinner(opts).spin(target);
        }
    },

    stop: function () {
        count--;
        if (count === 0) {
             spinner.stop();
        }
    }
};
