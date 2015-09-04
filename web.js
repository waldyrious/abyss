'use strict';

console.log('Starting server at ' + (new Date).toISOString());

process.on('exit', function () {
	console.log('Process exit at ' + (new Date).toISOString());
});

const Promise = require('bluebird');
Promise.longStackTraces();

const sticky = require('socketio-sticky-session');
const fs = require('fs');
const net = require('net');
const app = require('./lib/app');
const secret = require('./secret/secret.json');

var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

const sockets = require('./lib/sockets')

var httpPort = 3000;

if (process.getuid() === 0) { // if we are root
	httpPort = 80;
} else { // we are not root, can only use sockets >1024
	httpPort = 3000;
}

function getServer() {
	var http = require('http');
	var httpServer = http.createServer(app.callback());

	sockets.register(require('socket.io').listen(httpServer));
	return httpServer;
}

if (secret.cluster) {
	sticky(function () {
		return getServer();
	}).listen(httpPort, function () {
		console.log('Cluster worker ' + (cluster.worker ? cluster.worker.id : '') + ' HTTP server listening on port ' + httpPort);
	});
} else {
	getServer().listen(httpPort, function () {
		console.log('HTTP server (no cluster) listening on port ' + httpPort);
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
