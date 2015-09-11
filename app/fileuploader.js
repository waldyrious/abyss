'use strict';
var m = require('mithril');
var Promise = require('bluebird');
var identity = require('./identity');
var uploads = [];

module.exports.controller = function(args, extras) {
	var ctrl = this;
	ctrl.to = [];

	if (window.Intl) {
		var inf = new Intl.NumberFormat();
		ctrl.nf = function(num) {
			return inf.format(num);
		}
	} else {
		ctrl.nf = function(num) {
			return num;
		}
	}

	ctrl.files = m.prop();
	ctrl.fileInput = m.prop();

	ctrl.fileChange = function(ev) {
		if (ev.target.files.length === 0) {
			ctrl.files(null);
		} else {
			ctrl.files(ev.target.files);
		}
	}

	ctrl.abortOrClear = function(upload) {
		var index = uploads.indexOf(upload);
		var xhr = upload.xhr;
		if (xhr.readyState === 4 || xhr.readyState === 0) {
			uploads.splice(index, 1);
		} else {
			xhr.abort();
		}
	}

	ctrl.uploadsComplete = function() {
		if (uploads.length === 0) {
			return true;
		} else {
			for (var i = 0; i < uploads.length; i++) {
				if (uploads[i] && uploads[i].xhr.readyState && uploads[i].xhr.readyState !== 4) {
					return false;
				}
			}
			return true;
		}
	}

	ctrl.clearComplete = function() {
		debugger
		if (uploads.length === 0) {
			return;
		} else {
			for (var i = 0; i < uploads.length; i++) {
				if (uploads[i] && uploads[i].done) {
					uploads.splice(i, 1);
				}
			}
			m.redraw();
		}
	}

	ctrl.remove = function(upload) {
		var index = uploads.indexOf(upload);
		uploads.splice(index, 1);
	}

	module.exports.uploadFile = ctrl.uploadFile = function(arg) {
		var files;

		if (window.DataTransferItemList && arg instanceof window.DataTransferItemList) {
			var newfiles = [];
			for (var i=0; i<arg.length; i++) {
				if (arg[i].kind === 'file') {
					newfiles.push(arg[i].getAsFile());
				}
			}
			files = newfiles;
		} else if (window.FileList && arg instanceof window.FileList) {
			files = Array.prototype.slice.call(arg);
		} else {
			files = Array.prototype.slice.call(ctrl.fileInput().files);
		}

		return Promise.map(files, function(file, index) {
				index = index + uploads.length; // account for possible concurrent uploads from prior click.
				var data = new FormData();
				data.append("file", file);

				var upload = {
					name: file.name,
					loaded: 0,
					total: file.size
				}

				uploads.push(upload);

				var xhrConfig = function(xhr) {
					xhr = identity.withAuth(xhr);
					uploads[uploads.indexOf(upload)].xhr = xhr;
					xhr.upload.addEventListener("progress", function(ev) {
						uploads[uploads.indexOf(upload)].loaded = ev.loaded;
						uploads[uploads.indexOf(upload)].total = ev.total;
						m.redraw();
					});
					xhr.upload.addEventListener("abort", function(ev) {
						uploads[uploads.indexOf(upload)].loaded = undefined;
						uploads[uploads.indexOf(upload)].aborted = true;
						m.redraw();
					});
					xhr.upload.addEventListener("error", function(err) {
						uploads[uploads.indexOf(upload)].loaded = undefined;
						uploads[uploads.indexOf(upload)].error = err;
						m.redraw();
					});
					xhr.upload.addEventListener("load", function(err) {
						uploads[uploads.indexOf(upload)].done = true;
						m.redraw();
					});
				}


				return m.request({
						method: "POST",
						url: '/api/file?' + m.route.buildQueryString({
							to: ctrl.to,
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
						// 	uploads.splice(index, 1);
						// 	m.redraw();
						// }, 500);
					}, function() {
						// we handled errors with the xhr event listeners
					})
			}, {
				concurrency: 1
			});
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
		uploads.length > 0 ? uploads.map(function(upload) {
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
		uploads.length > 1 ? m('button.btn btn-default', {
			onclick: ctrl.clearComplete,
			style: {
				display: 'block',
				'margin-bottom': '4px'
			}
		}, 'Clear Complete') : '',
		m('button.btn btn-default btn-sm glyphicon glyphicon-send', {
			disabled: ctrl.files() ? false : true,
			onclick: ctrl.uploadFile,
			config: sendButtonConfig
		}, ' Send file(s)'),

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
