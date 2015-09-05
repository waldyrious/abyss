// www and http/https redirect
'use strict';

module.exports = function *(next) {
    let r = /^www./

    if (this.request.get('host') && this.request.get('host').match(r)) {
        let origUrl;
        if (secret.httpredirect) {
            origUrl = 'https://' + this.request.header.host + this.request.url;
        } else {
            origUrl = this.secure ? 'https://' : 'http://' + this.request.header.host + this.request.url;
        }

        let urlObject = url.parse(origUrl);

        delete urlObject.host;
        urlObject.hostname = urlObject.hostname.replace(r, '');

        this.response.status = 301;
        this.response.redirect(url.format(urlObject));
    } else {
        yield next;
    }
}
