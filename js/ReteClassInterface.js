/**
   @file ReteClassInterface
   @purpose Defines a class based ReteNet interface
 */
"use strict";
var _ = require('underscore'),
    RDS = require('./ReteDataStructures'),
    ReteNetworkBuilding = require('./ReteNetworkBuilding'),
    ReteActivationsAndDeletion = require('./ReteActivationAndDeletion'),
    ReteUtil = require('./ReteUtil'),
    RuleCtors = require('./RuleCtors'),
    ReteActions = require('./ReteActions'),
    ComparisonOperators = require('./ReteComparisonOperators'),
    ArithmeticOperators = require('./ReteArithmeticActions');


/**
   @data ReteNet
   @purpose A Data structure to hold what you need to start a retenet.
*/
var ReteNet = function(){
    this.dummyBetaMemory = new RDS.BetaMemory();
    this.rootAlpha = new RDS.AlphaNode();

    //To store proposal functions and performance actions
    //Each element of form {name: "",performFunc : func, proposeFunc : func };
    this.actionFunctions = ReteActions;

    //RuleCtor storage
    this.RuleCtors = RuleCtors;
    //Comparison operators
    this.ComparisonOperators = ComparisonOperators;
    //Arithmetic Operators:
    this.ArithmeticOperators = ArithmeticOperators;
    
    //DataStructures
    this.DataStructures = RDS;
    
    
    //Actions indexed by rule node id:
    this.actions = [];
    //WMEs indexed by id:
    this.allWMEs = [];

    //Actions whose conditions are satisfied, indexed by id
    this.proposedActions = [];
    //Actions that were chosen to be performed
    this.enactedActions = [];

    //Storage of internal nodes:
    this.allReteNodes = {};
    this.allReteNodesByType = {
        "constantTests" : {},
        "alphaMemories" : {},
        "betaMemories" : {},
        "joinNodes" : {},
        "negativeNodes" : {},
        "nccNodes" : {},
        "nccPartnerNodes" : {},
        "actionNodes" : {},
    };
    

    this.currentTime = 1;
    //Schedule Actions:
    this.schedule = {
        assertions : [],
        retractions : [],
        modifications: []
    };

};

ReteNet.prototype.storeWME = function(wme){
    this.allWMEs[wme.id] = wme;
};


//Clear the record of actions that have been performed
ReteNet.prototype.clearHistory = function(){
    this.enactedActions = [];
};

//Clear the list of proposed actions
ReteNet.prototype.clearProposedActions = function(){
    this.proposedActions = [];
};

//Assert Immediately
ReteNet.prototype.assertWME = function(wme,retractionTime){
    console.log("ASSERTING:",data);
    if(retractionTime === undefined) { retractionTime = 0; }
    if(data.isWME === undefined || data.id === undefined){
        data = new RDS.WME(data,this.currentTime,retractionTime);
        this.scheduleAction({
            actionType : "retract",
            payload : data,
            timePoint : data.lifeTime[1]
        });
        this.storeWME(data);
    }
    //Actually push the wme into the net
    ReteActivationsAndDeletion.alphaNodeActivation(this.rootAlpha,data);
    return data.id;
};

//Retract Immediately
ReteNet.prototype.retractWME = function(wme){
    //console.log("retracting immediately:",wme);
    //if not given the wme directly
    if(wme.isWME === undefined){
        //if given a wme id
        if(Number.isInteger(wme) && this.allWMEs[wme] !== undefined){
            wme = this.allWMEs[wme];
            //if given a graph node with a related wme
        }else if(wme.wmeId !== undefined && this.allWMEs[wme.wmeId] !== undefined){
            console.log("Retrieving wme using wmeId:",wme.wmeId);
            wme = this.allWMEs[wme.wmeId];
        }else{
            console.log("Unknown:",wme);
            throw new Error("Unknown wme to retract");
        }
    }
    //console.log("Retracting:",wme);
    ReteActivationsAndDeletion.removeAlphaMemoryItemsForWME(wme);
    var invalidatedActions = ReteActivationsAndDeletion.deleteAllTokensForWME(wme);
    ReteUtil.cleanupInvalidatedActions(invalidatedActions);
    ReteActivationsAndDeletion.deleteAllNegJoinResultsForWME(wme);
    return wme;
};


//Modify immediately
ReteNet.prototype.modifyWME = function(wme,modifyFunction){
    var retractedWME = this.retractWME(wme),
        data = retractedWME.data,
        modifiedData = modifyFunction(data);
    if(modifiedData === undefined || modifiedData === null) {
        throw new Error("Modify function must return the new data");
    }
    return this.assertWME(modifiedData);
    
};

//schedule action (be it assert,retract,modify,other)
ReteNet.prototype.scheduleAction = function(action){
    if(action.actionType === undefined || action.payload === undefined || action.timePoint === undefined){
        throw new Error("Scheduling action failure");
    }
    if(this.schedule[action.actionType] === undefined){
        this.schedule[action.actionType] = [];
    }
    if(this.schedule[action.actionType][action.timePoint] === undefined){
        this.schedule[action.actionType][action.timePoint] = [];
    }
    this.schedule[action.actionType][action.timePoint].push(action);
};

//Step Time forward
ReteNet.prototype.stepTime = function(){
    //get all actions schedule at the current timepoint
    var actions = _.values(this.schedule),
        actionsForTimePoint = _.flatten(actions.map(d=>d[this.currentTime]).reject(d=>d===undefined));
    //perform those actions
    actionsForTimePoint.forEach(function(d){
        var performanceFunction = this.actionFunctions(d.actionType).performFunc;
        performanceFunction(this,d.payload);
    },this);
    
    this.currentTime++;
};

//Add a rule
ReteNet.prototype.addRule = function(ruleId,components){
    if(ruleId instanceof Array){
        return ruleId.map(d=>this.addRule(d,components)c];
    }
    //-----------
        //Add a single rule:
    if(!Number.isInteger(ruleId) || components[ruleId] === undefined){
        throw new Error("Unrecognised rule id specified");
    }
    var rule = components[ruleId],
        conditions = _.keys(rule.conditions).map(d=>components[d]),
        //build network with a dummy node for the parent
        finalBetaMemory = ReteNetworkBuilding.buildOrShareNetworkForConditions(this.dummyBetaMemory,conditions,this.rootAlpha,components,this),
        //Build the actions that are triggered by the rule:
        actionDescriptions = _.keys(rule.actions).map(d=>components[d]),
        //Bind actions with descriptions and store in the rule Action:
        boundActionDescriptions = actionDescriptions.map(function(d){
            if(this.actionFunctions[d.tags.actionType] === undefined){
                throw new Error("Unrecognised action type");
            }
            return _.bind(this.actionFunctions[d.tags.actionType].proposeFunc,d);
        }),
        //Create the action
        ruleAction = new RDS.ActionNode(finalBetaMemory,actionDescriptions,boundActions,rule.name,this),

    //Add the bound actions into the action node:
    ruleAction.boundActions = boundActionDescriptions;
    this.actions[rule.id] = ruleAction;
    return ruleAction;
};


//Remove rule
ReteNet.prototype.removeRule = function(rule){
    if(actionNode instanceof Array){
        actionNode.forEach(d=>this.removeRule(d));
        return;
    }
    //delete from bottom up
    var invalidatedActions = ReteActivationsAndDeletion.deleteNodeAndAnyUnusedAncestors(actionNode);
    ReteUtil.cleanupInvalidatedActions(invalidatedActions);
};

//register a join action proposal and performance function
//as a single object of form : {name: "", propose:func, perform:func};
ReteNet.prototype.registerAction = function(actionObj){
    if(actionObj.name === undefined || actionObj.performFunc === undefined || actionObj.proposeFun === undefined){
        throw new Error("Action Registration Failure");
    }
    if(this.actionFunctions[actionObj.name] !== undefined){
        throw new Error("Registration Attempt for existing Action");
    }
    this.actionFunctions[actionObj.name] = actionObj;
};


//Utility method:
ReteNet.prototype.storeNode = function(node){
    this.allReteNodes[node.id] = node;
    var storeTarget = "unknown";
    if(node.isConstantTestNode){
        storeTarget = "constantTests";
    }else if(node.isAlphaMemory){
        storeTarget = "alphaMemories";
    }else if(node.isBetaMemory){
        storeTarget = "betaMemories";
    }else if(node.isJoinNode){
        storeTarget = "joinNodes";
    }else if(node.isActionNode){
        storeTarget = "actionNodes";
    }else if(node.isNegativeNode){
        storeTarget = "negativeNodes";
    }else if(node.isAnNCCNode){
        storeTarget = "nccNodes";
    }else if(node.isAnNCCPartnerNode){
        storeTarget = "nccPartnerNodes";
    }

    if(this.allReteNodesByType[storeTarget] !== undefined){
        this.allReteNodesByType[storeTarget][node.id] = node;
    }else{
        console.log(node);
        throw new Error("unrecognised type attempted to be stored");
    }
};

//convert a rule to a component list
//used to convert the jsRete Rule object to the standard form for loading
ReteNet.prototype.convertRulesToComponents = function(rules){
    if(!(rules instanceof Array)){
        rules = [rules];
    }
    var actions = _.flatten(rules.map(d=>_.values(d.actions))),
        conditions = _.flatten(rules.map(d=>_.values(d.conditions))),
        all = actions.concat(conditions).concat(rules),
        components = all.reduce(function(m,v){
            m[v.id] = v;
            return m;
        },{});
    return components;
};

module.exports = ReteNet;
