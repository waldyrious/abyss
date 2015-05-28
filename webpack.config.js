'use strict';

var webpack = require('webpack');

module.exports = {
    context: __dirname + '/app',
    entry: './main.js',
    output: {
        path: __dirname + '/client',
        filename: 'bundle.js'
    },
    module: {
        preLoaders: [
            {test: /\.js$/, exclude: /node_modules/, loader: 'jshint-loader'}
        ],
        loaders: [
            {test: /bootstrap\/js\//, loader: 'imports?jQuery=jquery' },
            {test: /\.less$/, loader: 'style-loader!css-loader!less-loader'}, // use ! to chain loaders
            {test: /\.css$/, loader: 'style-loader!css-loader'},
            {test: /\.svg$/, loader: 'svg-loader'},
            {test: /\.woff(2)?(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=application/font-woff" },
            {test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=application/octet-stream" },
            {test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: "file" },
            {test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=image/svg+xml" }
        ]
    }
};
