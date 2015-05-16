var m = require('mithril');
var _ = require('lodash');

module.exports.ErrorHolder = function() {
	var error = null;
	var timeout;

	return function (value) {
		if (value) {
			error = value;

			if (timeout) {
				clearTimeout(timeout);
			}
			timeout = setTimeout(function () {
				error = null;
				m.redraw();
			}.bind(this), 4000);
		} else {
			return error;
		}
	}.bind(this);
};

module.exports.renderError = function (error) {
	if (!error) return null;

	var value;

	if (_.isObject(error())) {
		if (error().error && error().error.text)
			value = error().error.text;
	} else {
		value = error();
	}

	return m('div', {class:'bg-danger'}, value);
};