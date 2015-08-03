'use strict';
var m = require('mithril');
var Promise = require('bluebird');
Promise.longStackTraces();
var identity = require('./identity');

// require('intl');

var uploads = [];

module.exports.controller = function(args, extras) {
	var self = this;
	self.to = [];

	if (window.Intl) {
		var inf = new Intl.NumberFormat();
		self.nf = function(num) {
			return inf.format(num);
		}
	} else {
		self.nf = function(num) {
			return num;
		}
	}

	self.files = m.prop();
	self.fileInput = m.prop();
	self.uploads = uploads; // keep outside of controller, to preserve across controller reinitialization.

	self.fileChange = function(ev) {
		if (ev.target.files.length === 0) {
			self.files(null);
		} else {
			self.files(ev.target.files);
		}
	}

	self.abortOrClear = function(upload) {
		var index = self.uploads.indexOf(upload);
		var xhr = upload.xhr;
		if (xhr.readyState === 4 || xhr.readyState === 0) {
			self.uploads.splice(index, 1);
		} else {
			xhr.abort();
		}
	}

	self.uploadsComplete = function() {
		if (self.uploads.length === 0) {
			return true;
		} else {
			for (var i = 0; i < self.uploads.length; i++) {
				if (self.uploads[i] && self.uploads[i].xhr.readyState && self.uploads[i].xhr.readyState !== 4) {
					return false;
				}
			}
			return true;
		}
	}

	self.remove = function(upload) {
		var index = self.uploads.indexOf(upload);
		self.uploads.splice(index, 1);
	}

	module.exports.uploadFile = self.uploadFile = function(arg) {
		var files;

		if (arg instanceof DataTransferItemList) {
			var newfiles = [];
			for (var i=0; i<arg.length; i++) {
				if (arg[i].kind === 'file') {
					newfiles.push(arg[i].getAsFile());
				}
			}
			files = newfiles;
		} else if (arg instanceof Event) { // user clicked "upload files"
			files = Array.prototype.slice.call(self.fileInput().files);
		} else {
			throw new TypeError('unable to handle ' + arg);
		}

		return Promise.map(files, function(file, index) {
				index = index + self.uploads.length; // account for possible concurrent uploads from prior click.
				var data = new FormData();
				data.append("file", file);

				var upload = {
					name: file.name,
					loaded: 0,
					total: file.size
				}

				self.uploads.push(upload);

				var xhrConfig = function(xhr) {
					xhr = identity.withAuth(xhr);
					self.uploads[self.uploads.indexOf(upload)].xhr = xhr;
					xhr.upload.addEventListener("progress", function(ev) {
						self.uploads[self.uploads.indexOf(upload)].loaded = ev.loaded;
						self.uploads[self.uploads.indexOf(upload)].total = ev.total;
						m.redraw();
					});
					xhr.upload.addEventListener("abort", function(ev) {
						self.uploads[self.uploads.indexOf(upload)].loaded = undefined;
						self.uploads[self.uploads.indexOf(upload)].aborted = true;
						m.redraw();
					});
					xhr.upload.addEventListener("error", function(err) {
						self.uploads[self.uploads.indexOf(upload)].loaded = undefined;
						self.uploads[self.uploads.indexOf(upload)].error = err;
						m.redraw();
					});
					xhr.upload.addEventListener("load", function(err) {
						self.uploads[self.uploads.indexOf(upload)].done = true;
						m.redraw();
					});
				}


				return m.request({
						method: "POST",
						url: '/api/file?' + m.route.buildQueryString({
							to: self.to,
							type: file.type,
							lastModified: file.lastModified,
							size: file.size,
							name: file.name
						}),
						data: data,
						config: xhrConfig,
						serialize: function(data) {
							return data
						}
					})
					.then(function() {
						// setTimeout(function () {
						// 	self.uploads.splice(index, 1);
						// 	m.redraw();
						// }, 500);
					}, function() {
						// we handled errors with the xhr event listeners
					})
			}, {
				concurrency: 1
			})
			.then(function() {
				if (self.uploadsComplete()) {
					self.fileInput().value = '';
					self.uploads = [];
					return args.refresh();
				}
			})
	}
}

function truncate(number) {
	return number > 0 ? Math.floor(number) : Math.ceil(number);
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
	}, [
		ctrl.uploads.length > 0 ? ctrl.uploads.map(function(upload) {
			if (upload.err) {
				return m('div', upload.name + ' errored.')
			} else if (upload.aborted) {
				return m('div', upload.name + ' aborted.',
					m('button.btn btn-default glyphicon glyphicon-remove', {
						onclick: function() {
							ctrl.remove(upload);
						}
					}))
			} else {
				return m('div', upload.name + ' ' + truncate(upload.loaded / upload.total * 100) + '% (' + ctrl.nf(upload.loaded) + ' / ' + ctrl.nf(upload.total) + ' uploaded)',
					' ',
					m('button.btn glyphicon', {
						class: upload.done ? 'glyphicon-ok btn-success' : 'glyphicon-stop btn-danger',
						onclick: function() {
							ctrl.abortOrClear(upload);
						}
					})
				)
			}
		}) : '',
		m('button.btn btn-success glyphicon glyphicon-cloud-upload', {
			disabled: ctrl.files() ? false : true,
			onclick: ctrl.uploadFile,
			config: sendButtonConfig
		}, ' Send files'),

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
