# Features

1. Ephemeral group and individual messaging--message ownership is shared among all message recipients
2. Push notifications
2. Login with just your phone number (confirmed with a text code)
3. No usernames, all identities via phone numbers
4. Choose and change your own nickname at any time
5. Real-time updates via socket.io and RethinkDB changefeed
6. Drag-and-drop file uploads with automatic image rotation fix
7. Inline display of pictures, sounds and videos. Other files are downloadable.
8. Built-in internet radio player (needs working stations)

# Installing

First install:

1. [RethinkDB](http://rethinkdb.com/)
2. Node.js 4.0 or later

# Running locally

1. git clone the repo and cd into the project
1. Start an instance of Rethinkdb:  `rethinkdb` This will start an instance of RethinkDB with datafiles in the working directory. Once running, go to [http://localhost:8080](http://localhost:8080)
 to access the RethinkDB admin tool. Leave Rethinkdb running in a terminal tab.
1. Install node modules: `npm i`  This installs the node_modules for the project.
1. Build front end: `npm run watch` This continually builds the front end upon file change. Leave it running in a terminal tab too.
`npm run build` does a single build. These are defined in package.json.
1. Start the server. `node runner.js` This restarts the server each time you change a file. If you need to debug, `node-debug server.js` or `node server.js` will run without restarting the server on file change.

## Create file secret/secret.json

This is the configuration file.

```
{
    "blobs": "/opt/abyss/blobs",
    "cluster": false,
    "spdy": true,
    "http2": false,
    "https": true,
    "httpredirect": false,
    "wwwredirect": false,
    "gcmapikey": "insertkeyhere",
    "sendverificationcodes": false,
    "rethinkdboptions": {
        "servers": [
            { "host": "localhost", "port": 28015 }
        ],
        "db": "test",
        "discovery": true
    },
    "cookieKeys": [
        "random stuff",
        "more random stuff"
    ],
    "jwtSecret": "another random string",
    "slowstreams": false,
    "verificationfrom": "info@example.com"
}
```

## Setup DB Schema

Run schema.js. It's safe to re-run this as it won't drop anything.

## Running the server:

1. From the command line, `node server.js` to run.
1. Run `node debug server.js` to debug.
1. Run `node-debug -p 8081 server.js` to use a web based debugger. First you'll need to have run `npm i -g node-inspector` to have 'node-debug' available.

# Library API reference

[Node.js Cheat Sheet](https://gist.github.com/LeCoupa/985b82968d8285987dc3)

[Mozilla MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript) The JavaScript reference.

[NodeJS API](https://nodejs.org/api) NodeJS APIs.

[Bluebird](https://github.com/petkaantonov/bluebird/blob/master/API.md) Promise API. Most Node modules use callback-based APIs for performance.
Bluebird lets you easily convert them to Promise based APIs, which are much easier to use, and have better error handling and stacktraces, though they incur a small perf hit.

[Lodash API](https://lodash.com/docs) Utility belt library. Useful for working with arrays and objects.

[Koa](http://koajs.com/) minimalist web application framework

[Mithril](https://lhorie.github.io/mithril) minimalist MVC frontend framework

[JavaScript Design Patterns](http://addyosmani.com/resources/essentialjsdesignpatterns/book/)

[MomentJS](http://momentjs.com/) Date and time handling library

[Tape](https://github.com/substack/tape) Tape: minimalist, TAP producing test library.
