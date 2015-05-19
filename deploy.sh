#!/bin/sh
rm -rf dist
browserify -g uglifyify client/main.js > client/bundle.js
mkdir dist
mkdir dist/client
cp -R proxy.js lib package.json server.js model schema.js dist
cp client/bundle.js dist/client
cp client/index.html dist/client
cp client/manifest.json dist/client
cp client/sw.js dist/client
scp -r dist/* joe@104.237.135.61:yobro
