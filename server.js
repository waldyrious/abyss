"use strict";
const Promise = require('bluebird');

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
const app = express();
const bodyParser = require('body-parser');
const session = require('cookie-session');
const dao = require('./lib/dao');
const fs = require('fs');
const compression = require('compression');
const text = Promise.promisifyAll(require('./lib/textbelt/text'));
const Phone = require('./node_modules/phones/src/phone.js');

const SPDY = process.env.SPDY === 'true'
const PROD = process.env.PROD === 'true'
const HTTP2 = process.env.HTTP2 === 'true'
const SEND_CODES = process.env.SEND_CODES === 'true'

if (SEND_CODES)
console.log("Sending codes")
else
console.log("NOT sending codes")

app.set('x-powered-by', false)

const morgan  = require('morgan')
app.use(morgan('combined'))
app.use(compression())

app.use(session({
  keys: [fs.readFileSync('secret/cookie1', 'utf8'), fs.readFileSync('secret/cookie2', 'utf8')],
  signed: true,
  maxAge: 9999999000000
}));

app.use(bodyParser.json());

function updateDao(req) {
  if (req.session.phonenumber && req.session.subscriptionId) {
    return dao.addPhoneToSubId(req.session.phonenumber, req.session.subscriptionId)
  } else {
    return Promise.reject(new Error('invald'));
  }
}

const Message = require('./model/message')

app.post('/api/bro', function (req, res) {
  const from = req.session.phonenumber
  if (!from) res.status(401).send();

  const to = req.body.to
  const text = req.body.text

  var message = new Message();
  message.to = message.to.concat(to);
  message.from = from;
  message.text = text;
  dao.sendBro(message);
  console.log(message);
  res.status(200).json("bro'd!")
})

app.get('/api/bro', function (req, res) {
  const ph = req.session.phonenumber;
  if (!ph) res.status(401).send();

  dao.getBros(ph)
  .then(function (cursor) {
    return cursor.toArray();
  })
  .then(function (array) {
    return res.status(200).json(array);   
  })
})

app.delete('/api/bro/:id', function (req, res) {
  const ph = req.session.phonenumber;
  if (!ph) res.status(401).send();

  const id = req.params.id;
  dao.delete(ph, id)
  .then(function (cursor) {
    return res.status(200).json(cursor);
  })
  .catch(function (error) {
    return res.status(500).json(error);
  })
})

app.delete('/api/bro', function (req, res) {
  const ph = req.session.phonenumber;
  if (!ph) res.status(401).send();

  dao.deleteAllBros(ph)
  .then(function (response) {
    res.status(204).json();
  })
})

app.post('/api/registration/logout', function (req, res) {
  req.session = null
  res.status(200).json('Logged out')
});

app.post('/api/registration/subscription', function (req, res) {
    if (req.body.subscriptionId) {
      req.session.subscriptionId = req.body.subscriptionId
      updateDao(req)
      .then(function () {
        res.status(200).json('subscribed')  
      })
    } else {
      res.status(400).json('missing id')
    }
});

function genRand() {
  return Math.random().toString(10).substring(2, 8);
}

const auths = new Map();

app.post('/api/registration/phone', function (req, res) {
    if (req.body.phonenumber) {
      const ph = new Phone(req.body.phonenumber).strip();

      if (ph.length != 10) {
        res.status(400).json('phone number must be 10 digits');
        return;
      }

      const rand = genRand();
      req.session.phonenumberUnauthed = ph;
      auths.set(ph, rand);
      console.log("Code: " +rand + " for " + ph);

      if (SEND_CODES) {
        text.send(ph, "Bro code: " + rand);
      }
    }

    if (req.session.phonenumberUnauthed) {
      res.status(200).json('code sent')
    } else {
      res.status(400).json('invalid phone number')
    }
});

app.post('/api/registration/code', function (req, res) {
    if (req.body.code) {
      const ph = req.session.phonenumberUnauthed;
      const code = req.body.code;
      const realCode = auths.get(ph);

      if (req.body.code === realCode) {
        console.log(code + " matched code " + realCode + " for " + ph);
        req.session.phonenumber = ph;
        req.session.phonenumberUnauthed = null;
        auths.delete(ph);
        updateDao(req)
      }
    }

    if (req.session.phonenumber) {
      res.status(200).json(req.session.phonenumber)
    } else {
      res.status(500).json('invalid code')
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
