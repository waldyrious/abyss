'use strict';
var m = require('mithril');

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


	self.uploadTotal = m.prop();
	self.uploaded = m.prop();
	self.uploadFile = function() {
		self.uploadTotal(0);
		self.uploaded(0);

		var fileList = self.files();

		var data = new FormData();
		var file = fileList[0];

		data.append("file", file);

		var xhrConfig = function(xhr) {
			xhr = withAuth(xhr);
			xhr.upload.addEventListener("progress", function(ev) {
				self.uploaded(ev.loaded);
				self.uploadTotal(ev.total);
				m.redraw();
			});
		}

		m.request({
				method: "POST",
				url: '/api/file?group=' + encodeURIComponent(JSON.stringify(self.to)) + '&type=' + encodeURIComponent(file.type) + '&lastModified=' + encodeURIComponent(file.lastModified) + '&size=' + encodeURIComponent(file.size) + '&name=' + encodeURIComponent(file.name),
				data: data,
				config: xhrConfig,
				serialize: function(data) {
					return data
				}
			})
			.then(function() {
				//reset file input here
				self.fileInput().value = '';
				self.uploadTotal(undefined);
				self.uploaded(undefined);
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

	return m('div', [
		m('button.btn btn-success glyphicon glyphicon-file', {
			disabled: ctrl.files() ? false : true,
			onclick: ctrl.uploadFile,
			config: sendButtonConfig
		}, ' Send file'),
		ctrl.uploaded() ? m('span', ' ' + Math.trunc(ctrl.uploaded() / ctrl.uploadTotal() * 100) + '% (' + ctrl.uploaded() + '/' + ctrl.uploadTotal() + ' uploaded)') : null,
		m('input', {
			style: {
				display: 'inline'
			},
			type: 'file',
			config: ctrl.fileInput,
			onchange: ctrl.fileChange
		})
	])
}
