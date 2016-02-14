if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

var _ = require('underscore'),
    Rete = require('../Rete.min'),
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

    clearHistory_test : function(test){
        var rn = makeRete();
        test.ok(rn.enactedActions !== undefined);
        rn.enactedActions.push(1);
        rn.enactedActions.push(2);
        test.ok(rn.enactedActions.length === 2);
        Rete.clearHistory(rn);
        test.ok(rn.enactedActions.length === 0);
        test.done();        
    },

    clearPotentialActions_test : function(test){
        var rn = makeRete();
        test.ok(rn.potentialActions !== undefined);
        rn.potentialActions.push(1);
        rn.potentialActions.push(2);
        test.ok(rn.potentialActions.length === 2);
        Rete.clearPotentialActions(rn);
        test.ok(rn.potentialActions.length === 0);
        test.done();        
    },

    assertWME_Later_test : function(test){
        var rn = makeRete();
        //preconditions
        test.ok(rn.wmeLifeTimes !== undefined);
        test.ok(rn.wmeLifeTimes.assertions !== undefined);
        test.ok(rn.wmeLifeTimes.assertions instanceof Array);
        test.ok(rn.wmeLifeTimes.retractions !== undefined);
        test.ok(rn.wmeLifeTimes.retractions instanceof Array);
        //action
        var newWMEId = Rete.assertWME_Later({testData: "test"},rn,1);
        //wme verify
        var wme = rn.allWMEs[newWMEId];
        test.ok(wme.lifeTime[0] === 1);
        test.ok(wme.lifeTime[1] === 0);
        //list verify
        test.ok(rn.wmeLifeTimes.assertions[1] !== undefined);
        test.ok(rn.wmeLifeTimes.assertions[1][0].id === newWMEId);
        test.ok(rn.wmeLifeTimes.retractions[0] !== undefined);
        test.ok(rn.wmeLifeTimes.retractions[0][0].id === newWMEId);
        test.done();
    },
    
};
