/**
   Constructors for in-library creation of rules
   @module RuleCtors
*/

let nextId = 0;

/**
   Rule Ctor. Holds conditions and actions
   @class
*/
let Rule = function(name){
    this.id = nextId++;
    this.name = name || "anon";
    this.tags = { type : "rule" };
    this.conditions = {};
    this.actions = {};
};

/**
   Creates a condition and adds it to the rule
   @param type
   @param testsAndBindings
   @method
   @returns this
*/
Rule.prototype.newCondition = function(type,testsAndBindings){
    //testsAndBindings = { tests : [ [var,op,val]...], bindings : [ [var,val,[op,var]]] }
    let newCondition = new Condition(type);
    //Add all tests
    if (testsAndBindings.tests !== undefined){
        testsAndBindings.tests.forEach(d=>newCondition.addTest(...d));
    }
    if (testsAndBindings.bindings !== undefined){
        testsAndBindings.bindings.forEach(d=>newCondition.addBinding(...d));
    }
    this.addCondition(newCondition);
    return this;
};

/**
   Creates and adds an action to the rule
   @param type
   @param name
   @param valuesArithRegexsAndTiming
   @method
   @returns this
*/
Rule.prototype.newAction = function(type,name,valuesArithRegexsAndTiming){
    //valuesArithRegexsAndTiming = { values : [], arith : [], regexs : [], timing : [], priority : n}
    let newAction = new Action(type,name);
    if (valuesArithRegexsAndTiming.values !== undefined){
        valuesArithRegexsAndTiming.values.forEach(d=>newAction.addValue(...d));
    }
    if (valuesArithRegexsAndTiming.arith !== undefined){
        valuesArithRegexsAndTiming.arith.forEach(d=>newAction.addArithmetic(...d));
    }
    if (valuesArithRegexsAndTiming.regexs !== undefined){
        valuesArithRegexsAndTiming.regexs.forEach(d=>newAction.addRegex(...d));
    }
    if (valuesArithRegexsAndTiming.priority !== undefined){
        newAction.priority = valuesArithRegexsAndTiming.priority;
    }
    if (valuesArithRegexsAndTiming.timing !== undefined){
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
   @param type
   @class
*/
let Condition = function(type){
    this.id = nextId++;
    this.name = "conditon";
    type = type === undefined ? "positive" : type;
    switch (type) {
        case "positive":
            this.tags = { type : "condition",
                          conditionType : 'positive' };
            break;
        case "negative":
            this.tags = { type : "condition",
                          conditionType : 'negative' };
            break;
        case "ncc":
            this.tags = { type : 'condition',
                          conditionType : "negConjCondition" };
            break;
        default:
            throw new Error("Unrecognised condition");
    }
    this.constantTests = [];
    this.bindings = {};
    this.conditions = {};
};

/**
   Adds a test to the condition
   @param field
   @param op
   @param val
   @method
*/
Condition.prototype.addTest = function(field,op,val){
    this.constantTests.push({
        field : field,
        operator : op,
        value : val
    });
    return this;
};

/**
   Adds a binding to the condition
   @param boundName
   @param dataName
   @param tests
   @method
*/
Condition.prototype.addBinding = function(boundName,dataName,tests){
    //tests as pairs of op and value/boundName
    this.bindings[boundName] = [dataName,tests];
};

/**
   Adds a new subcondiiton to the condition
   @param type
   @param testsAndBindings
   @method
*/
Condition.prototype.newCondition = function(type,testsAndBindings){
    if (this.type !== 'negConjCondition') { throw new Error("Only NCC's can have sub conditions"); }
    let newCondition = new Condition(type);
    testsAndBindings.tests.forEach(d=>newCondition.addTest(...d));
    testsAndBindings.bindings.forEach(d=>newCondition.addBinding(...d));
    this.conditions[newCondition.id] = newCondition;
};

/**
   Action constructor, defines data/values to put in a new wme,
   arithmetic and regex actions to apply to those values
   @param actionType
   @param name
   @class
*/
let Action = function(actionType,name){
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

/**
   Add a value to the action
   @param varName
   @param value
   @method
*/
Action.prototype.addValue = function(varName,value){
    this.values[varName] = value;
    return this;
};

/**
   Add an arithmetic modification to the action
   @param varName
   @param op
   @param value
   @method
*/
Action.prototype.addArithmetic = function(varName,op,value){
    this.arithmeticActions[varName] = [op,value];
    return this;
};

/**
   Add a regular expression modification to the action
   @param varName
   @param regex
   @param options
   @param replaceValue
   @method
*/
Action.prototype.addRegex = function(varName,regex,options,replaceValue){
    this.regexActions[varName] = [regex,options,replaceValue];
    return this;
};

/**
   Add timing information to the action
   @param invalid
   @param perform
   @param unperform
   @method
*/
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
