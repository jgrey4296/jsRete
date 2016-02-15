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
    type = type === undefined ? "condition" : type;
    switch(type){
    case "condition":
        this.tags = { type : "condition",
                      isPositive : true };
        break;
    case "negCondition":
        this.tags = { type : "condition",
                      isNegative : true };
        break;
    case "negConjCondition":
        this.tags = { isNCCCondition : true,
                      type : "negConjCondition" };
        break;
    default:
        throw new Error("Unrecognised condition");
    };
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

/**
   Action constructor, defines data/values to put in a new wme,
   arithmetic and regex actions to apply to those values
 */
var Action = function(actionType, name){
    this.id = nextId++;
    this.name = name || "anon";
    this.tags = { actionType : actionType || "assert" };
    this.values = {};
    this.arithmeticActions = {};
    this.regexActions = {};
};

Action.prototype.addValue = function(varName,value){
    this.values[varName] = value;
    return this;
};

Action.prototype.addArithmetic = function(varName,op,value){
    this.arithmeticActions[varName] = [op,value];
    return this;
}

Action.prototype.addRegex = function(varName,regex,options,replaceValue){
    this.regexActions[varName] = [regex,options,replaceValue];
    return this;
};

module.exports = {
    Rule : Rule,
    Condition : Condition,
    Action : Action
};
