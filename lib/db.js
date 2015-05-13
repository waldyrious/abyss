const dbconfig = require('../secret/db.json');
const options = {
	servers: []
}

options.servers.push(dbconfig);

const r = module.exports = require('rethinkdbdash')(options);