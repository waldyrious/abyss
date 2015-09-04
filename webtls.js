'use strict';

console.log('Starting TLS server at ' + (new Date).toISOString());

process.on('exit', function () {
	console.log('Process exit at ' + (new Date).toISOString());
});

const Promise = require('bluebird');
Promise.longStackTraces();

const sticky = require('socketio-sticky-session');
const fs = require('fs');
const secret = require('./secret/secret.json');
const cluster = require('cluster');

const sockets = require('./lib/sockets')

var port = 3000;

if (process.getuid() === 0) { // if we are root
	port = 443;
} else { // we are not root, can only use sockets >1024
	port = 8443;
}

var credentials;

var privateKey = fs.readFileSync('secret/server.key', 'utf8');
var certificate = fs.readFileSync('secret/server.crt', 'utf8');
credentials = {key: privateKey, cert: certificate};

if (!credentials && (secret.spdy || secret.https)) {
	console.error("SSL certs need to be installed for SPDY/HTTPS");
	process.exit(1);
}

function getServer() {
	var server;
	if (secret.spdy) {
		console.log('SPDY enabled');
		server = require('spdy').createServer(credentials, require('./lib/app').callback());
	} else if (secret.https) {
		console.log('HTTPS enabled');
		server = require('https').createServer(credentials, require('./lib/app').callback());
	}
	sockets.register(require('socket.io').listen(server));
	return server;
}

if (secret.cluster) {
	sticky(function () {
		return getServer();
	}).listen(port, function () {
		console.log('Cluster worker ' + (cluster.worker ? cluster.worker.id : '') + ' HTTPS server listening on port ' + port);
	});
} else {
	getServer().listen(port, function () {
		console.log('HTTPS server (no cluster) listening on port ' + port);
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
