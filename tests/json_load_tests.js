if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}
var fs = require('fs'),
    _ = require('lodash'),
    Rete = require('../js/ReteClassInterface'),
    RDS = require('../js/ReteDataStructures'),
    makeRete = function() { return new Rete(); },
    globalRete = makeRete(),
    testRules1 = JSON.parse(fs.readFileSync('./testRules2.json').toString()).reduce(function(m,v){
        m[v.id] = v;
        return m;
    },{});

exports.ReteTests = {
    //check the retenet constructs ok
    initTest : function(test){
        "use strict";
        let rn = makeRete();
        test.ok(rn !== undefined);
        test.done();
    },

    loadRulesTest : function(test){
        "use strict";
        let rn = makeRete(),
            ruleIds = _.values(testRules1).filter(d=>d.tags.type==='rule').map(d=>d.id);

        rn.addRule(ruleIds,testRules1);
        test.ok(_.keys(rn.allRules).length === 1);
        test.done();
    },

    loadedRules_fire_test : function(test){
        "use strict";
        let rn = makeRete(),
            ruleIds = _.values(testRules1).filter(d=>d.tags.type === 'rule').map(d=>d.id);
        rn.addRule(ruleIds,testRules1);
        test.ok(_.keys(rn.allRules).length === 1);
        test.ok(_.keys(rn.allWMEs).length === 0);
        test.ok(_.keys(rn.proposedActions).length === 0);
        test.ok(_.keys(rn.allReteNodesByType.AlphaMemory).length === 1);
                
        let wmeId = rn.assertWME({
            values : {
                a : "5",
            }
        });

        //console.log(rn.allWMEs[wmeId]);
        //console.log(_.values(rn.allReteNodesByType.AlphaMemory)[0]);
        //console.log(_.values(rn.allReteNodesByType.AlphaNode)[0]);
        
        test.ok(_.keys(rn.allWMEs).length === 1);
        test.ok(_.values(rn.allWMEs)[0].alphaMemoryItems.length === 1);
        test.ok(_.values(rn.allWMEs)[0].tokens.length === 1);
        test.ok(_.values(rn.allReteNodesByType.AlphaMemory)[0].items.length === 1);
        test.ok(_.keys(rn.proposedActions).length === 1, _.keys(rn.proposedActions).length);
        let proposedAction1 = _.values(rn.proposedActions)[0];

        test.ok(proposedAction1.actionType === 'assert');
        test.ok(proposedAction1.payload.message === "test assert",proposedAction1.payload.message);
        
        test.done();
    },
    
    
};
