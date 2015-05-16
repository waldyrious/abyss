

# Installing

You need two tools

1. [http://rethinkdb.com/](http://rethinkdb.com/)
2. [https://nodejs.org/](https://nodejs.org/) 0.12 or later

On Mac...
    
    brew update   
    brew install rethinkdb    
    brew install node

Also get [https://www.jetbrains.com/webstorm/](https://www.jetbrains.com/webstorm/) seriously, its the best thing for JavaScript.

# Running locally

1. git clone the repo and cd into the project
1. Start an instance of Rethinkdb:  `rethinkdb -o 1` This will run an instance of RethinkDB with datafiles in the working directory. Once running, go to [http://localhost:8081](http://localhost:8081)
 to access the RethinkDB admin tool. Leave this running in a terminal tab.
1. Install npms: `npm i`  This installs the node_modules
1. Build front end: `npm run watch` This continually builds the front end. Leave it running in a terminal tab too.
1. Now you can run `node --harmony server.js` to run.
1. Also can run `node debug --harmony server.js` to use the debugger. The command line debugger is very easy to use
and quite fast. 
1. You can also run the server.js from WebStorm. Add --harmony to the Node parameters in the run config.

Get accustomed to using the debuggers! You will find yourself inserting 'debugger' to trace code frequently and inspect variables. 

# API reference

[NodeJS API](https://nodejs.org/api)

[Bluebird](https://github.com/petkaantonov/bluebird/blob/master/API.md) Promise API. Most Node modules use callback-based APIs for performance.
Bluebird lets you easily convert them to Promise based APIs, which are much easier to use, but incurs a small perf hit.

[Express](http://expressjs.com) minimalist web application framework

[Mithril](https://lhorie.github.io/mithril) minimalist MVC frontend framework

[JavaScript Design Patterns](http://addyosmani.com/resources/essentialjsdesignpatterns/book/) good read

