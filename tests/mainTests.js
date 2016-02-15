if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

var _ = require('underscore'),
    Rete = require('../js/ReteInterface');
    RDS = require('../js/ReteDataStructures'),
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

        test.ok(_.keys(rn.allWMEs).length === 0);
        var wmeId = Rete.assertWME_Immediately(data,rn);
        test.ok(rn.allWMEs[wmeId].data.testInfo === "blah");
        test.done();
    },

    retractWME_immediately_test : function(test){
        var rn = makeRete(),
            data = {
                testInfo : "blah"
            },
            wmeId = Rete.assertWME_Immediately(data,rn),
            wme = rn.allWMEs[wmeId];
        test.ok(rn.allWMEs[wmeId].data.testInfo === "blah");
        Rete.retractWME_Immediately(wmeId,rn);
        
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

    rule_construction_test : function(test){
        var rn = makeRete(),
            aRule = new Rete.Rule(),
            aCondition = new Rete.Condition(),
            anAction = new Rete.Action(),
            components;

        aCondition.addTest("first","EQ",5)
            .addTest("second","EQ",10)
            .addBinding("blah","first",[]);

        anAction.addValue("output","$blah")
            .addArithmetic("output","+",5);

        aRule.addCondition(aCondition)
            .addAction(anAction);
        
        //convert to components:
        components = Rete.convertRulesToComponents(aRule);

        //Check the components were constructed correctly:
        //Rule + Condition + action = 3
        test.ok(_.keys(components).length === 3);
        

        test.done();
    },

    addRule_test : function(test){
        var rn = makeRete(),
            aRule = new Rete.Rule("blah"),
            aCondition = new Rete.Condition(),
            anAction = new Rete.Action("assert"),
            components;

        aCondition.addTest("first","EQ",5)
            .addTest("second","EQ",10)
            .addBinding("blah","first",[]);

        anAction.addValue("output","$blah")
            .addArithmetic("output","+",5);

        aRule.addCondition(aCondition)
            .addAction(anAction);
        
        //convert to components:
        components = Rete.convertRulesToComponents(aRule);
        //Check the components were constructed correctly:
        //Rule + Condition + action = 3
        test.ok(_.keys(components).length === 3);

        //Preconditions:
        test.ok(_.keys(rn.actions).length === 0);
        test.ok(rn.rootAlpha.children.length === 0);
        test.ok(rn.dummyBetaMemory.children.length === 0);
        test.ok(rn.dummyBetaMemory.unlinkedChildren.length === 0);
        
        //Add the rule
        Rete.addRule(aRule.id,rn,components);

        //Check the rule was added correctly:
        test.ok(_.keys(rn.actions).length === 1);
        test.ok(rn.rootAlpha.children.length === 1);
        test.ok(rn.dummyBetaMemory.children.length === 0);
        test.ok(rn.dummyBetaMemory.unlinkedChildren.length === 1);
        test.done();
    },

    ruleFire_test : function(test){
        var rn = makeRete(),
            aRule = new Rete.Rule(),
            aCondition = new Rete.Condition(),
            anAction = new Rete.Action(),
            data = {
                "first" : 5,
                "second" : 10
            },
            components;
        
        aCondition.addTest("first","EQ",5)
            .addTest("second","EQ",10)
            .addBinding("blah","first",[]);

        anAction.addValue("output","$blah")
            .addArithmetic("output","+",5);

        aRule.addCondition(aCondition)
            .addAction(anAction);
        
        //convert to components:
        components = Rete.convertRulesToComponents(aRule);

        Rete.addRule(aRule.id,rn,components);

        //Check there are no actions or wmes
        test.ok(_.keys(rn.potentialActions).length === 0);
        test.ok(_.keys(rn.allWMEs).length === 0);

        //Assert the wme:
        var newWMEId = Rete.assertWME_Immediately(data,rn,0);
        
        //Check the wme is asserted, and the action for it fires
        test.ok(_.keys(rn.allWMEs).length === 1);
        test.ok(rn.allWMEs[newWMEId] !== undefined);
        test.ok(rn.allWMEs[newWMEId].data.first === 5);
        test.ok(rn.allWMEs[newWMEId].data.second === 10);
        test.done();
    },

    ruleFire_and_retraction_test : function(test){
        var rn = makeRete(),
            aRule = new Rete.Rule(),
            aCondition = new Rete.Condition(),
            anAction = new Rete.Action(),
            data = {
                "first" : 5,
                "second" : 10
            },
            components;
        aCondition.addTest("first","EQ",5)
            .addTest("second","EQ",10)
            .addBinding("blah","first",[]);
        anAction.addValue("output","$blah")
            .addArithmetic("output","+",5);
        aRule.addCondition(aCondition)
            .addAction(anAction);
        //convert to components:
        components = Rete.convertRulesToComponents(aRule);
        //Add the rule
        Rete.addRule(aRule.id,rn,components);
        //Check there are no actions or wmes
        test.ok(_.keys(rn.potentialActions).length === 0);
        test.ok(_.keys(rn.allWMEs).length === 0);
        //Assert the wme:
        var newWMEId = Rete.assertWME_Immediately(data,rn,0);
        //Check the wme is asserted, and the action for it fires
        test.ok(_.keys(rn.allWMEs).length === 1);
        test.ok(rn.allWMEs[newWMEId] !== undefined);
        test.ok(rn.allWMEs[newWMEId].data.first === 5);
        test.ok(rn.allWMEs[newWMEId].data.second === 10);

        //check alphamemory items, tokens, etc:
        var wme = rn.allWMEs[newWMEId];
        test.ok(wme.alphaMemoryItems.length === 1);
        test.ok(wme.tokens.length === 1);
        
        //Retract the wme:
        Rete.retractWME_Immediately(wme,rn);

        //Check the wme is cleaned up:
        test.ok(wme.alphaMemoryItems.length === 0);
        test.ok(wme.tokens.length === 0);

        test.done();
    },

    ruleFire_proposedAction_test : function(test){
        var rn = makeRete(),
            aRule = new Rete.Rule(),
            aCondition = new Rete.Condition(),
            anAction = new Rete.Action(),
            data = {
                "first" : 5,
                "second" : 10
            },
            components;
        aCondition.addTest("first","EQ",5)
            .addTest("second","EQ",10)
            .addBinding("blah","first",[]);
        anAction.addValue("output","$blah")
            .addArithmetic("output","+",5);
        aRule.addCondition(aCondition)
            .addAction(anAction);
        //convert to components:
        components = Rete.convertRulesToComponents(aRule);
        //Add the rule
        Rete.addRule(aRule.id,rn,components);
        Rete.assertWME_Immediately(data,rn,0);
        //Inspect the resulting proposed action:
        test.ok(_.values(rn.potentialActions).length === 1);
        var proposedAction = _.values(rn.potentialActions)[0];
        test.ok(proposedAction !== undefined);
        //console.log(proposedAction);
        test.ok(proposedAction.payload.output !== undefined);
        test.ok(proposedAction.payload.output === 10);
        
        test.done();
    },
    
    
};
