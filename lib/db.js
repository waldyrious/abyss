const secret = require('../secret/secret.json');
const options = secret.rethinkdboptions;

const r = module.exports = require('rethinkdbdash')(options);
