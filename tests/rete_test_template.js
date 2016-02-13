if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

var _ = require('underscore'),
    Rete = require('../js/ReteInterface'),
    makeRete = function() { return new Rete.ReteNet(); },
    globalRete = makeRete();

exports.ReteTests = {

    initTest : function(test){
        var rn = makeRete();
        test.ok(rn !== undefined);
        test.done();
    },

    assertWME_immediately_test : function(test){
        var rn = makeRete(),
            data = {
                testInfo : "blah"
            };

        test.ok(rn.allWMEs.length === 0);
        var wmeId = Rete.assertWME_Immediately(data,rn);
        test.ok(rn.allWMEs[wmeId].data.testInfo === "blah");
        test.done();
    },
};
