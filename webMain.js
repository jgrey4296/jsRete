require.config({
    baseUrl : "/",
    paths : {
        rete : "/Rete.min",
        lodash: "/libs/lodash"
    }
});

require(['lodash','rete'],function(_,Rete){
    console.log("Rete Example");
    var rn = new Rete(),
        aRule = new rn.Rule(),
        testData = {
            num : 5,
            str : "testString"
        };

    aRule.newCondition("positive",{
        tests : [["num","EQ",5]],
        bindings : [["str","str",[]]]
    })
        .newAction("assert","testAction",{
            values : [["str","$str"]],
            arith : [],
            regexs : [],
            timing : [0,2,0],
            priority : 0
        });

    rn.addRule(aRule);
    rn.assertWME(testData);
    var proposedActions = _.reject(rn.proposedActions,d=>d===undefined);
    rn.scheduleAction(proposedActions[0]);
    var i = 5;
    while(0 < i--){
        rn.stepTime();
        console.log(rn);
    }
});
