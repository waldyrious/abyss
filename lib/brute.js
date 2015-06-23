'use strict';

// Brute force protection middleware.

const BruteRethinkdb = require('brute-rethinkdb');
const Brute = require('koa-brute');
var options = {
	servers: []
};
const secret = require('../secret/secret.json');
options.servers = secret.databases;
var store = new BruteRethinkdb(options);

const bruteforce = new Brute(store, {
	freeRetries: 2
});

module.exports = bruteforce;
