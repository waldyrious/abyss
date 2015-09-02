'use strict';
// Run this to auto-reload the server on file changes.
var nodemon = require('nodemon');

nodemon({
	script: 'webtls.js',
	ext: 'js json',
	"execMap": {
		"js": "node --harmony"
	},
	"ignore": [
		".git",
		"client/**",
		"**/*.spec.js"
	]
});
