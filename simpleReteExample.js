require('v8-profiler');
var Rete = require('./Rete.min'),
    _ = require('underscore');


var rn = new Rete(),
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
        values : [["num","$num"]],
        arith : [["num","+",5]],
        priority : 1,
    })
    .newAction("assert","secondRule",{
        values : [["str","$str"]],
        regexs : [["str","h","g","G"]],
        priority : 2,
    });

//Add the rules
rn.addRule(rule1);

//assert data
rn.assertWME(wmeData);
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

setInterval(function(){
    console.log("Program running",rn);

},1000);


