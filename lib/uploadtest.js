var Promise = require('bluebird');
Promise.longStackTraces();

var fs = require('fs');

var streamToBuffer = Promise.promisify(require('stream-to-buffer'));
var r = require('rethinkdb');

var file = fs.createReadStream('/tmp/atom.rpm');

streamToBuffer(file)
.then(function (buffer) {
    console.log(buffer.length);
    buffer.length = 57240724;
    return r.connect()
    .then(function (conn) {
        conn.on('error', console.log)
        return r.table('test')
        .insert({
            size: buffer.length,
            date: new Date(),
            file: buffer
        })
        .run(conn, function (err, ok) {
	        console.log('here')
            console.error(err)
            console.log(ok)
        })
    })
})
