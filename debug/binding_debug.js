const repl = require('repl')
const cli = repl.start() 
import { ReteNet } from '../src/ReteClassInterface';
import _ from 'lodash';
let rn = new ReteNet(),
    aRule1 = new rn.Rule(),
    data = { first: 'blah' };

aRule1.newCondition("positive",{
    tests : [['first','EQ','blah']],
    bindings : [['aBinding','first',[]]]
})
    .newAction("assert","testPositiveAction",{
        values : [['output','${aBinding}']],
        regexs : [['output','b','g','Q']],
    });

rn.addRule(aRule1);

cli.context.rn = rn;
cli.context.aRule1 = aRule1;
cli.context.data = data;
cli.context._ = _;
