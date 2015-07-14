'use strict';
var m = require('mithril');
var Promise = require('bluebird');

module.exports.controller = function(args, extras) {
	var self = this;
	self.to = [];

	var withAuth = function(xhr) {
		if (args.jwt()) {
			xhr.setRequestHeader('Authorization', 'Bearer ' + args.jwt());
		}
		return xhr;
	}

	self.files = m.prop();
	self.fileInput = m.prop();

	self.fileChange = function(ev) {
		self.files(ev.target.files);
	}

	self.uploads = [];
	self.uploadFile = function() {
		return Promise.map(Array.prototype.slice.call(self.files()), function(file, index) {
				var data = new FormData();
				data.append("file", file);

				self.uploads[index] = {
					name: file.name,
					loaded: 0,
					total: file.size
				}

				var xhrConfig = function(xhr) {
					xhr = withAuth(xhr);
					xhr.upload.addEventListener("progress", function(ev) {
						self.uploads[index].loaded = ev.loaded;
						// self.uploads[index].total = ev.total;
						m.redraw();
					});
				}

				return m.request({
					method: "POST",
					url: '/api/file?group=' + encodeURIComponent(JSON.stringify(self.to)) + '&type=' + encodeURIComponent(file.type) + '&lastModified=' + encodeURIComponent(file.lastModified) + '&size=' + encodeURIComponent(file.size) + '&name=' + encodeURIComponent(file.name),
					data: data,
					config: xhrConfig,
					serialize: function(data) {
						return data
					}
				})
				.then(args.refresh)
			}, {
				concurrency: 1
			})
			.then(function() {
				//reset file input here
				self.fileInput().value = '';
				self.uploads = [];
				self.files(undefined);
			})
			.then(args.refresh)
	}
}

module.exports.view = function(ctrl, args, extras) {
	var sendButton;

	// since args.to changes, we have to pass it back to the controller, since the controller is only initialized once.
	ctrl.to = args.to;

	function sendButtonConfig(element, isInitialized) {
		sendButton = element;
	}

	return m('div', {
			style: {
				'margin-top': '4px'
			}
	},[
		m('button.btn btn-success glyphicon glyphicon-file', {
			disabled: ctrl.files() ? false : true,
			onclick: ctrl.uploadFile,
			config: sendButtonConfig
		}, ' Send files'),
		' ',
		ctrl.uploads.length > 0 ? ctrl.uploads.map(function (upload) {
			return m('div', upload.name + ' ' + Math.trunc(upload.loaded / upload.total * 100) + '% (' + upload.loaded + '/' + upload.total + ' uploaded)')
		}) : '',
		' ',
		m('input', {
			style: {
				display: 'inline'
			},
			type: 'file',
			multiple: true,
			config: ctrl.fileInput,
			onchange: ctrl.fileChange
		})
	])
}
