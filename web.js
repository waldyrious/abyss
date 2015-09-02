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

const http = require('http');

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

const sockets = require('./lib/sockets')

if (secret.cluster && cluster.isMaster) {
	// Fork workers.
	for (var i = 0; i < numCPUs; i++) {
		cluster.fork();
	}

	cluster.on('exit', function(worker, code, signal) {
		console.log('worker ' + worker.process.pid + ' died');
	});
} else {
	var httpPort;
	if (process.getuid() === 0) { // if we are root
		httpPort = 80;
	} else { // we are not root, can only use sockets >1024
		httpPort = 3000;
	}

	var httpServer = http.createServer(app.callback());
	httpServer.listen(httpPort);

	console.log('HTTP server listening on port ' + httpPort);
	sockets.register(require('socket.io').listen(httpServer));

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
}
