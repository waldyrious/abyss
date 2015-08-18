
var WebSocketServer = require('websocket').server;

module.exports.register = function (server) {
    wss = new WebSocketServer({httpServer: server});

    wss.on('connection', function connection(ws) {
        ws.on('message', function incoming(message) {
            console.log('received: %s', message);
        });

        ws.send('something');
    });
}
