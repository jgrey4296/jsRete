if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

var _ = require('underscore'),
    Rete = require('../js/ReteInterface'),
    ReteDel = require('../js/ReteDeletion'),
    makeRete = function() { return new Rete.ReteNet(); },
    globalRete = makeRete();

exports.ReteTests = {

    initTest : function(test){
        var rn = makeRete();
        test.ok(ReteDel !== undefined);
        test.ok(rn !== undefined);
        test.done();
    },


};
