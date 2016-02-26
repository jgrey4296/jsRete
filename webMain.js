require.config({
    baseUrl : "/",
    paths : {
        rete : "/Rete.min",
        underscore : '/libs/underscore-min'
    },
});

require(['underscore','rete'],function(_,Rete){
    console.log("Rete Example");
    var rn = new Rete(),
        aRule = new rn.RuleCtors.Rule(),
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

    //Assert the data
    rn.assertWME(exampleDataForWME);
    //Schedule the action:
    rn.scheduleAction(_.reject(rn.proposedActions,d=>d===undefined)[0].id);
    //step time:
    rn.stepTime();

    
});
