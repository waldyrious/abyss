'use strict';

console.log('Starting TLS server at ' + (new Date).toISOString());

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
const spdy = require('spdy');
const https = require('https');

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
	var httpsPort;

	if (process.getuid() === 0) { // if we are root
		httpsPort = 443;
	} else { // we are not root, can only use sockets >1024
		httpsPort = 8443;
	}

	var credentials;

	var privateKey = fs.readFileSync('secret/server.key', 'utf8');
	var certificate = fs.readFileSync('secret/server.crt', 'utf8');
	credentials = {key: privateKey, cert: certificate};

	if (!credentials && (secret.spdy || secret.https)) {
		console.error("SSL certs need to be installed for SPDY/HTTPS");
		process.exit(1);
	}

	var server;

	if (secret.spdy) {
		console.log('SPDY enabled');
		server = spdy.createServer(credentials, app.callback());
	} else if (secret.https) {
		console.log('HTTPS enabled');
		server = https.createServer(credentials, app.callback());
	}

	if (server) {
		server.listen(httpsPort);
		sockets.register(require('socket.io').listen(server));
		console.log('HTTPS server listening on port ' + httpsPort);
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
}
