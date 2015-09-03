'use strict';
var m = require('mithril');

var randomProperty = function(obj) {
	var keys = Object.keys(obj)
	return keys[keys.length * Math.random() << 0];
};

var audioSources = {
		'Chillstep': 'http://208.113.211.151:443/chillstep/;',
		'Progressive House': 'http://208.113.211.151:443/prog-house/;',
		'Dubstep': 'http://208.113.211.151:443/dubstep/;',
		// 'Pop': 'http://208.113.211.151:443/getpsyched/;',
		'Melodic Drum & Bass': 'http://208.113.211.151:443/dnb/;',
		'Trap': 'http://208.113.211.151:443/trap/;'
	}
	// var audioKey = 'Trap';
var audioKey = randomProperty(audioSources);
var element = new Audio(audioSources[audioKey]);
element.preload = 'none';

var playing = false;

function stop() {
	element.pause();
	element.preload = 'none';
	element.src = '';
	playing = false;
}

function play() {
	element.src = audioSources[audioKey];
	element.load();
	element.play();
	playing = true;
}

function toggle() {
	if (playing) stop()
	else play();
}


module.exports.controller = function(args, extras) {
	var self = this;

	self.play = function(ev) {
		element.play();
	}

	self.changeStation = function(key) {
		audioKey = key;
		play();
	}
}

module.exports.view = function(ctrl, args, extras) {
	return m('li', [
		m('select', {
			value: audioKey,
			onchange: function() {
				ctrl.changeStation(this.options[this.selectedIndex].value)
			},
		}, Object.keys(audioSources).map(function(item) {
			return m('option', {
				value: item,
				// selected: item == audioKey
			}, item)
		})),
		m('button.btn-circle glyphicon', { // needed for mobile safari
				style: {
					"text-align": "center"
				},
				class: playing ? 'glyphicon-pause' : 'glyphicon-play',
				onclick: toggle
			}
			// , playing ? ' Pause' : ' Play'
		)
	])
}
