'use strict';
var m = require('mithril');
var lastAudioElement = null;
var audioSources = {
    'Off': null,
    'Trap': 'http://208.113.211.151:443/trap/;',
    'Chillstep': 'http://208.113.211.151:443/chillstep/;',
    'Progressive House': 'http://208.113.211.151:443/prog-house/;',
    'Dubstep': 'http://208.113.211.151:443/dubstep/;',
    'Pop': 'http://208.113.211.151:443/getpsyched/;'
}
var audioSource = m.prop(audioSources['Off']);
var autoPlay = true;
var oldSrc;
var audioKey = 'Off';

var hiddenAudio = document.getElementById('radio');

var audioElement = function (element) {
    element.addEventListener('pause', function (ev) {
        ev.target.autoplay = false;
        oldSrc = ev.target.src;
        ev.target.src = '';
        ev.target.src = oldSrc;
    });
    element.autoplay = autoPlay;
    lastAudioElement = element;
}

module.exports.controller = function(args, extras) {
    var self = this;

	self.changeStation = function (key) {
        // if (lastAudioElement) {
        //     lastAudioElement.src = '';
        // }
        hiddenAudio.src = audioSources[key];
		autoPlay = true;
		audioSource(audioSources[key]);
        audioKey = key;
        hiddenAudio.play();
	}
}

module.exports.view = function(ctrl, args, extras) {
    return m('span', [
        // audioSource() ? m('audio', {
        //     config: audioElement,
        //     src: audioSource(),
        //     controls: true,
        //     autoplay: autoPlay,
        //     preload: 'none',
        //     style: {
        //         float: 'right',
        //         'margin-right': '1em'
        //     }
        // }) : '',
        m('select', {
            style: {
                float: 'right'
            },
            value: audioKey,
            onchange : function() { ctrl.changeStation(this.options[this.selectedIndex].value) }
        }, Object.keys(audioSources).map(function (item) {
            return m('option', {value: item}, item)
        }))
    ])
}
