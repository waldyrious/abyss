'use strict';
var m = require('mithril');

module.exports.controller = function(args, extras) {
    var self = this;

	self.audioSources = {
		'Trap': 'http://67.223.237.33:8000/trap/;',
		'Chillstep': 'http://67.223.237.33:8000/chillstep/;',
		'Get Psyched': 'http://67.223.237.33:8000/getpsyched/;'
	}
	self.audioSource = m.prop(self.audioSources['Trap']);
	self.autoPlay = false;

	self.changeStation = function (key) {
		self.autoPlay = true;
		self.audioSource(self.audioSources[key]);
	}
}

module.exports.view = function(ctrl, args, extras) {
    return m('span', [
        m('audio', {
            src: ctrl.audioSource(),
            controls: true,
            autoplay: ctrl.autoPlay,
            preload: 'metadata',
            style: {
                float: 'right',
                'margin-right': '1em'
            }
        }),
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
