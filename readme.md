

# Installing

You need two tools

1. [http://rethinkdb.com/](http://rethinkdb.com/)
2. [https://nodejs.org/](https://nodejs.org/) 0.12 or later

On Mac...
    
    brew update   
    brew install rethinkdb    
    brew install node

Also get [https://www.jetbrains.com/webstorm/](https://www.jetbrains.com/webstorm/) seriously, its the best thing for JavaScript.

# Webstorm config

1. Check use tab character in Default Indent Options
2. Tab size 4, Indent 4, Continuation indent 0
3. JavaScript: Tab size 4, Indent 4, Continuation indent 0

# Running locally

1. git clone the repo and cd into the project
1. Start an instance of Rethinkdb:  `rethinkdb` This will start an instance of RethinkDB with datafiles in the working directory. Once running, go to [http://localhost:8080](http://localhost:8080)
 to access the RethinkDB admin tool. Leave this running in a terminal tab.
1. Install npms: `npm i`  This installs the node_modules for the project.
1. Build front end: `npm run watch` This continually builds the front end. Leave it running in a terminal tab too.
1. Now you can run the server.js from WebStorm. Add --harmony to the Node parameters in the run config!

Other ways to run:

1. From the command line, `node --harmony server.js` to run.
1. Run `node debug --harmony server.js` to use the debugger. The command line debugger is very easy to use
and quite fast. 
1.  Run `node-debug -p 8081 --harmony server.js` to use the web based debugger. First you'll need to have run `npm i -g node-inspector` to install this program.

Be prepared to get accustomed to using the debuggers! You will find yourself inserting 'debugger' to trace code frequently, inspect variables and experiment.

# API reference

[NodeJS API](https://nodejs.org/api)

[Bluebird](https://github.com/petkaantonov/bluebird/blob/master/API.md) Promise API. Most Node modules use callback-based APIs for performance.
Bluebird lets you easily convert them to Promise based APIs, which are much easier to use, but incurs a small perf hit.

[Lodash API](https://lodash.com/docs)

[Express](http://expressjs.com) minimalist web application framework

[Mithril](https://lhorie.github.io/mithril) minimalist MVC frontend framework

[JavaScript Design Patterns](http://addyosmani.com/resources/essentialjsdesignpatterns/book/) good read

# Set up DB tables

r.db('test').tableCreate('verifications')

r.db('test').tableCreate('subscriptions')

r.db('test').tableCreate('messages')
