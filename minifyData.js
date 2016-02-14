({
    //http://www.sitepoint.com/building-library-with-requirejs/
    baseUrl: "./js",
    paths : {
        requireLib : "../node_modules/requirejs/require",
        underscore : "../node_modules/underscore/underscore-min"
    },
    shim: {
        underscore : {
            exports : "_"
        }
    },
    exclude : ['underscore'],
    //keepAmdefine : true,
    include : ['../node_modules/almond/almond','ReteInterface'],
    cjsTranslate : true,
    name : "ReteInterface",
    insertRequire : [ "ReteInterface"],
    out: "./Rete.min.js",
    optimize: "none",
    wrap : {
        startFile : "startWrap.js",
        end : "define('underscore',function() { return _; }); return require('ReteInterface'); }));"
    },
})
