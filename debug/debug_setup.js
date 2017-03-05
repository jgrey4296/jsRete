const repl = require('repl')
const cli = repl.start() 
import { ReteNet } from '../src/ReteClassInterface';
import _ from 'lodash';
let rn = new ReteNet(),
    aRule1 = new rn.Rule(),
    aRule2 = new rn.Rule(),
    data = { first: 5, second: 10 };

rn.registerListener('propose',(action) => {
    console.log("Proposing: ", action.id);
});

rn.registerListener('schedule',(actionId) => {
    console.lo('scheduling', actionId);
});


aRule1.newCondition("positive",{
    tests : [['first','EQ',5],
             ['second','EQ',10]],
    bindings : [['aBinding','first',[]]]
})
    .newAction("assert","testPositiveAction",{
        values : [['output','${aBinding}']],
        arith : [['output','+',5]],
        regexs : [],
        timing : [0,0,0],
        priority : 0
    });

aRule2.newCondition("positive",{
    tests : [ ['second','EQ',10]],
    bindings : [['aBinding','first',[]]]
})
    .newCondition("negative",{
        tests : [['first','EQ',5]],
        bindings : [],
    })
    .newAction("assert","testNegAction",{
        values : [['output','${aBinding}']],
        arith : [['output','+',5]],
        regexs : [],
        timing : [0,0,0],
        priority : 0
    });


rn.addRule(aRule1);
rn.addRule(aRule2);

cli.context.rn = rn;
cli.context.aRule1 = aRule1;
cli.context.aRule2 = aRule2;
cli.context.data = data;
cli.context._ = _;
