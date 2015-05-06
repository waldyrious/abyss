"use strict";
const Promise = require('bluebird');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const session = require('cookie-session');
const dao = require('./lib/dao');
const fs = require('fs');
const compression = require('compression');
const text = Promise.promisifyAll(require('./lib/textbelt/text'));
const Phone = require('./node_modules/phones/src/phone.js');

const SPDY = process.env.SPDY
const PROD = process.env.PROD
const HTTP2 = process.env.HTTP2

app.set('x-powered-by', false)

app.use(compression())

app.use(session({
  keys: [fs.readFileSync('secret/cookie1', 'utf8'), fs.readFileSync('secret/cookie2', 'utf8')],
  signed: true,
  maxAge: 9999999000000
}));

app.use(bodyParser.json());

function updateDao(req) {
  if (req.session.phonenumber && req.session.subscriptionId) {
    dao.addPhoneToSubId(req.session.phonenumber, req.session.subscriptionId)
  }
}

app.post('/api/bro', function (req, res) {
  const to = req.body.to
  const text = req.body.text
  const fro = req.session.phonenumber
  dao.sendBro(fro, to, text)
  res.status(200).json("bro'd!")
})

app.get('/api/bro', function (req, res) {
  const ph = req.session.phonenumber
  res.status(200).json(dao.getBros(ph))
})

app.delete('/api/bro', function (req, res) {
  const ph = req.session.phonenumber
  res.status(200).json(dao.deleteAllBros(ph))
})

app.post('/api/registration/logout', function (req, res) {
  req.session = null
  res.status(200).json('Logged out')
});

app.post('/api/registration/subscription', function (req, res) {
    if (req.body.subscriptionId) {
      req.session.subscriptionId = req.body.subscriptionId
      updateDao(req)
      res.status(200).json('boop!')
    } else {
      res.status(500).json('bruhhhhh!')
    }
});

function genRand() {
  var a = [];
  for (var i=0; i<6; i++) {
    a.push(Math.round(Math.random()*10));
  }
  return a.join('')
}

app.post('/api/registration/phone', function (req, res) {
    if (req.body.phonenumber) {
      var ph = new Phone(req.body.phonenumber).strip();
      req.session.phonenumber = ph
      req.session.rand = genRand();
      text.send(ph, "Bro code: " + req.session.rand)
      updateDao(req)
    }

    if (req.session.phonenumber) {
      res.status(200).json(req.session.phonenumber)
    } else {
      res.status(500).json('')
    }
});

app.get('/api/registration/phone', function (req, res) {
    if (req.session.phonenumber) {
      res.status(200).json(req.session.phonenumber)
    } else {
      res.status(200).json('')
    }
});

app.use(express.static('client'));

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
server.listen(443);


const http =require('http')
if (PROD) {
  console.log('HTTP redirect enabled')
  http.createServer(function (req, res) {
      res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
      res.end();
  }).listen(80);
} else {
  console.log('HTTP redirect disabled')
  http.createServer(app).listen(80);
}
