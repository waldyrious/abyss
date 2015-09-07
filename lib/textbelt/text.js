'use strict';
const providers = require('./providers.js');
const _ = require('lodash');
const exec = require('child_process').exec
const spawn = require('child_process').spawn;
const fromAddress = require('../../secret/secret.json').verificationfrom;
const pony = require('pony');
let debugEnabled = false;

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

function sendText(phone, message, region, cb) {
    output('txting phone', phone, ':', message);
    region = region || 'us';
    let providers_list = providers[region];
    let done = _.after(providers_list.length, function() {
        if (cb)
        cb(false);
    });

    _.each(providers_list, function(provider) {
        let email = provider.replace('%s', phone);
        let mail = pony({
            host : 'localhost',
            port : 25,
            from : fromAddress,
            to : email,
        });
        mail.setHeader('content-type', 'text/plain');
        mail.setHeader('reply-to', fromAddress);
        mail.setHeader('subject', 'verification code');
        mail.end(message);
    });
}

module.exports = {
    send:       sendText,     // Send a text message
    debug:      debug         // Enable or disable debug output
};
