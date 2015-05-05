var express = require('express')
var app = express();
var bodyParser = require('body-parser')
var session = require('cookie-session');
var dao = require('./lib/dao')
var fs = require('fs')
var http =require('http')
var https = require('https')
var compression = require('compression')

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
  var to = req.body.to
  var text = req.body.text
  var fro = req.session.phonenumber
  dao.sendBro(fro, to, text)
  res.status(200).json("bro'd!")
})

app.get('/api/bro', function (req, res) {
  var ph = req.session.phonenumber
  res.status(200).json(dao.getBros(ph))
})

app.delete('/api/bro', function (req, res) {
  var ph = req.session.phonenumber
  res.status(200).json(dao.deleteAllBros(ph))
})


app.post('/api/registration/subscription', function (req, res) {
    if (req.body.subscriptionId) {
      req.session.subscriptionId = req.body.subscriptionId
      updateDao(req)
      res.status(200).json('boop!')
    } else {
      res.status(500).json('brah!')
    }
});

app.post('/api/registration/phone', function (req, res) {
    if (req.body.phonenumber) {
      req.session.phonenumber = req.body.phonenumber
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


var privateKey  = fs.readFileSync('secret/server.key', 'utf8');
var certificate = fs.readFileSync('secret/server.crt', 'utf8');

var credentials = {key: privateKey, cert: certificate};

var server = https.createServer(credentials, app);
var spdy = require('spdy')
var http2 = require('http2')
var server = spdy.createServer(credentials, app);
server.listen(443);

var redirect = false

if (redirect) {
  var http = require('http');
  http.createServer(function (req, res) {
      res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
      res.end();
  }).listen(80);
} else {
  console.log('here')
  var http = require('http');
  http.createServer(app).listen(80);
}
