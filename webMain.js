require.config({
    baseUrl : "/",
    paths : {
        rete : "/Rete.min",
        underscore : '/libs/underscore-min'
    },
});

require(['underscore','rete'],function(_,Rete){
    console.log("Rete Example");
    var rn = new Rete();
    console.log(rn);
    
    var aRule = new rn.RuleCtors.Rule(),
        aCondition = new rn.RuleCtors.Condition(),
        negCondition = new rn.RuleCtors.Condition("negCondition"),
        anAction = new rn.RuleCtors.Action(),
        data = {
            "first" : 5,
            "second" : 10,
            "blah" : "blah"
        },
        components;
    //verify the negCondition is constructed to be negative:
    //test.ok(negCondition.tags.isNegative === true);
    
    aCondition.addTest("first","EQ",5)
        .addTest("second","EQ",10)
        .addBinding("blah","first",[]);
    //Add a negative condition
    negCondition.addTest("first","EQ",5)
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
    
    //Assert a wme
    var wmeId = rn.assertWME(data),
        wme = rn.allWMEs[wmeId];
    //test.ok(wme.negJoinResults.length === 1);
    //Inspect the resulting proposed actions:
    var proposedActions = _.reject(rn.proposedActions,d=>d===undefined);
    console.log(rn);
    console.log(proposedActions);
    //console.log(proposedActions[0].payload.bindings);
    //test.ok(proposedActions.length === 0);
    //test.done();

    

});
