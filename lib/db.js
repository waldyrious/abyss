const secret = require('../secret/secret.json');
const options = {
	servers: secret.databases
};

const r = module.exports = require('rethinkdbdash')(options);