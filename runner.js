
// Run this to auto-reload the server on file changes.

var nodemon = require('nodemon');

nodemon({
	script: 'server.js',
	ext: 'js json',
	"execMap": {
		"js": "node --harmony"
	}
});

//var browserify = require('browserify');
//var watchify = require('watchify');
//var fromArgs = require('watchify/bin/args');
//
//var b = browserify({ cache: {}, packageCache: {} });
//var w = watchify(b);
