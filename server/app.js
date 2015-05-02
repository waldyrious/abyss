var app = require('express')();
var bodyParser = require('body-parser')
var session = require('cookie-session');

app.use(session({
  keys: ['asdf', 'bsdf'],
  signed: true,
  overwrite: true
}));

app.use(bodyParser.json());


app.post('/api/subscription', function (req, res) {
    console.log(req.session)
    req.session.subscriptionId = req.body.subscriptionId
    console.log(req.session)
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
