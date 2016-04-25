({
    //http://www.sitepoint.com/building-library-with-requirejs/
    baseUrl: "./js",
    paths : {
        requireLib : "../node_modules/requirejs/require",
        underscore : "../node_modules/underscore/underscore-min",
        lodash : "../node_modules/lodash/lodash.min"
    },
    shim: {
        underscore : {
            exports : "_"
        }
    },
    exclude : ['lodash'],
    //keepAmdefine : true,
    include : ['../node_modules/almond/almond','ReteClassInterface'],
    cjsTranslate : true,
    name : "ReteClassInterface",
    //insertRequire : [ "ReteClassInterface"],
    out: "./Rete.min.js",
    optimize: "none",
    wrap : {
        startFile : "startWrap.js",
        end : "define('lodash',function() { return _; }); return require('ReteClassInterface'); }));"
    },
});
