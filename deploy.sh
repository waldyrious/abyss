#!/bin/sh
rm -rf dist
mkdir dist
mkdir dist/client
./node_modules/.bin/webpack --optimize-minimize --optimize-minimize
cp -R proxy.js lib package.json server.js model schema.js dist &&
cp app/index.html client &&
cp app/sw.js client &&
cp app/manifest.json client &&
cp -R client dist &&
scp -r dist/* joe@104.237.135.61:yobro
