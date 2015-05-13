"use strict";
const Promise = require('bluebird');
const fs = require('fs');

const SPDY = process.env.SPDY === 'true'
const PROD = process.env.PROD === 'true'
const HTTP2 = process.env.HTTP2 === 'true'

const net = require('net');
const socket80 = new net.Server();
socket80.listen(80);
const socket443 = new net.Server();
socket443.listen(443);

process.setgid('nobody');
process.setuid('nobody');
process.setegid('nobody');
process.seteuid('nobody');

const express = require('express');
const app = require('./lib/app')

const privateKey  = fs.readFileSync('secret/server.key', 'utf8');
const certificate = fs.readFileSync('secret/server.crt', 'utf8');

const credentials = {key: privateKey, cert: certificate};

var server;
if (SPDY) {
  console.log('SPDY enabled')
  server = require('spdy').createServer(credentials, app);  
} else if (HTTP2) {
  console.log('HTTP2 enabled')
  server = require('http2').createServer(credentials, app);  
} else {
  console.log('HTTPS enabled')
  server = require('https').createServer(credentials, app);  
}
server.listen(socket443);


const http =require('http')
if (PROD) {
  console.log('HTTP redirect enabled')
  http.createServer(function (req, res) {
      res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
      res.end();
  }).listen(socket80);
} else {
  console.log('HTTP redirect disabled')
  http.createServer(app).listen(socket80);
}
