var providers = require('./providers.js')
, _ = require('lodash')
, exec = require('child_process').exec
, spawn = require('child_process').spawn;

var debugEnabled = false;
var fromAddress = 'info@abyss.online';

var pony = require('pony');

//----------------------------------------------------------------
/*
General purpose logging function, gated by a configurable
value.
*/
function output() {
    if (debugEnabled) {
        return console.log.apply(this, arguments);
    }
}

//----------------------------------------------------------------
/*  Enable verbosity for the text module.

If enabled, logging functions will
print to stdout.

Params:
enable - bool
*/
function debug(enable) {
    debugEnabled = enable;
    return debugEnabled;
}

//----------------------------------------------------------------
/*  Sends a text message

Will perform a region lookup (for providers), then
send a message to each.

Params:
phone - phone number to text
message - message to send
region - region to use (defaults to US)
cb - function(err), provides err messages
*/

var casual = require('casual').en_US;

function sendText(phone, message, region, cb) {
    output('txting phone', phone, ':', message);

    region = region || 'us';

    var providers_list = providers[region];

    var done = _.after(providers_list.length, function() {
        if (cb)
        cb(false);
    });

    // message = message + ' Ignore the following: ' + casual.sentences(2);

    _.each(providers_list, function(provider) {

        var email = provider.replace('%s', phone);

        var mail = pony({
            host : 'localhost',
            port : 25,
            from : fromAddress,
            to : email,
        });
        mail.setHeader('content-type', 'text/plain');
        mail.setHeader('reply-to', fromAddress);
        // mail.setHeader('subject', 'verification');
        mail.end(message);
    });
}

module.exports = {
    send:       sendText,     // Send a text message
    debug:      debug         // Enable or disable debug output
};
