// Auto creates the DB schema. Safe to run if it already exists.
'use strict';

const Promise = require('bluebird');
const r = require('./lib/db');

function ignore(e) {
	console.error(e);
	return true;
}

Promise.coroutine(function*() {
	yield Promise.join(
		r.tableCreate('users').catch(ignore), r.tableCreate('messages').catch(ignore)
	);

	yield Promise.join(r.table('messages').indexCreate('from').catch(ignore),
		r.table('messages').indexCreate('from').catch(ignore), r.table('messages').indexCreate('to').catch(ignore)
	)

	console.log('Done.');
	r.getPoolMaster().drain(); // drain connection pool to allow process to exit.

})();
