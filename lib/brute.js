'use strict';

// Brute force protection middleware.

const BruteRethinkdb = require('brute-rethinkdb');
const ExpressBrute = require('express-brute');
var options = {
    servers: []
};
const secret = require('../secret/secret.json');
options.servers = secret.databases;
var store = new BruteRethinkdb(options);

const bruteforce = new ExpressBrute(store, {
  freeRetries: 2,
  handleStoreError: function (err) {
    // This is the default handler code, which exits the process
    // throw {
    //  message: err.message,
    //  parent: err.parent
    // };

    // This following code sends a 500 response
    // and doesn't exit the process, allowing the connection pool to retry
    console.error(err.message);
    err.res.status(500).json({
      message: err.message,
      parent: err.parent
    });
  }
});

module.exports = bruteforce;