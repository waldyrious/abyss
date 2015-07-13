'use strict';

console.log('Starting server at ' + (new Date).toISOString());

process.on('exit', function () {
	console.log('Process exit at ' + (new Date).toISOString());
});

const Promise = require('bluebird');
Promise.longStackTraces();
const co = require('co');
require('bluebird-co');
co.wrap = function(fn) {
    return Promise.coroutine(fn);
}
//Optionally use bluebird Promises globally
global.Promise = Promise;

const fs = require('fs');
const net = require('net');
const app = require('./lib/app');
const secret = require('./secret/secret.json');

const http = require('http');
const spdy = require('spdy');
const http2 = require('http2');
const https = require('https');

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

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
	var httpsPort;

	if (process.getuid() === 0) { // if we are root

		httpPort = 80;
		httpsPort = 443;

		// we have opened the sockets, now drop our root privileges
		process.setgid('nobody');
		process.setuid('nobody');

		// Newer node versions allow you to set the effective uid/gid
		if (process.setegid) {
			process.setegid('nobody');
			process.seteuid('nobody');
		}
	} else { // we are not root, can only use sockets >1024
		httpPort = 3000;
		httpsPort = 8443;
	}


	var credentials;

	try {
		var privateKey = fs.readFileSync('secret/server.key', 'utf8');
		var certificate = fs.readFileSync('secret/server.crt', 'utf8');
		credentials = {key: privateKey, cert: certificate};
	} catch (e) {
		console.error(e);
	}

	if (!credentials && (secret.spdy || secret.http2 || secret.https)) {
		console.error("SSL certs need to be installed for SPDY/HTTP2/HTTPS");
		process.exit(1);
	}

	var server;
	if (secret.spdy) {
		console.log('SPDY enabled');
		server = spdy.createServer(credentials, app.callback());
	} else if (secret.http2) {
		console.log('HTTP2 enabled');
		server = http2.createServer(credentials, app.callback());
	} else if (secret.https) {
		console.log('HTTPS enabled');
		server = https.createServer(credentials, app.callback());
	}
	if (server) {
		server.listen(httpsPort);
		console.log('HTTPS server listening on port ' + httpsPort);
	}

	http.createServer(app.callback()).listen(httpPort);
	console.log('HTTP server listening on port ' + httpPort);
}

/*
const monitor = require('event-loop-monitor');

monitor.on('data', function(latency) {
	console.log(latency); // { p50: 1026, p90: 1059, p95: 1076, p99: 1110, p100: 1260 }
});
monitor.resume();
*/
