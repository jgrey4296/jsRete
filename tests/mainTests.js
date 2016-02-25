if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

var _ = require('underscore'),
    Rete = require('../js/ReteClassInterface');
    RDS = require('../js/ReteDataStructures'),
    makeRete = function() { return new Rete(); },
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
        var wmeId = rn.assertWME(data);
        test.ok(rn.allWMEs[wmeId].data.testInfo === "blah");
        test.done();
    },

    retractWME_immediately_test : function(test){
        var rn = makeRete(),
            data = {
                testInfo : "blah"
            },
            wmeId = rn.assertWME(data),
            wme = rn.allWMEs[wmeId];
        test.ok(rn.allWMEs[wmeId].data.testInfo === "blah");
        rn.retractWME(wmeId);
        
        test.done();
    },
    
    clearHistory_test : function(test){
        var rn = makeRete();
        test.ok(rn.enactedActions !== undefined);
        rn.enactedActions.push(1);
        rn.enactedActions.push(2);
        test.ok(rn.enactedActions.length === 2);
        rn.clearHistory();
        test.ok(rn.enactedActions.length === 0);
        test.done();        
    },

    clearPotentialActions_test : function(test){
        var rn = makeRete();
        test.ok(rn.proposedActions !== undefined);
        rn.proposedActions.push(1);
        rn.proposedActions.push(2);
        test.ok(rn.proposedActions.length === 2);
        rn.clearProposedActions();
        test.ok(rn.proposedActions.length === 0);
        test.done();        
    },

    rule_construction_test : function(test){
        var rn = makeRete(),
            aRule = new rn.RuleCtors.Rule(),
            aCondition = new rn.RuleCtors.Condition(),
            anAction = new rn.RuleCtors.Action(),
            components;

        aCondition.addTest("first","EQ",5)
            .addTest("second","EQ",10)
            .addBinding("blah","first",[]);

        anAction.addValue("output","$blah")
            .addArithmetic("output","+",5);

        aRule.addCondition(aCondition)
            .addAction(anAction);
        
        //convert to components:
        components = rn.convertRulesToComponents(aRule);

        //Check the components were constructed correctly:
        //Rule + Condition + action = 3
        test.ok(_.keys(components).length === 3);
        

        test.done();
    },

    addRule_test : function(test){
        var rn = makeRete(),
            aRule = new rn.RuleCtors.Rule("blah"),
            aCondition = new rn.RuleCtors.Condition(),
            anAction = new rn.RuleCtors.Action("assert"),
            components;

        aCondition.addTest("first","EQ",5)
            .addTest("second","EQ",10)
            .addBinding("blah","first",[]);

        anAction.addValue("output","$blah")
            .addArithmetic("output","+",5);

        aRule.addCondition(aCondition)
            .addAction(anAction);
        
        //convert to components:
        components = rn.convertRulesToComponents(aRule);
        //Check the components were constructed correctly:
        //Rule + Condition + action = 3
        test.ok(_.keys(components).length === 3);

        //Preconditions:
        test.ok(_.keys(rn.actions).length === 0);
        test.ok(rn.rootAlpha.children.length === 0);
        test.ok(rn.dummyBetaMemory.children.length === 0);
        test.ok(rn.dummyBetaMemory.unlinkedChildren.length === 0);
        
        //Add the rule
        rn.addRule(aRule.id,components);

        //Check the rule was added correctly:
        test.ok(_.keys(rn.actions).length === 1);
        test.ok(rn.rootAlpha.children.length === 1);
        test.ok(rn.dummyBetaMemory.children.length === 0);
        test.ok(rn.dummyBetaMemory.unlinkedChildren.length === 1);
        test.done();
    },

    ruleFire_test : function(test){
        var rn = makeRete(),
            aRule = new rn.RuleCtors.Rule(),
            aCondition = new rn.RuleCtors.Condition(),
            anAction = new rn.RuleCtors.Action(),
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
        components = rn.convertRulesToComponents(aRule);

        rn.addRule(aRule.id,components);

        //Check there are no actions or wmes
        test.ok(_.keys(rn.proposedActions).length === 0);
        test.ok(_.keys(rn.allWMEs).length === 0);

        //Assert the wme:
        var newWMEId = rn.assertWME(data);
        
        //Check the wme is asserted, and the action for it fires
        test.ok(_.keys(rn.allWMEs).length === 1);
        test.ok(rn.allWMEs[newWMEId] !== undefined);
        test.ok(rn.allWMEs[newWMEId].data.first === 5);
        test.ok(rn.allWMEs[newWMEId].data.second === 10);
        test.done();
    },

    ruleFire_and_retraction_test : function(test){
        var rn = makeRete(),
            aRule = new rn.RuleCtors.Rule(),
            aCondition = new rn.RuleCtors.Condition(),
            anAction = new rn.RuleCtors.Action(),
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
        components = rn.convertRulesToComponents(aRule);
        //Add the rule
        rn.addRule(aRule.id,components);
        //Check there are no actions or wmes
        test.ok(_.keys(rn.proposedActions).length === 0);
        test.ok(_.keys(rn.allWMEs).length === 0);
        //Assert the wme:
        var newWMEId = rn.assertWME(data);
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
        rn.retractWME(wme);

        //Check the wme is cleaned up:
        test.ok(wme.alphaMemoryItems.length === 0);
        test.ok(wme.tokens.length === 0);

        test.done();
    },

    ruleFire_proposedAction_test : function(test){
        var rn = makeRete(),
            aRule = new rn.RuleCtors.Rule(),
            aCondition = new rn.RuleCtors.Condition(),
            anAction = new rn.RuleCtors.Action(),
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
        components = rn.convertRulesToComponents(aRule);
        //Add the rule
        rn.addRule(aRule.id,components);
        rn.assertWME(data);
        //Inspect the resulting proposed action:
        test.ok(_.values(rn.proposedActions).length === 1);
        var proposedAction = _.values(rn.proposedActions)[0];
        test.ok(proposedAction !== undefined);
        //console.log(proposedAction);
        test.ok(proposedAction.payload.output !== undefined);
        test.ok(proposedAction.payload.output === 10);
        
        test.done();
    },



    ruleFire_negative_node_test : function(test){
        var rn = makeRete(),
            aRule = new rn.RuleCtors.Rule(),
            aCondition = new rn.RuleCtors.Condition(),
            negCondition = new rn.RuleCtors.Condition("negCondition"),
            anAction = new rn.RuleCtors.Action(),
            data = {
                "first" : 15,
                "second" : 10,
                "blah" : "blah"
            },
            components;
        //verify the negCondition is constructed to be negative:
        test.ok(negCondition.tags.isNegative === true);
        
        aCondition.addTest("first","EQ",5)
            .addTest("second","EQ",10)
            .addBinding("blah","first",[]);
        //Add a negative condition
        negCondition.addTest("first","EQ",15)
            .addBinding("blah","first",[]);

        //action:
        anAction.addValue("output","$blah")
            .addArithmetic("output","+",5);
        aRule.addCondition(aCondition)
            .addCondition(negCondition)
            .addAction(anAction);
        //convert to components:
        components = rn.convertRulesToComponents(aRule);
        //Add the rule
        rn.addRule(aRule.id,components);
        console.log(rn);
        //Assert a wme
        var wmeId = rn.assertWME(data),
            wme = rn.allWMEs[wmeId];
        console.log(wme.negJoinResults);
        test.ok(wme.negJoinResults.length === 1);
        //Inspect the resulting proposed actions:
        var proposedActions = _.reject(rn.proposedActions,d=>d===undefined);
        //console.log(proposedActions[0].payload.bindings);
        test.ok(proposedActions.length === 0);
        test.done();
    },    
    
};
