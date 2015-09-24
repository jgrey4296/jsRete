/**
   Template for rete net tests:
 */
if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

var ds = require('../dataStructures');
var pr = require('../procedures');

exports.__template = {

    startTest : function(test){

        test.fail();
        test.done();
    },

};
