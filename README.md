# jsRete

An implementation of [Doorenbos'] (http://oai.dtic.mil/oai/oai?verb=getRecord&metadataPrefix=html&identifier=ADA293105) version of Rete.

## Dependencies:
[lodash](https://lodash.com/)
[NodeUnit](https://github.com/caolan/nodeunit) for unit tests
[amdefine](https::/github.com/jrburke/amdefine)

## Basic Usage
The Individual source files in `js` are written in CommonJS format, and can be required in node easily enough. There is a `makefile` that builds a UMD packaged version however, which is preferable, and which can use amdefine on node. Thus:
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
Adding a condition to a rule is split into two components, tests, and bindings. The easiest way is
to describe these in an object, and use the 'newCondition' method of a rule:
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

The `bindings` field is again an array of triples, but this time the form is `[ BINDNAME, PARAMNAME, BINDTESTS ]`.
By 'BindTests', I mean further tests on the value being bound. (eg: `...bindings: [['blah','first',['GT','${otherBinding}']]] would only bind `first` to `blah` if the value is greater than the value already bound to `otherBinding`).

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

#### arith

#### regexs

#### timing

#### priority

### The Conflict set
When a rule's conditions are met, the actions are triggered. Actions do not act immediately, instead they propose an action, which can be found in the retenet's `proposedActions` object. You can inspect these, and call the retenet's `scheduleAction` method using the proposedActions `id` field. 
