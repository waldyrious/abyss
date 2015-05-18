var extend = require('xtend');

module.exports.buttonify = function (obj) {
	if (!obj) obj = {};
	return extend(obj, {
    	class: "btn btn-default"
    });
};

module.exports.bbuttonify = function (obj) {
	if (!obj) obj = {};
    return extend(obj, {
    	class: "btn btn-default btn-lg btn-primary"
    });
};

module.exports.pointer = function (obj) {
	if (!obj) obj = {};
	return extend(obj, {
		style: {
			cursor:'pointer'
		}
	})
};
