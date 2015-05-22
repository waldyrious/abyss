'use strict';

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
            {test: /[\/]angular\.js$/, loader: "exports?window.angular"},
            {test: /\.less$/, loader: 'style-loader!css-loader!less-loader'}, // use ! to chain loaders
            {test: /\.css$/, loader: 'style-loader!css-loader'},
            {test: /\.svg$/, loader: 'svg-loader'},
            {test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "url-loader?limit=10000&minetype=application/font-woff"},
            {test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "file-loader"}
        ]
    },
    node: {
        net: "empty",
        tls: "empty"
    }
};
