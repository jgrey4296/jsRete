    //add to schedule test
    addToScheduleTest : function(test){
        var rn = makeRete(),
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

    
    //schedule action test

    //steptime test

    //remove rule test

    //register action test



    //Test simple registered action
    simpleRegsterActionTest : function(test){
        var rn = makeRete(),
            aRule = new rn.Rule(),
            exampleDataForWME = {
                num : 5
            },
            //The var to modify to test the action
            testVar = 0;
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
                    testVar += 5;
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
        test.ok(testVar === 5);
        test.done();
    },

    //Assert schedule test:
    assertScheduleTest : function(test){
        var rn = makeRete(),
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
        //var proposedActions = _.reject(rn.proposedActions,d=>d===undefined);
        test.ok(_.keys(rn.proposedActions).length === 1);
        rn.scheduleAction(_.values(rn.proposedActions)[0]);
        //test.ok(_.reject(rn.allWMEs,d=>d===undefined).length === 1);
        test.ok(_.keys(rn.allWMEs).length === 1);
        rn.stepTime();
        //test.ok(_.reject(rn.allWMEs,d=>d===undefined).length === 2);
        test.ok(_.keys(rn.allWMEs).length === 2);
        test.done();
    },

    schedule_perform_offset_test : function(test){
        var rn = makeRete(),
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
        //var proposedActions = _.reject(rn.proposedActions,d=>d===undefined);
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

    retractTest : function(test){
        var rn = makeRete(),
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
        var newWMEId = rn.assertWME(testData),
            theWME = rn.allWMEs[newWMEId];
        //var proposedActions = _.reject(rn.proposedActions,d=>d===undefined);
        test.ok(_.keys(rn.proposedActions).length === 1);
        //schedule the action
        rn.scheduleAction(_.values(rn.proposedActions)[0]);
        test.ok(_.keys(rn.allWMEs).length === 1);
        //perform the action:
        rn.stepTime();
        //wme has been removed
        test.ok(_.keys(rn.allWMEs).length === 0);
        //check assertion time:
        test.ok(theWME.lifeTime[0] === 1);
        //check retraction time:
        test.ok(theWME.lifeTime[1] === 1);
        test.done();
    },
    
    twoRule_test : function(test){
        var rn = makeRete(),
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
        var changes = rn.stepTime();
        //check for the changes
        test.ok(_.keys(rn.allWMEs).length === 3);
        test.ok(changes.length === 2);
        test.done();
    },

    twoRule_offset_test : function(test){
        var rn = makeRete(),
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
        var changes = rn.stepTime();
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

    twoRule_priority_test : function(test){
        var rn = makeRete(),
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
        var assertRecord = [];
        rn.registerListener('assert',function(d){
            assertRecord.push(d);
        });
        //enact the actions
        var changes = rn.stepTime();
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
        var rn = makeRete(),
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
        var assertRecord = [];
        rn.registerListener('assert',function(d){
            assertRecord.push(d);
        });
        
        //enact the actions
        var changes = rn.stepTime();
        //String wme should come before num wme
        test.ok(assertRecord[0].str === 'Gello');
        test.ok(assertRecord[0].num === undefined);
        test.ok(assertRecord[1].str === undefined);
        test.ok(assertRecord[1].num === 10);
        test.ok(_.keys(rn.allWMEs).length === 3);
        test.done();
    },

    
};
