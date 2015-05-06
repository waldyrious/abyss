var uuid = require('uuid');

module.exports = function Message () {	
	this.text = '';
	this.from = '';
	this.to = [];
	this.id = uuid();
	this.deletedBy = [];
	this.date = new Date();
}