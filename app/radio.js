'use strict';
var m = require('mithril');

module.exports.controller = function(args, extras) {
    var self = this;
    var lastAudioElement = null;
	self.audioSources = {
        'Off': null,
		'Trap': 'http://208.113.211.151:443/trap/;',
		'Chillstep': 'http://208.113.211.151:443/chillstep/;',
		'Progressive House': 'http://208.113.211.151:443/prog-house/;',
        'Dubstep': 'http://208.113.211.151:443/dubstep/;',
        'Pop': 'http://208.113.211.151:443/getpsyched/;'
	}
	self.audioSource = m.prop(self.audioSources['Off']);
	self.autoPlay = true;

	self.changeStation = function (key) {
        if (lastAudioElement) {
            lastAudioElement.src = '';
        }
		self.autoPlay = true;
		self.audioSource(self.audioSources[key]);
	}

    var oldSrc;

    self.audioElement = function (element) {
        element.addEventListener('pause', function (ev) {
            ev.target.autoplay = false;
            oldSrc = ev.target.src;
            ev.target.src = '';
            ev.target.src = oldSrc;
        });
        element.autoplay = self.autoPlay;
        lastAudioElement = element;
    }
}

module.exports.view = function(ctrl, args, extras) {
    return m('span', [
        ctrl.audioSource() ? m('audio', {
            config: ctrl.audioElement,
            src: ctrl.audioSource(),
            controls: false,
            autoplay: ctrl.autoPlay,
            preload: 'none',
            style: {
                float: 'right',
                'margin-right': '1em'
            }
        }) : '',
        m('select', {
            style: {
                float: 'right'
            },
            onchange : function() { ctrl.changeStation(this.options[this.selectedIndex].value) }
        }, Object.keys(ctrl.audioSources).map(function (item) {
            return m('option', {value: item}, item)
        }))
    ])
}
