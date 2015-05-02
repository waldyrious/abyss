var express = require('express')
var app = express();
var bodyParser = require('body-parser')
var session = require('cookie-session');
var dao = require('./dao')

app.use(session({
  keys: ['asdf', 'bsdf'],
  signed: true,
  overwrite: true
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
      res.status(500).json('')
    }
});

app.use('/', function (req, res, next) {
  req.session.poop = 'pee'
  next()
})

app.use(express.static('client'));

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});
