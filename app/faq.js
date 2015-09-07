'use strict';
var m = require('mithril');

module.exports.view = function(ctrl, args, extras) {
	return m('ul.list-unstyled faq', [
		m('li', 'The Abyss (abyss.online) is instant messaging with a twist. You own and control every message (and file) you send. At any time in the future, if you choose to, you can drop it into the abyss, erasing it for good.'
		+ ' Why? Sometimes you just to have an off the cuff conversation, or share a file without jumping through a bunch of hoops.'),
		m('br'),
		m('li', 'There are no usernames or passwords to remember. Just sign in with your mobile number, and a verification code will be sent to your phone. Currently compatible with AT&T, Sprint, T-Mobile and Verizon. You must also not have disabled email-to-SMS at your wireless carrier.'),
		m('br'),
		m('li', 'Q. How does message erasing work exactly?'),
		m('li', 'A. Pressing the fire icon next to a message will instantly erase it. All message participants see the same copy of the message. So if the sender or the recipient erases the message, it goes away.'),
		m('br'),
		m('li', 'Q. How does erasing work with group messages?'),
		m('li', 'A. If you sent the message, it\'s gone for everybody. If you received the message, you are removed as a participant.'),
		m('br'),
		m('li', 'Q. Can I get notified of new messages?'),
		m('li', 'A. Push notifications work in Chrome on the desktop and Chrome for Android. Unfortunately, push notifications are not yet available for any browser in iOS.'),
		m('br'),
		m('li', 'Q. Does this work on mobile devices?'),
		m('li', 'A. Yes, with an app-like experience. Add a shortcut to your home screen for convenience.'),
		m('br'),
		m('li', 'Q. Can I send files?'),
		m('li', 'A. Yes. You can drag and drop files, and paste images from the clipboard.'),
		m('br'),
		m('li', 'Q. What do I do if The Abyss goes down?'),
		m('li', 'A. The Abyss is probably all you need to communicate most of the time, but in the unfortunate circumstance that it is not working, you will not be able to read this message.'),
	]);
}
