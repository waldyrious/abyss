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
const Phone = require('./model/phone.js');
const _ = require('lodash');

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
    .catch(function (error) {
      console.error(error);
    })
  } 
}

const Message = require('./model/message')

app.all('/*', function(req, res, next) {
  if (req.host.match(/^www/) !== null ) {
    res.redirect(301, req.protocol + req.headers.host.replace(/^www\./, '') + req.url);
  } else {
    next();     
  }
})

app.all('/api/bro*', function (req, res, next) {
  if (!req.session.phonenumber) res.status(401).send();
  else next();
})

app.post('/api/bro', function (req, res) {
  var to = req.body.to

  if (!_.isArray(to)) {
    res.status(400).json('to must be array');
  }

  var to = to.map(function (item) {
    return new Phone(item).strip()
  });

  var invalid = false;

  to.forEach(function (item) {
    var x = new Phone(item);
    if (x.strip().length != 10) {
        invalid = true;
    }  
  });

  if (invalid) {
    res.status(400).json('bad to');
    return;
  }
  
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
  dao.getBros(req.session.phonenumber)
  .then(function (cursor) {
    return cursor.toArray();
  })
  .then(function (array) {
    return res.status(200).json(array);   
  })
})

app.delete('/api/bro/:id', function (req, res) {
  const id = req.params.id;
  dao.delete(req.session.phonenumber, id)
  .then(function (cursor) {
    return res.status(200).json(cursor);
  })
  .catch(function (error) {
    return res.status(500).json(error);
  })
})

app.delete('/api/bro', function (req, res) {
  dao.deleteAllBros(req.session.phonenumber)
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
      .catch(function (error) {
        res.status(500).json(error);
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

      dao.addVerificationCode(ph, rand)
      .then(function () {
        console.log("Code: " +rand + " for " + ph);

        if (SEND_CODES) {
          text.send(ph, "Bro code: " + rand);
        } 
      })
      
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
    dao.getVerificationCodes(ph)
    .then (function (realCodes) {
      if (_.contains(realCodes.codes, req.body.code)) {
        console.log(code + " matched code " + realCodes.codes + " for " + ph);
        req.session.phonenumber = ph;
        req.session.phonenumberUnauthed = null;
        auths.delete(ph);
        return updateDao(req)
      }
    })
    .then(function () {
      if (req.session.phonenumber) {
        res.status(200).json(req.session.phonenumber)
      } else {
        res.status(401).json('invalid code')
      } 
    })
  } else {
    res.status(401).json('not logged in')
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
