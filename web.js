'use strict';
console.log('Starting server at ' + (new Date).toISOString());
process.on('exit', function () {
	console.log('Process exit at ' + (new Date).toISOString());
});

const Promise = require('bluebird');
const sticky = require('socketio-sticky-session');
const secret = require('./secret/secret.json');
const cluster = require('cluster');
const sockets = require('./lib/sockets')

if (process.getuid() === 0) { // if we are root
	var port = 80;
} else { // we are not root, can only use sockets >1024
	var port = 3000;
}

function getServer() {
	var server = require('http').createServer(require('./lib/app').callback());
	sockets.register(require('socket.io').listen(server));
	return server;
}

if (secret.cluster) {
	sticky(function () {
		return getServer();
	}).listen(port, function () {
		console.log('Cluster worker ' + (cluster.worker ? cluster.worker.id : '') + ' HTTP server listening on port ' + port);
	});
} else {
	getServer().listen(port, function () {
		console.log('HTTP server (no cluster) listening on port ' + port);
	});
}

if (process.getuid() === 0) { // if we are root
	// we have opened the sockets, now drop our root privileges
	process.setgid('nobody');
	process.setuid('nobody');

	// Newer node versions allow you to set the effective uid/gid
	if (process.setegid) {
		process.setegid('nobody');
		process.seteuid('nobody');
	}
}
