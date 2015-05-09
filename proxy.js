var net = require('net');
var socket = new net.Server();
socket.listen(8000);

process.setgid('nobody');
process.setuid('nobody');
process.setegid('nobody');
process.seteuid('nobody');

var httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer();
var http = require('http');
var fs = require('fs');
var auth = require('./secret/proxyauth.json').auth;
console.log(auth)

http.createServer(function (req, res) {
  if (!req.headers['authorization'] || req.headers['authorization'] !== auth) {
    res.writeHead(401, {
      'WWW-Authenticate': 'Basic realm="users"'
    });
    res.end();
  } else 
    proxy.web(req, res, { target: 'http://localhost:8080/' });
}).listen(socket);

