if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}
var fs = require('fs'),
    _ = require('underscore'),
    Rete = require('../js/ReteClassInterface'),
    RDS = require('../js/ReteDataStructures'),
    makeRete = function() { return new Rete(); },
    globalRete = makeRete(),
    testRules1 = JSON.parse(fs.readFileSync('./testRules1.json').toString()).reduce(function(m,v){
        m[v.id] = v;
        return m;
    },{});

exports.ReteTests = {
    //check the retenet constructs ok
    initTest : function(test){
        var rn = makeRete();
        test.ok(rn !== undefined);
        test.done();
    },

    loadRulesTest : function(test){
        var rn = makeRete(),
            ruleIds = _.values(testRules1).filter(d=>d.tags.type==='rule').map(d=>d.id);

        rn.addRule(ruleIds,testRules1);
        test.ok(_.keys(rn.allRules).length === 2);
        test.done();
    },

    loadedRules_fire_test : function(test){
        var rn = makeRete(),
            ruleIds = _.values(testRules1).filter(d=>d.tags.type === 'rule').map(d=>d.id);

        rn.addRule(ruleIds,testRules1);
        test.ok(_.keys(rn.allRules).length === 2);
        test.ok(_.keys(rn.allWMEs).length === 0);
        test.ok(_.keys(rn.proposedActions).length === 0);

        var wmeId = rn.assertWME({
            values : {
                a : 7,
                b : 15
            }
        });

        test.ok(_.keys(rn.allWMEs).length === 1);
        test.ok(_.keys(rn.proposedActions).length === 2, _.keys(rn.proposedActions).length);
        var proposedAction1 = _.values(rn.proposedActions)[0],
            proposedAction2 = _.values(rn.proposedActions)[1];

        test.ok(proposedAction1.actionType === 'assert');
        test.ok(proposedAction2.actionType === 'assert');
        test.ok(proposedAction1.payload.message === "The value of b was 15",proposedAction1.payload.message);
        test.ok(proposedAction2.payload.message === "The value of a was 7",proposedAction2.payload.message);

        
        test.done();
    },
    
    
};
