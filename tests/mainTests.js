"use strict";
if(typeof define !== 'function'){
    let define = require('amdefine')(module);
}

let _ = require('lodash'),
    Rete = require('../js/ReteClassInterface'),
    RDS = require('../js/ReteDataStructures'),
    makeRete = function() { return new Rete(); },
    globalRete = makeRete();

exports.ReteTests = {
    //check the retenet constructs ok
    initTest : function(test){
        let rn = makeRete();
        test.ok(rn !== undefined);
        test.done();
    },
    //check wme assertion works in the base case
    assertWME_immediately_test : function(test){
        let rn = makeRete(),
            data = {
                testInfo : "blah"
            };

        test.ok(_.keys(rn.allWMEs).length === 0);
        let wmeId = rn.assertWME(data);
        test.ok(rn.allWMEs[wmeId].data.testInfo === "blah");
        test.done();
    },
    //check wme retraction works in the base case
    retractWME_immediately_test : function(test){
        let rn = makeRete(),
            data = {
                testInfo : "blah"
            },
            wmeId = rn.assertWME(data),
            wme = rn.allWMEs[wmeId];
        test.ok(rn.allWMEs[wmeId].data.testInfo === "blah");
        rn.retractWME(wmeId);
        test.done();
    },

    //simple clear history test, without using actual objects
    clearHistory_test : function(test){
        let rn = makeRete();
        test.ok(rn.enactedActions !== undefined);
        rn.enactedActions.push(1);
        rn.enactedActions.push(2);
        test.ok(rn.enactedActions.length === 2);
        rn.clearHistory();
        test.ok(rn.enactedActions.length === 0);
        test.done();        
    },

    //simple clear proposed actions test,without using actual objects
    clearProposedActions_test : function(test){
        let rn = makeRete();
        test.ok(rn.proposedActions !== undefined);
        rn.proposedActions[0] = 1;
        rn.proposedActions[1] = 2;
        test.ok(_.keys(rn.proposedActions).length === 2);
        rn.clearProposedActions();
        test.ok(_.keys(rn.proposedActions).length === 0);
        test.done();        
    },

    //check the rule/condition/action objects are converted correctly
    rule_component_construction_test : function(test){
        let rn = makeRete(),
            aRule = new rn.Rule();

        aRule.newCondition("positive",{
            tests : [["first","EQ",5],
                     ["second","EQ",10]],
            bindings : [["blah","first",[]]]
        })
            .newAction("assert","testAction",{
                values : [["output","${blah}"]],
                arith : [["output","+",5]],
                regexs : [],
                timing : [0,0,0],
                priority : 0
            });
        
        let components = rn.convertRulesToComponents(aRule);
        //Check the components were constructed correctly:
        //Rule + Condition + action = 3
        test.ok(_.keys(components).length === 3);
        test.ok(components[aRule.id] !== undefined);
        test.ok(components[_.keys(aRule.conditions)[0]] !== undefined);
        test.ok(components[_.keys(aRule.actions)[0]] !== undefined);
        
        test.done();
    },

    //using the simpler constructor
    rule_construction_alt_test : function(test){
        let rn = makeRete(),
            aRule = new rn.Rule(),
            exampleData = {
                num : 5,
                str : "test",
            };

        //Chain create a rule
        aRule.newCondition("positive",{
            tests : [['num','EQ',5]],
            bindings : [['myStrBinding','str',[]],
                        ['myNumBinding','num',[]]]
        })
            .newAction("assert","testAction",{
                values : [['actNum','${myNumBinding}'],
                          ['actStr','${myStrBinding}']],
                arith : [['actNum','+',5]],
                regexs : [['actStr','t','g','T']],
                timing : [0,0,0]
            });

        //Preconditions:
        test.ok(_.keys(rn.actions).length === 0);
        test.ok(rn.rootAlpha.children.length === 0);
        test.ok(rn.dummyBetaMemory.children.length === 0);
        test.ok(rn.dummyBetaMemory.unlinkedChildren.length === 0);
        //add the rule
        rn.addRule(aRule);
        //post conditions
        test.ok(_.keys(rn.actions).length === 1);
        test.ok(rn.rootAlpha.children.length === 1);
        test.ok(rn.dummyBetaMemory.unlinkedChildren.length === 1);
        test.done();
    },
    //Another rule test
    addRule_test : function(test){
        let rn = makeRete(),
            aRule = new rn.Rule("blah"),
            components;

        aRule.newCondition('positive',{
            tests : [['first','EQ',5],
                     ['second','EQ',10]],
            bindings : [['blah','first',[]]]            
        })
            .newAction('assert','testAction',{
                values : [['output','${blah}']],
                arith : [['output','+',5]],
                regexs : [],
                timing : [0,0,0]
            });

        //Preconditions:
        test.ok(_.keys(rn.actions).length === 0);
        test.ok(rn.rootAlpha.children.length === 0);
        test.ok(rn.dummyBetaMemory.children.length === 0);
        test.ok(rn.dummyBetaMemory.unlinkedChildren.length === 0);
        
        //Add the rule
        let ruleAction = rn.addRule(aRule)[1];

        //Check the rule was added correctly:
        test.ok(_.keys(rn.actions).length === 1);
        test.ok(rn.rootAlpha.children.length === 1);
        test.ok(rn.dummyBetaMemory.children.length === 0);
        test.ok(rn.dummyBetaMemory.unlinkedChildren.length === 1);

        test.ok(ruleAction.parent.type === 'JoinNode');
        test.ok(ruleAction.parent.parent.type === 'BetaMemory');
        test.ok(ruleAction.parent.parent.dummy);
        test.done();
    },
    //test a rule with an assertion
    ruleFire_test : function(test){
        let rn = makeRete(),
            aRule = new rn.Rule(),
            data = {
                "first" : 5,
                "second" : 10
            };

        aRule.newCondition("positive",{
            tests : [["first","EQ",5],
                     ["second","EQ",10]],
            bindings : [["blah","first",[]]],
        })
            .newAction("assert","testAction",{
                values : [["output","${blah}"]],
                arith : [["output","+",5]],
                regexs : [],
                timing : [0,0,0],
                priority : 0
            });
        
        let ruleAction = rn.addRule(aRule)[1];
        //Check there are no actions or wmes
        test.ok(ruleAction !== undefined);
        test.ok(_.keys(rn.proposedActions).length === 0);
        test.ok(_.keys(rn.allWMEs).length === 0);
        //Assert the wme:
        let newWMEId = rn.assertWME(data);
        //Check the wme is asserted, and the action for it fires
        test.ok(_.keys(rn.allWMEs).length === 1);
        test.ok(rn.allWMEs[newWMEId] !== undefined);
        test.ok(rn.allWMEs[newWMEId].data.first === 5);
        test.ok(rn.allWMEs[newWMEId].data.second === 10);
        //Check there is one proposed action:
        //test.ok(_.reject(rn.proposedActions,d=>d===undefined).length === 1);
        test.ok(_.keys(rn.proposedActions).length === 1);
        test.done();
    },

    //using the simpler constructor
    assertion_test2 : function(test){
        let rn = makeRete(),
            aRule = new rn.Rule(),
            exampleData = {
                num : 5,
                str : "test",
            };

        //Chain create a rule
        aRule.newCondition("positive",{
            tests : [['num','EQ',5]],
            bindings : [['myStrBinding','str',[]],
                        ['myNumBinding','num',[]]]
        })
            .newAction("assert","testAction",{
                values : [['actNum','${myNumBinding}'],
                          ['actStr','${myStrBinding}']],
                arith : [['actNum','+',5]],
                regexs : [['actStr','t','g','T']],
                timing : [0,0,0]
            });
        //add the rule
        rn.addRule(aRule);
        //Check there are no actions or wmes
        test.ok(_.keys(rn.proposedActions).length === 0);
        test.ok(_.keys(rn.allWMEs).length === 0);
        //assert the wme:
        let newWMEId = rn.assertWME(exampleData);
        //Check the wme is asserted, and the action for it fires
        test.ok(_.keys(rn.allWMEs).length === 1);
        test.ok(rn.allWMEs[newWMEId] !== undefined);
        test.ok(rn.allWMEs[newWMEId].data.num === 5);
        test.ok(rn.allWMEs[newWMEId].data.str === "test");
        //test.ok(_.reject(rn.proposedActions,d=>d===undefined).length === 1);
        test.ok(_.keys(rn.proposedActions).length === 1);
        test.done();
    },

    //Assert and then retract a wme
    ruleFire_and_retraction_test : function(test){
        let rn = makeRete(),
            aRule = new rn.Rule(),
            data = {
                "first" : 5,
                "second" : 10
            },
            components;

        aRule.newCondition("positive",{
            tests : [["first","EQ",5],
                     ["second","EQ",10]],
            bindings : [["blah","first",[]]]
        })
            .newAction("assert","testAction",{
                values : [["output","${blah}"]],
                arith : [["output","+",5]],
                regexs : [],
                timing : [0,0,0],
                priority : 0
            });
        
        //Add the rule
        rn.addRule(aRule);
        //Check there are no actions or wmes
        test.ok(_.keys(rn.proposedActions).length === 0);
        test.ok(_.keys(rn.allWMEs).length === 0);
        //Assert the wme:
        let newWMEId = rn.assertWME(data);
        //Check the wme is asserted, and the action for it fires
        test.ok(_.keys(rn.allWMEs).length === 1);
        test.ok(rn.allWMEs[newWMEId] !== undefined);
        test.ok(rn.allWMEs[newWMEId].data.first === 5);
        test.ok(rn.allWMEs[newWMEId].data.second === 10);
        //test.ok(_.reject(rn.proposedActions,d=>d===undefined).length === 1);
        test.ok(_.keys(rn.proposedActions).length === 1);
        //check alphamemory items, tokens, etc:
        let wme = rn.allWMEs[newWMEId];
        test.ok(wme.alphaMemoryItems.length === 1);
        test.ok(wme.tokens.length === 1);
        //Retract the wme:
        rn.retractWME(wme);
        //Check the wme is cleaned up:
        test.ok(wme.alphaMemoryItems.length === 0);
        test.ok(wme.tokens.length === 0);
        //check the proposed action is cleaned up
        //test.ok(_.reject(rn.proposedActions,d=>d===undefined).length === 0);
        test.ok(_.keys(rn.proposedActions).length === 0);
        test.done();
    },

    //add a rule, assert a fact, check the proposed action that results
    ruleFire_proposedAction_test : function(test){
        let rn = makeRete(),
            aRule = new rn.Rule(),
            data = {
                "first" : 5,
                "second" : 10
            };

        aRule.newCondition("positive",{
            tests : [["first","EQ",5],
                     ["second","EQ",10]],
            bindings : [["blah","first",[]]]
        })
            .newAction("assert","testAction",{
                values : [["output","${blah}"]],
                arith : [["output","+",5]],
                regexs : [],
                timing : [0,0,0],
                priority : 0
            });

        //Add the rule
        rn.addRule(aRule);
        rn.assertWME(data);
        //Inspect the resulting proposed action:
        test.ok(_.values(rn.proposedActions).length === 1);
        let proposedAction = _.values(rn.proposedActions)[0];
        test.ok(proposedAction !== undefined);
        test.ok(proposedAction.payload.output !== undefined);
        test.ok(proposedAction.payload.output === 10);
        test.done();
    },

    //Create and test a rule with a negative node
    ruleFire_negative_node_test : function(test){
        let rn = makeRete(),
            aRule = new rn.Rule(),
            data = {
                "first" : 5,
                "second" : 10,
                "blah" : "blah"
            };

        aRule.newCondition("positive",{
            tests : [['first','EQ',5],
                     ['second','EQ',10]],
            bindings : [['blah','first',[]]]
        })
            .newCondition("negative",{
                tests : [['first','EQ',5]],
                bindings : [['blah','first',[]]]
            })
            .newAction("assert","testNegAction",{
                values : [['output','${blah}']],
                arith : [['output','+',5]],
                regexs : [],
                timing : [0,0,0],
                priority : 0
            });

        //Add the rule
        rn.addRule(aRule);
        //Assert a wme
        let wmeId = rn.assertWME(data),
            wme = rn.allWMEs[wmeId];
        test.ok(wme.negJoinResults.length === 1);
        //Inspect the resulting proposed actions:
        //let proposedActions = _.reject(rn.proposedActions,d=>d===undefined);
        test.ok(_.keys(rn.proposedActions).length === 0);
        test.done();
    },    

    //store wme test
    store_wme_test : function(test){
        let rn = makeRete(),
            testWME = new rn.WME({testValue : 5});
        test.ok(_.keys(rn.allWMEs).length === 0);
        rn.storeWME(testWME);
        test.ok(_.keys(rn.allWMEs).length === 1);
        test.done();
    },
    
    //add to schedule test
    addToScheduleTest : function(test){
        let rn = makeRete(),
            //create a proposed action
            propAction = new rn.ProposedAction(rn,"assert",{},new RDS.Token(),rn.currentTime,{
                invalidateOffset : 0,
                performOffset : 0,
                unperformOffset : 0
            },0),
            propAction2 = new rn.ProposedAction(rn,"retract",{},new RDS.Token(),rn.currentTime,{
                invalidateOffset : 0,
                performOffset : 0,
                unperformOffset : 0
            },0);
        //test.ok(_.reject(rn.proposedActions,d=>d===undefined).length === 0);
        test.ok(_.keys(rn.proposedActions).length === 0);
        //insert it in
        rn.proposeAction(propAction);
        //check it is placed correctly
        //test.ok(_.reject(rn.proposedActions,d=>d===undefined).length === 1);
        test.ok(_.keys(rn.proposedActions).length === 1);
        //add the other
        rn.proposeAction(propAction2);
        test.ok(_.keys(rn.proposedActions).length === 2);
        //test.ok(_.reject(rn.proposedActions,d=>d===undefined).length === 2);
        //Check you can't add the same action again
        test.throws(function(){
            rn.proposeAction(propAction2);
        });
        test.done();
    },


    //Test simple registered action
    simpleRegsterActionTest : function(test){
        let rn = makeRete(),
            aRule = new rn.Rule(),
            exampleDataForWME = {
                num : 5
            },
            //The let to modify to test the action
            testLet = 0;
        //Register a dummy action
        rn.registerAction({
            name : "registeredTestAction",
            propose : function(token,reteNet){
                return new reteNet.ProposedAction(reteNet,"registeredTestAction",
                                                  token.bindings,token,reteNet.currentTime,
                                                  {
                                                      invalidateOffset : 0,
                                                      performOffset : 0,
                                                      unperformOffset : 0,
                                                  });
            },
            perform : function(proposedAction,reteNet){
                if(proposedAction.actionType === "registeredTestAction"){
                    testLet += 5;
                }
            }
        });
        //Setup the rule
        aRule.newCondition('positive',{
            tests : [['num','EQ',5]],
            bindings : [['num','num',[]]]
        })
            .newAction("registeredTestAction","myAction",{
                values : [],
                arith : [],
                regexs : [],
                timing : [0,0,0],
            });
        rn.addRule(aRule);
        //check there are no proposed actions:
        //test.ok(_.reject(rn.proposedActions,d=>d===undefined).length === 0);
        test.ok(_.keys(rn.proposedActions).length === 0);
        //Assert the data
        rn.assertWME(exampleDataForWME);
        //there should now be a proposed action
        //test.ok(_.reject(rn.proposedActions,d=>d===undefined).length === 1);
        test.ok(_.keys(rn.proposedActions).length === 1);
        //Schedule the action:
        rn.scheduleAction(_.values(rn.proposedActions)[0].id);
        //step time:
        rn.stepTime();
        //The performance should have changed the 
        test.ok(testLet === 5);
        test.done();
    },

    //Assert schedule test:
    assertScheduleTest : function(test){
        let rn = makeRete(),
            aRule = new rn.Rule(),
            testData = {
                num : 5,
                str : "testString",
            };

        aRule.newCondition("positive",{
            tests : [["num","EQ",5]],
            bindings : [["str","str",[]]],
        })
            .newAction("assert","testAction",{
                values : [["str","${str}"]],
                arith : [],
                regexs : [],
                timing : [0,0,0],
                priority : 0
            });

        rn.addRule(aRule);
        rn.assertWME(testData);
        //let proposedActions = _.reject(rn.proposedActions,d=>d===undefined);
        test.ok(_.keys(rn.proposedActions).length === 1);
        rn.scheduleAction(_.values(rn.proposedActions)[0]);
        //test.ok(_.reject(rn.allWMEs,d=>d===undefined).length === 1);
        test.ok(_.keys(rn.allWMEs).length === 1);
        rn.stepTime();
        //test.ok(_.reject(rn.allWMEs,d=>d===undefined).length === 2);
        test.ok(_.keys(rn.allWMEs).length === 2);
        test.done();
    },

    //schedulings test
    schedule_perform_offset_test : function(test){
        let rn = makeRete(),
            aRule = new rn.Rule(),
            testData = {
                num : 5,
                str : "testString",
            };

        aRule.newCondition("positive",{
            tests : [["num","EQ",5]],
            bindings : [["str","str",[]]],
        })
            .newAction("assert","testAction",{
                values : [["str","${str}"]],
                arith : [],
                regexs : [],
                timing : [0,2,0],
                priority : 0
            });

        rn.addRule(aRule);
        rn.assertWME(testData);
        //let proposedActions = _.reject(rn.proposedActions,d=>d===undefined);
        test.ok(_.keys(rn.proposedActions).length === 1);
        rn.scheduleAction(_.values(rn.proposedActions)[0].id);
        test.ok(_.keys(rn.allWMEs).length === 1);
        rn.stepTime();//start step
        test.ok(_.keys(rn.allWMEs).length === 1);
        rn.stepTime();//first post schedule
        test.ok(_.keys(rn.allWMEs).length === 1);
        rn.stepTime();//second post schedule -- assert performed
        test.ok(_.keys(rn.allWMEs).length === 2);
        rn.stepTime();//one after
        test.ok(_.keys(rn.allWMEs).length === 2);
        test.done();
    },

    //test the retraction of a wme
    retractTest : function(test){
        let rn = makeRete(),
            aRule = new rn.Rule(),
            testData = {
                num : 5,
                str : "testString",
            };
        
        aRule.newCondition("positive",{
            tests : [["num","EQ",5]],
            bindings : [["wmeid","$id",[]]],
        })
            .newAction("retract","testAction",{
                values : [["wme1","${wmeid}"]],
                arith : [],
                regexs : [],
                timing : [0,0,0],
                priority : 0
            });

        rn.addRule(aRule);
        let newWMEId = rn.assertWME(testData),
        //Get the wme:
            theWME = rn.allWMEs[newWMEId];
        //let proposedActions = _.reject(rn.proposedActions,d=>d===undefined);
        test.ok(_.keys(rn.proposedActions).length === 1);
        //schedule the action
        rn.scheduleAction(_.values(rn.proposedActions)[0]);
        test.ok(_.keys(rn.allWMEs).length === 1);
        //perform the action:
        rn.stepTime();
        //wme remains, but is marked as retracted
        test.ok(_.keys(rn.allWMEs).length === 0);
        //check assertion time:
        test.ok(theWME.lifeTime[0] === 1);
        //check retraction time:
        test.ok(theWME.lifeTime[1] === 1);
        test.done();
    },
    //test the firing of two rules
    twoRule_test : function(test){
        let rn = makeRete(),
            rule1 = new rn.Rule(),
            rule2 = new rn.Rule(),
            wmeData = {
                num : 5,
                str : "hello"
            };

        rule1.newCondition("positive",{
            tests : [["num","EQ",5]],
            bindings : [["num","num",[]]],
        })
            .newAction("assert","firstRule",{
                values : [["num","${num}"]],
                arith : [["num","+",5]],
            });

        rule2.newCondition("positive",{
            tests : [["str","EQ","hello"]],
            bindings : [["str","str",[]]]
        })
            .newAction("assert","secondRule",{
                values : [["str","${str}"]],
                regexs : [["str","h","g","G"]]
            });

        //check no rules or actions exist
        test.ok(_.keys(rn.allRules).length === 0);
        test.ok(_.keys(rn.actions).length === 0);
        //Add the rules
        rn.addRule(rule1)[0].addRule(rule2);
        //check for rn updating
        test.ok(_.keys(rn.allRules).length === 2);
        test.ok(_.keys(rn.actions).length === 2);

        //test the rules firing:
        test.ok(_.keys(rn.allWMEs).length === 0);
        //assert data
        rn.assertWME(wmeData);
        test.ok(_.keys(rn.allWMEs).length === 1);
        test.ok(_.keys(rn.proposedActions).length === 2,_.keys(rn.proposedActions).length);
        //schedule the actions
        rn.scheduleAction(_.keys(rn.proposedActions)[0]);
        test.ok(_.keys(rn.proposedActions).length === 1);
        rn.scheduleAction(_.keys(rn.proposedActions)[0]);
        //enact the actions
        let changes = rn.stepTime();
        //check for the changes
        test.ok(_.keys(rn.allWMEs).length === 3);
        test.ok(changes.length === 2);
        test.done();
    },
    //test the prioritised firing order of two rules
    twoRule_offset_test : function(test){
        let rn = makeRete(),
            rule1 = new rn.Rule(),
            rule2 = new rn.Rule(),
            wmeData = {
                num : 5,
                str : "hello"
            };

        rule1.newCondition("positive",{
            tests : [["num","EQ",5]],
            bindings : [["num","num",[]]],
        })
            .newAction("assert","firstRule",{
                values : [["num","${num}"]],
                arith : [["num","+",5]],
                timing : [0,1,0]
            });

        rule2.newCondition("positive",{
            tests : [["str","EQ","hello"]],
            bindings : [["str","str",[]]]
        })
            .newAction("assert","secondRule",{
                values : [["str","${str}"]],
                regexs : [["str","h","g","G"]],
                timing : [0,2,0],
            });

        //check no rules or actions exist
        test.ok(_.keys(rn.allRules).length === 0);
        test.ok(_.keys(rn.actions).length === 0);
        //Add the rules
        rn.addRule(rule1)[0].addRule(rule2);
        //check for rn updating
        test.ok(_.keys(rn.allRules).length === 2);
        test.ok(_.keys(rn.actions).length === 2);

        //test the rules firing:
        test.ok(_.keys(rn.allWMEs).length === 0);
        //assert data
        rn.assertWME(wmeData);
        test.ok(_.keys(rn.allWMEs).length === 1);
        test.ok(_.keys(rn.proposedActions).length === 2,_.keys(rn.proposedActions).length);
        //schedule the actions
        rn.scheduleAction(_.keys(rn.proposedActions)[0])
            .scheduleAction(_.keys(rn.proposedActions)[0]);
        //enact the actions
        let changes = rn.stepTime();
        //changes should NOT take plus until 1 and 2 timesteps have passed
        //check for the changes
        test.ok(_.keys(rn.allWMEs).length === 1);
        test.ok(changes.length === 0);
        //First time after, 1 wme added:
        changes = rn.stepTime();
        test.ok(_.keys(rn.allWMEs).length === 2);
        test.ok(changes.length === 1);
        //Second, another wme added:
        changes = rn.stepTime();
        test.ok(_.keys(rn.allWMEs).length === 3);
        test.ok(changes.length === 1);
        test.done();
    },

    //test the priority of schedule tasks
    twoRule_priority_test : function(test){
        let rn = makeRete(),
            rule1 = new rn.Rule(),
            rule2 = new rn.Rule(),
            wmeData = {
                num : 5,
                str : "hello"
            };

        rule1.newCondition("positive",{
            tests : [["num","EQ",5]],
            bindings : [["num","num",[]]],
        })
            .newAction("assert","firstRule",{
                values : [["num","${num}"]],
                arith : [["num","+",5]],
                priority : 1,
            });

        rule2.newCondition("positive",{
            tests : [["str","EQ","hello"]],
            bindings : [["str","str",[]]]
        })
            .newAction("assert","secondRule",{
                values : [["str","${str}"]],
                regexs : [["str","h","g","G"]],
                priority : 2,
            });

        //check no rules or actions exist
        test.ok(_.keys(rn.allRules).length === 0);
        test.ok(_.keys(rn.actions).length === 0);
        //Add the rules
        rn.addRule(rule1)[0].addRule(rule2);
        //check for rn updating
        test.ok(_.keys(rn.allRules).length === 2);
        test.ok(_.keys(rn.actions).length === 2);

        //test the rules firing:
        test.ok(_.keys(rn.allWMEs).length === 0);
        //assert data
        rn.assertWME(wmeData);
        test.ok(_.keys(rn.allWMEs).length === 1);
        test.ok(_.keys(rn.proposedActions).length === 2);
        //schedule the actions
        rn.scheduleAction(_.keys(rn.proposedActions)[0])
            .scheduleAction(_.keys(rn.proposedActions)[0]);
        //use listeners to check:
        let assertRecord = [];
        rn.registerListener('assert',function(d){
            assertRecord.push(d);
        });
        //enact the actions
        let changes = rn.stepTime();
        //String wme should come before num wme
        test.ok(assertRecord[0].str === 'Gello');
        test.ok(assertRecord[0].num === undefined);
        test.ok(assertRecord[1].str === undefined);
        test.ok(assertRecord[1].num === 10);
        test.ok(_.keys(rn.allWMEs).length === 3);
        test.done();
    },

    //----------------------------------------
    
    singleRule_twoAction_test : function(test){
        let rn = makeRete(),
            rule1 = new rn.Rule(),
            wmeData = {
                num : 5,
                str : "hello"
            };

        rule1.newCondition("positive",{
            tests : [["num","EQ",5]],
            bindings : [["num","num",[]],
                        ["str","str",[]]],
        })
            .newAction("assert","firstRule",{
                values : [["num","${num}"]],
                arith : [["num","+",5]],
                priority : 1,
            })
            .newAction("assert","secondRule",{
                values : [["str","${str}"]],
                regexs : [["str","h","g","G"]],
                priority : 2,
            });

        //check no rules or actions exist
        test.ok(_.keys(rn.allRules).length === 0);
        test.ok(_.keys(rn.actions).length === 0);
        //Add the rules
        rn.addRule(rule1);
        //check for rn updating
        test.ok(_.keys(rn.allRules).length === 1);
        test.ok(_.keys(rn.actions).length === 1);

        //test the rules firing:
        test.ok(_.keys(rn.allWMEs).length === 0);
        //assert data
        rn.assertWME(wmeData);
        test.ok(_.keys(rn.allWMEs).length === 1);
        test.ok(_.keys(rn.proposedActions).length === 2,_.keys(rn.proposedActions).length);
        //schedule the actions
        rn.scheduleAction(_.keys(rn.proposedActions)[0]);
        //use listeners to check:
        let assertRecord = [];
        rn.registerListener('assert',function(d){
            assertRecord.push(d);
        });
        
        //enact the actions
        let changes = rn.stepTime();
        //String wme should come before num wme
        test.ok(assertRecord[0].str === 'Gello');
        test.ok(assertRecord[0].num === undefined);
        test.ok(assertRecord[1].str === undefined);
        test.ok(assertRecord[1].num === 10);
        test.ok(_.keys(rn.allWMEs).length === 3);
        test.done();
    },

    //remove rule test
    removeRuleTest : function(test){
        let rn = makeRete(),
            aRule = new rn.Rule(),
            exampleData = {
                num : 5,
                str : "test"
            };

        aRule.newCondition("positive",{
            tests : [["num","EQ",5]],
            bindings : []
        })
            .newAction("assert","testAction",{
                values : [["message","blah"]]
            });

        //Preconditions:
        test.ok(_.keys(rn.actions).length === 0);
        test.ok(rn.rootAlpha.children.length === 0);
        test.ok(rn.dummyBetaMemory.children.length === 0);
        test.ok(rn.dummyBetaMemory.unlinkedChildren.length === 0);

        //add the rule
        let ruleAction = rn.addRule(aRule)[1];

        //postConditions:
        test.ok(_.keys(rn.actions).length === 1);
        test.ok(rn.rootAlpha.children.length === 1);
        test.ok(rn.dummyBetaMemory.unlinkedChildren.length === 1);

        //remove the rule:
        rn.removeRule(ruleAction);

        test.ok(rn.rootAlpha.children.length === 0);
        test.ok(rn.dummyBetaMemory.unlinkedChildren.length === 0);
        
        
        test.done();
    }
    
    
};
