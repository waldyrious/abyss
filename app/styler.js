var merge = require('lodash/object/merge');

module.exports.buttonify = function (obj) {
	if (!obj) obj = {};
	return merge(obj, {
    	class: "btn btn-default"
    });
};

module.exports.bbuttonify = function (obj) {
	if (!obj) obj = {};
    return merge(obj, {
    	class: "btn btn-default btn-lg btn-primary"
    });
};

module.exports.pointer = function (obj) {
	if (!obj) obj = {};
	return merge(obj, {
		style: {
			cursor:'pointer'
		}
	})
};

module.exports.round = function (obj) {
	if (!obj) obj = {};
	return merge(obj, {
		style: {
			'border-radius':'1em'
		}
	})
};

module.exports.refreshIcon = function (o) {
	if (!obj) obj = {};
	return merge(obj, {
		class: "glyphicon glyphicon-refresh"
	});
}
