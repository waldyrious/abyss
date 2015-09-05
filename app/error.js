var m = require('mithril');

module.exports.ErrorHolder = function() {
	var error = null;
	var timeout;

	return function (value) {
		if (value) {

			if (value.message && value.message.indexOf('UnauthorizedError: No Authorization header found') > -1) {
				m.route('/login');
				return;
			}
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
	if (!error || error() === null || error() === {} ) {
		return null;
	}

	var value;
	if (error() !== null && error().message) {
			value = error().message;
			if (error().retryAfter) {
				value = 'Too many login attempts. Try again in ' + error().retryAfter + ' seconds.';
			}
	} else {
		value = error();
	}

	return m('div.alert alert-danger', {role:'alert'},
		m('span.glyphicon glyphicon-exclamation-sign'),
		m('span.sr-only', 'Error:'), ' '+value);
};
