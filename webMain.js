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
            values : [['output','$blah']],
            arith : [['output','+',5]],
            regexs : [],
            timing : [0,0,0],
            priority : 0
        });

    //Add the rule
    rn.addRule(aRule);
    //Assert a wme
    var wmeId = rn.assertWME(data),
        wme = rn.allWMEs[wmeId];
    //Inspect the resulting proposed actions:
    var proposedActions = _.reject(rn.proposedActions,d=>d===undefined);

});
