// wrap-start.frag.js
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['underscore'], factory);
    } else if (typeof exports === 'object') {
        var _ = require('underscore');
        module.exports = factory(_);
    } else {
        // change "myLib" to whatever your library is called
        root.Rete = factory(root._);
    }
}(this, function (_) {

    
