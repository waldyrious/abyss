var _ = require('lodash');

module.exports.buttonify = function (obj) {
	if (!obj) obj = {};
	return _.merge(obj, {
    	class: "btn btn-default"
    });
}

module.exports.bbuttonify = function (obj) {
	if (!obj) obj = {};
    return _.merge(obj, {
    	class: "btn btn-default btn-lg btn-primary"
    });
}

module.exports.pointer = function (obj) {
	if (!obj) obj = {};
	return _.merge(obj, {
		style: {
			cursor:'pointer'
		}
	})
}