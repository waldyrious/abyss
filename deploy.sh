#!/bin/sh
rm -rf dist
mkdir dist
mkdir dist/client
./node_modules/.bin/webpack --optimize-minimize --optimize-minimize
cp -R lib package.json web.js webtls.js model schema.js dist &&
cp app/index.html client &&
cp -R app/favicon/* client &&
cp -R app/img client/img &&
cp app/sw.js client &&
cp app/manifest.json client &&
cp -R client dist &&
cp processes.json-prod dist &&
scp -r dist/* joe@abyss.online:/opt/abyss
