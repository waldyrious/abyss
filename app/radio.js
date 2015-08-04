'use strict';
var m = require('mithril');

var audioSources = {
    'Trap': 'http://208.113.211.151:443/trap/;',
    'Chillstep': 'http://208.113.211.151:443/chillstep/;',
    'Progressive House': 'http://208.113.211.151:443/prog-house/;',
    'Dubstep': 'http://208.113.211.151:443/dubstep/;',
    'Pop': 'http://208.113.211.151:443/getpsyched/;'
}
var audioKey = 'Trap';
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

    self.play = function (ev) {
        element.play();
    }

	self.changeStation = function (key) {
        audioKey = key;
        play();
	}
}

module.exports.view = function(ctrl, args, extras) {
    return m('span', [
        m('button.btn btn-default glyphicon', { // needed for mobile safari
            class: playing ? 'glyphicon-pause' : 'glyphicon-play',
            style: {
                float: 'right'
            },
            onclick: toggle
        }
        // , playing ? ' Pause' : ' Play'
    ),
        m('select', {
            style: {
                float: 'right'
            },
            value: audioKey,
            onchange : function() { ctrl.changeStation(this.options[this.selectedIndex].value) },
        }, Object.keys(audioSources).map(function (item) {
            return m('option', {value: item}, item)
        }))
    ])
}
