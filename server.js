'use strict';

const Promise = require('bluebird');
const fs = require('fs');

const net = require('net');
const socket80 = new net.Server();
const socket443 = new net.Server();

if (process.getuid() === 0) { // if we are root

	socket80.listen(80);
	socket443.listen(443);

	// we have opened the sockets, now drop our root privileges
	process.setgid('nobody');
	process.setuid('nobody');

	// Newer node versions allow you to set the effective uid/gid
	if (process.setegid) {
		process.setegid('nobody');
		process.seteuid('nobody');
	}
} else { // we are not root, can only use sockets >1024
	socket80.listen(3000);
	socket443.listen(8443);
}

const express = require('express');
const app = require('./lib/app');
const secret = require('./secret/secret.json');

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
	server = require('spdy').createServer(credentials, app);
} else if (secret.http2) {
	console.log('HTTP2 enabled');
	server = require('http2').createServer(credentials, app);
} else if (secret.https) {
	console.log('HTTPS enabled');
	server = require('https').createServer(credentials, app);
}
if (server) {
	server.listen(socket443);
	console.log('HTTPS server listening on port ' + socket443.address().port);
}


const http = require('http');
if (secret.httpredirect) {
	console.log('redirect-to-HTTPS enabled');
	http.createServer(function (req, res) {
		res.writeHead(301, {"Location": "https://" + req.headers['host'] + req.url});
		res.end();
	}).listen(socket80);
} else {
	console.log('redirect-to-HTTPS disabled');
	http.createServer(app).listen(socket80);
	console.log('HTTP server listening on port ' + socket80.address().port);
}
