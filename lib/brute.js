'use strict';

// Brute force protection middleware.

const BruteRethinkdb = require('brute-rethinkdb');
const Brute = require('koa-brute');
const secret = require('../secret/secret.json');
const db = require('./db');
const store = new BruteRethinkdb(db);
const bruteforce = new Brute(store, {
	freeRetries: 2
});

module.exports = bruteforce;
