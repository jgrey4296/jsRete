const path = require('path');
const ENV = process.env.NODE_ENV || 'development';

module.exports = {
    mode : ENV,
    context: path.resolve(__dirname,'src'),
    entry: './ReteClassInterface.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'rete.js',
        library: "Rete",
        libraryTarget: "umd",
        globalObject: 'typeof self !== \'undefined\' ? self : this',
    },
    
    externals: {
        "lodash": {
            commonjs: "lodash",
            commonjs2: "lodash",
            amd: "lodash",
            root: "_",
        },
    },

    module:{
        rules:[
            {test:/\.js$/, exclude: /node_modules/, enforce: 'pre', loader: 'eslint-loader'},
            {test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" },
        ]
    },

    plugins: [
        //new FlowBabelWebpackPlugin(),
    ],

    optimization: {
        minimize: true
    }
};
