#!/bin/sh
rm -rf dist
mkdir dist
mkdir dist/client
browserify -g uglifyify client/main.js > client/bundle.js &&
cp -R proxy.js lib package.json server.js model schema.js dist &&
cp client/s.css dist/client &&
cp client/bundle.js dist/client &&
cp client/index.html dist/client &&
cp client/manifest.json dist/client &&
cp client/sw.js dist/client &&
scp -r dist/* joe@104.237.135.61:yobro
