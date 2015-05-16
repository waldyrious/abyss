'use strict';

var test = require('tape');

var Phone = require('./phone');

test('shouldnt need new', function (t) {
	t.plan(1);

	var good = Phone('+1555-555-5555');
	t.equal(good.strip(), '15555555555');
});

test('should', function (t) {
	t.plan(1);

	var good = new Phone('+1555-555-5555');
	t.equal(good.strip(), '15555555555');
});
