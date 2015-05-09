'use strict';

var test = require('tape');

var dao = require('../lib/dao')
var Phone = require('../model/phone')

test('add code', function (t) {
	t.plan(1);

	var ph = Phone('555-555-5555');
	ph.strip();

	dao.addVerificationCode(ph.strip(), '123456')
	.then(function () {
		return dao.getVerificationCodes(ph.strip());
	})
	.then(function (res) {
		t.deepEqual(res, {
			id: '5555555555',
			codes: ['123456']
		})
	})
})

test('exit', function (t) {
	t.end();
	process.exit();
})
