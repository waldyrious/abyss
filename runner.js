'use strict';
// Run this to auto-reload the server on file changes.
var Promise = require('bluebird');
var nodemon = require('nodemon');

nodemon({
	script: 'server.js',
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

var vm = require('vm');

var fs = Promise.promisifyAll(require('fs'));
var path = require('path');

var file = path.join(__dirname +'/client/main.js');

var lastWrite = Promise.resolve(true);

/*
var w = watchify(browserify(file, watchify.args));
w.on('update', function () {
	w.bundle(function (err, src) {
		if (err) {
			console.error(err);
			//w.close();
		} else if (src) {
			lastWrite.then(function () {
				console.log('Rebundling front end');
				lastWrite = fs.writeFileAsync(__dirname + '/client/bundle.js', src)
				.then(function () {
					console.log('done');
				})
			})
		}
	});
});

w.emit('update'); // trigger initial build
*/
