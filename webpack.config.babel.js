import webpack from 'webpack';
import path from 'path';
import FlowBabelWebpackPlugin from 'flow-babel-webpack-plugin';

const ENV = process.env.NODE_ENV || 'development';

module.exports = {
    context: path.resolve(__dirname,'src'),
    entry: './ReteClassInterface.js',
    
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'rete.js',
        library: "Rete",
        libraryTarget: "umd"        
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
        new FlowBabelWebpackPlugin(),
    ],
}

// module = {
//     context: path.resolve(__dirname,'src'),
//     entry: './ReteClassInterface.js',

//     output : {
//         path: path.resolve(__dirname,'build'),
//         publicPath: '/',
//         filename: 'Rete.js',
//         library: "ReteJS",
//         libraryTarget: 'umd',
//         umdNamedFine: true
//     },

// 	resolve: {
// 		extensions: ['', '.js', '.json'],
// 		modulesDirectories: [
// 			path.resolve(__dirname, "libs"),
// 			path.resolve(__dirname, "node_modules"),
// 			'node_modules'
// 		],
// 		alias: {}
// 	},

//     externals: {
//         "lodash": {
//             commonjs: "lodash",
//             commonjs2: "lodash",
//             amd : "lodash",
//             root: "_"
//         }
//     },
    
//     rules: [
// 		{
// 			test: /\.jsx?$/,
// 			exclude: path.resolve(__dirname, 'src'),
//             enforce: 'pre',
// 			loader: 'source-map'
// 		},
//         {
//             test: /\.js$/,
//             enforce: 'pre',
//             loader: 'eslint-loader',

//         },
//         {
// 			test: /\.jsx?$/,
// 			exclude: /node_modules/,
// 			loader: 'babel'
// 		},
//         {
//             test:/\.json$/,
//             loader: 'json'
//         },
//     ],

//     plugins: ([
//         new webpack.NoErrorsPlugin(),
//         new webpack.DefinePlugin({
//             'process.env.NODE_ENV': JSON.stringify(ENV)
//         })
//     ]).concat(ENV=='production' ? [
// 		new V8LazyParseWebpackPlugin(),
// 		new webpack.optimize.UglifyJsPlugin({
//             sourceMap : true,
// 			output: {
// 				comments: false
// 			},
// 			compress: {
// 				warnings: false,
// 				conditionals: true,
// 				unused: true,
// 				comparisons: true,
// 				sequences: true,
// 				dead_code: true,
// 				evaluate: true,
// 				if_return: true,
// 				join_vars: true,
// 				negate_iife: false
// 			}
// 		}),

// 		// strip out babel-helper invariant checks
// 		new ReplacePlugin([{
// 			// this is actually the property name https://github.com/kimhou/replace-bundle-webpack-plugin/issues/1
// 			partten: /throw\s+(new\s+)?[a-zA-Z]+Error\s*\(/g,
// 			replacement: () => 'return;('
// 		}]),
// 		new OfflinePlugin({
// 			relativePaths: false,
// 			AppCache: false,
// 			excludes: ['_redirects'],
// 			ServiceWorker: {
// 				events: true
// 			},
// 			cacheMaps: [
// 				{
// 					match: /.*/,
// 					to: '/',
// 					requestTypes: ['navigate']
// 				}
// 			],
// 			publicPath: '/'
// 		})
//         ] : []),
    
// 	stats: { colors: true },

// 	devtool: ENV==='production' ? 'source-map' : 'cheap-module-eval-source-map'

// };
