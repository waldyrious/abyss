
// Auto creates the DB schema. Safe to run if it already exists.

const Promise = require('bluebird');
const r = require('./lib/db');

function ignore(e) {
	console.error(e);
	return true;
}

Promise.join(
	r.tableCreate('users').catch(ignore)
	, r.tableCreate('messages').catch(ignore)
)
.then(function () {
	return Promise.join(r.table('messages').indexCreate('from').catch(ignore),
	r.table('messages').indexCreate('from').catch(ignore)
	, r.table('messages').indexCreate('to').catch(ignore)
})
.then(function () {
	"use strict";
	console.log('Done.');
	r.getPoolMaster().drain(); // drain connection pool to allow process to exit.
});
