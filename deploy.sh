#!/bin/sh
rm -rf dist
npm run build
mkdir dist
mkdir dist/client
cp -R proxy.js lib package.json server.js model dist
cp client/bundle.js dist/client
cp client/index.html dist/client
cp client/manifest.json dist/client
cp client/sw.js dist/client
scp -r dist/* joe@104.237.135.61:yobro
