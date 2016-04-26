# jsRete

An implementation of [Doorenbos'] (http://oai.dtic.mil/oai/oai?verb=getRecord&metadataPrefix=html&identifier=ADA293105) version of Rete.

## Dependencies:
[lodash](https://lodash.com/)  
[NodeUnit](https://github.com/caolan/nodeunit) for unit tests  
[amdefine](https::/github.com/jrburke/amdefine)  

## Basic Usage
The Individual source files in `js` are written in CommonJS format, and can be required in node easily enough. There is a `makefile` that builds a AMD packaged version however (`Rete.min.js`), which is preferable, and which can use amdefine on node. Thus:
```
    var Rete = require('Rete.min');
```
or:
```
    define(['Rete.min'],function(Rete){
    
    });
```

### Creation of a Rete Net:
```
    var reteInstance = new Rete();
```

### Asserting:
```
    let wmeId = reteInstance.assertWME({ name : "bob", age: 23});
```
Alternatively:
```
    let wme = new reteInstance.WME({name : "bob", age : 23}),
        wmeId = reteInstance.assertWME(wme);
```
Asserting an object will create a wme with a `data` field, that holds that object. Be careful, modifying that data payload *will not* cause changes in the rete net. Conditions will typically focus on that data payload automatically, as will bindings.

### Retracting:
```
    reteInstance.retractWME(wmeId);
```

### Stepping the rete net forward:
```
    reteInstance.stepTime();
```
Stepping time forward will execute scheduled actions (more on that later), invalidate some potential actions, and call cleanup actions (if defined).

### Creation of Rules:
Although [jg_shell](https://github.com/jgrey4296/jg_shell) is designed to enable authoring of rules, Rete also 
exposes a utility constructor:
```
    var aRule = new reteInstance.Rule();
```

### Conditions:
Adding a condition to a rule is split into two components: tests, and bindings. The easiest way is
to describe these in an object, and use the `newCondition` method of a rule:
```
    aRule.newCondition({
        tests : [['first','EQ',5],
                 ['second','GT',10]],
         bindings : [['blah','first',[]]]
         });
```
The above condition tests for an asserted object `{ first : 5, second : 15}`, and will enable actions to use the value of `first` as `${blah}`. 
(The binding syntax is meant to be similar to templated strings in es6, but runtime specifiable).

The `tests` field is an array of triples, of the form `[ OBJECTFIELD, COMPARISONOPERATOR, COMPARISONVALUE ]`.  
Comparison operators can be found in [`js/ReteComparisonOperators`](https://github.com/jgrey4296/jsRete/blob/master/js/ReteComparisonOperators.js), and can be extended by adding binary functions into that object.

The object field can be specified as a string of subfields (eg: "values.something.a"), which will succeed on wmes asserted like:
```
    reteInstance.assertWME({
        values : { something : { a : 5 } }
    });
```

The `bindings` field is again an array of triples, but this time the form is `[ BINDNAME, PARAMNAME, BINDTESTS ]`.
By 'BindTests', I mean further tests on the value being bound. (eg: `...bindings: [['blah','first',['GT','${otherBinding}']]]` would only bind `first` to `blah` if the value is greater than the value already bound to `otherBinding`).  
If the binding value is `$id`, the wme's id field, rather than its data payload, will be used instead. 

### Actions

Actions can be specified similarly to conditions:
```
    aRule.newAction("assert","testAction",{
        values : [],
        arith : [],
        regexs : [],
        timing : [],
        priority : 0
    });
```
`assert` is the action type the rule will propose (see [`js/ReteActions`](https://github.com/jgrey4296/jsRete/blob/master/js/ReteActions.js) and the modules it loads).
`testAction` is the name of the rule. The Object that follows provides `values`,`arith`,`regexs`,`timing` and `priority` fields:

#### values
The values field holds an array of tuples: `[ name, value ]` that will form the object the action uses. eg: `values : [[ "message", "test message" ]]` will create a proposed action with a `payload` object: `{ message : "test message" }`.

#### arith
The arith field holds triples of `[ VALUE, OPERATOR, AMOUNT ]`. The modifications specified use the arithmetic operators defined in [`js/ReteArithmeticActions.js`](https://github.com/jgrey4296/jsRete/blob/master/js/ReteArithmeticActions.js) (and can be extended as such). They are applied after the creation of the payload object (ie: the values from the previous section). 

#### regexs
Regex operations are similar to arithmetic operations, just for string manipulation instead. the regex field is an array of 5-tuples, of the form `[ VALUE, REGEX, OPTIONS, REPLACE]`. The result is essentially value.

#### timing
The timing array holds values o determine the (i)nvalidate, (p)erform, and (u)nperform offsets. ie: An action is proposed at time `t`, and will be invalidated/removed from the proposed set at time t+i. If the proposed action is chosen to be scheduled at time t', then the action will actually take place at t'+p, and an automated cleaned (eg: retraction) will occur at time t'+p+u.

#### priority
Priority provides one heuristic for selecting which proposed action form the proposed action set should be performed.

### The Conflict set
When a rule's conditions are met, the actions are triggered. Actions do not act immediately, instead they propose an action, which can be found in the retenet's `proposedActions` object. You can inspect these, and call the retenet's `scheduleAction` method using the proposedActions `id` field. 


### Adding new action types
Using a reteInstance's `registerAction` method, you can add additional actions the rete net can perform when an action fires. The Object the `registerAction` method takes has the form:
```
    {
        "name" : "dummyAction",
        propose : function(token, reteNet) { }, //returns a proposed action
        perform : function(proposedAction, reteNet) { }, //returns an object of consequences
    }
```
See [`js/ReteActionAssert.js`](https://github.com/jgrey4296/jsRete/blob/master/js/ReteActionAssert.js) for an example. Also see [`alertAction`](https://github.com/jgrey4296/jg_shell/blob/master/src/ReteActions/alertAction.js).
