'use strict';
var m = require('mithril');

module.exports.view = function(ctrl, args, extras) {
	return m('ul.list-unstyled faq', [
		m('li', 'Q. What is the point of this site?'),
		m('li', 'A. Twitter and SMS are perfect for short messages, and e-mail is great for long messages. But what about ', m('i', 'medium'), ' length, web-only, erasable messaging? You probably didn\'t even know you needed that!'),
		m('br'),
		m('li', 'Q. Why do I sign in with my phone number?'),
		m('li', 'A. Usernames are hard to remember. Passwords are a little easier (perhaps you cleverly use the same one on every site). However, according to our scientific research, 55% of mobile phone users can recall their own phone number on command. We like those odds.'),
		m('br'),
		m('li', 'Q. How does message erasing work?'),
		m('li', 'A. Pressing the trash can looking button next to a message will instantly erase it. Now, the way this site works is, senders and recipients always see the same copy of the message. So if the sender or recipient erases the message, it\'s gone for good!'),
		m('br'),
		m('li', 'Q. How does erasing work with group messages?'),
		m('li', 'A. If you sent the message, it\'s gone for everybody. If you received the message, you are removed from the recipients list and no longer see the message. The other recipients will still see the message until the sender or all of the recipients erases it.'),
		m('br'),
		m('li', 'Q. Can I get notified of new messages?'),
		m('li', 'A. Notifications work in Chrome on the desktop and Chrome for Android. Unfortunately, notifications are not yet available for Chrome or Safari in iOS. Sorry. Oh, and you can turn them on and off with the padlock icon in the browser\'s location bar.'),
		m('br'),
		m('li', 'Q. Does this work on mobile devices?'),
		m('li', 'A. Yes. For your convenience, add a shortcut to your home screen. I would tell you exactly how to do this, but you can probably figure it out yourself.'),
		m('br'),
		m('li', 'Q. But I can\'t remember my friends phone numbers!'),
		m('li', 'A. Listen sir or madam, unlike other services, this site doesn\'t coddle you. What happens if you got stranded somewhere and lost your cell phone? If you used this site enough, you might, just might, remember at least one friend\'s phone number. And be able to call from a pay phone. If you can find one. Which your friend won\'t recognize the number of. Or take your call. Regardless, you\'re welcome.'),
		m('br'),
		m('li', 'Q. What do I do if Yobro.net goes down?'),
		m('li', 'A. Yobro.net is probably all you need to communicate most of the time, but in the unfortunate circumstance that it is not working, you will not be able to read this message.'),
		m('br'),
		m('li', 'Q. Why the dumb name?'),
		m('li', 'A. All the good domains were taken.'),
	]);
}
