//Ctors for Rules

/**
   Rule Ctor. Holds conditions and actions
*/
var nextId = 0;

var Rule = function(name){
    this.id = nextId++;
    this.name = name || "anon";
    this.tags = { type : "rule" };
    this.conditions = {};
    this.actions = {};
};

//testsAndBindings = { tests : [ [var,op,val]...], bindings : [ [var,val,[op,var]]] }
Rule.prototype.newCondition = function(type,testsAndBindings){
    var newCondition = new Condition(type);
    //Add all tests
    if(testsAndBindings.tests !== undefined){
        testsAndBindings.tests.forEach(d=>newCondition.addTest(...d));
    }
    if(testsAndBindings.bindings !== undefined){
        testsAndBindings.bindings.forEach(d=>newCondition.addBinding(...d));
    }
    this.addCondition(newCondition);
    return this;
};

//valuesArithRegexsAndTiming = { values : [], arith : [], regexs : [], timing : [], priority : n}
Rule.prototype.newAction = function(type,name,valuesArithRegexsAndTiming){
    var newAction = new Action(type,name);
    if(valuesArithRegexsAndTiming.values !== undefined){
        valuesArithRegexsAndTiming.values.forEach(d=>newAction.addValue(...d));
    }
    if(valuesArithRegexsAndTiming.arith !== undefined){
        valuesArithRegexsAndTiming.arith.forEach(d=>newAction.addArithmetic(...d));
    }
    if(valuesArithRegexsAndTiming.regexs !== undefined){
        valuesArithRegexsAndTiming.regexs.forEach(d=>newAction.addRegex(...d));
    }
    if(valuesArithRegexsAndTiming.priority !== undefined){
        newAction.priority = valuesArithRegexsAndTiming.priority;
    }
    if(valuesArithRegexsAndTiming.timing !== undefined){
        newAction.addTiming(...valuesArithRegexsAndTiming.timing);
    }
    this.addAction(newAction);
    return this;
};

Rule.prototype.addCondition = function(condition){
    this.conditions[condition.id] = condition;
    return this;
};

Rule.prototype.addAction = function(action){
    this.actions[action.id] = action;
    return this;
};

/**
   Condition Ctor. Holds tests, bindings, and other conditions
 */
var Condition = function(type){
    this.id = nextId++;
    this.name = "conditon";
    type = type === undefined ? "positive" : type;
    switch(type){
    case "positive":
        this.tags = { type : "condition",
                      isPositive : true };
        break;
    case "negative":
        this.tags = { type : "condition",
                      isNegative : true };
        break;
    case "ncc":
        this.tags = { isNCCCondition : true,
                      type : "negConjCondition" };
        break;
    default:
        throw new Error("Unrecognised condition");
    }
    this.constantTests = [];
    this.bindings = {};
    this.conditions = {};    
};

Condition.prototype.addTest = function(field,op,val){
    this.constantTests.push({
        field : field,
        operator : op,
        value : val
    });
    return this;
};

Condition.prototype.addBinding = function(boundName,dataName,tests){
    //tests as pairs of op and value/boundName
    this.bindings[boundName] = [dataName,tests];
};

Condition.prototype.newCondition = function(type,testsAndBindings){
    if(this.type !== 'negConjCondition') { throw new Error("Only NCC's can have sub conditions"); }
    var newCondition = new Condition(type);
    testsAndBindings.tests.forEach(d=>newCondition.addTest(...d));
    testsAndBindings.bindings.forEach(d=>newCondition.addBinding(...d));
    this.conditions[newCondition.id] = newCondition;
};

/**
   Action constructor, defines data/values to put in a new wme,
   arithmetic and regex actions to apply to those values
 */
var Action = function(actionType,name){
    this.id = nextId++;
    this.name = name || "anon";
    this.tags = { actionType : actionType || "assert" };
    this.values = {};
    this.arithmeticActions = {};
    this.regexActions = {};
    //Specify the timing of the proposed action to create:
    this.timing = {
        invalidateOffset : 0,
        performOffset : 0,
        unperformOffset : 0
    };
    this.priority = 0;
};

Action.prototype.addValue = function(varName,value){
    this.values[varName] = value;
    return this;
};

Action.prototype.addArithmetic = function(varName,op,value){
    this.arithmeticActions[varName] = [op,value];
    return this;
};

Action.prototype.addRegex = function(varName,regex,options,replaceValue){
    this.regexActions[varName] = [regex,options,replaceValue];
    return this;
};

Action.prototype.addTiming = function(invalid,perform,unperform){
    this.timing = {
        invalidateOffset : invalid,
        performOffset : perform,
        unperformOffset : unperform
    };
    return this;
};


module.exports = {
    Rule : Rule,
    Condition : Condition,
    Action : Action
};
