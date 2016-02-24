/**
   @file ReteClassInterface
   @purpose Defines a class based ReteNet interface
 */
"use strict";
var _ = require('underscore'),
    RDS = require('./ReteDataStructures'),
    ReteNetworkBuilding = require('./ReteNetworkBuilding'),
    ReteActivationsAndDeletion = require('./ReteActivationAndDeletion'),
    ReteUtil = require('./ReteUtilities'),
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
ReteNet.prototype.assertWME = function(wme){
    console.log("ASSERTING:",data);
    if(data.isWME === undefined || data.id === undefined){
        data = new RDS.WME(data,this.currentTime);
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
    //Record when the wme was retracted
    wme.lifeTime[1] = this.currentTime;
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

//Schedule an action by it's ID, ALSO scheduling any parallel actions
ReteNet.prototype.scheduleAction = function(actionId){
    if(this.proposedActions[actionId] === undefined){
        throw new Error("Invalid action specified");
    }
    var action = this.proposedActions[actionId],
        parallelActions = action.parallelActions.map(d=>this.proposedActions[d]);

    this.addToSchedule(action);
    parallelActions.forEach(d=>this.addToSchedule(d));
    
};

//Utility method to add an action object
ReteNet.prototype.addToSchedule = function(action){
    if(action.actionType === undefined || action.payload === undefined || action.timing === undefined){
        throw new Error("Scheduling action failure");
    }
    if(this.schedule[action.actionType] === undefined){
        this.schedule[action.actionType] = [];
    }
    var performTime = this.currentTime + action.timing.performOffset;
    if(this.schedule[action.actionType][performTime] === undefined){
        this.schedule[action.actionType][performTime] = [];
    }
    this.schedule[action.actionType][performTime].push(action);
    //Action is no longer proposed, so remove it from the token
    action.token.proposedActions = _.reject(action.token.proposedActions,d=>d.id===action.id);
};

//Step Time forward
ReteNet.prototype.stepTime = function(){
    //get all actions scheduled at the current timepoint
    var actions = _.values(this.schedule),
        actionsForTimePoint = _.flatten(actions.map(d=>d[this.currentTime]).reject(d=>d===undefined));
    //perform those actions
    actionsForTimePoint.forEach(function(d){
        var performanceFunction = this.actionFunctions(d.actionType).performFunc;
        performanceFunction(this,d.payload);
        this.enactedActions.push(d);
    },this);

    //todo: remove performed actions from proposed action list
    
    //cleanup invalidated actions
    this.proposedActions = _.reject(this.proposedActions,d=>d.timing.invalidateTime === this.currentTime);
    
    this.currentTime++;
};

//Add a rule
ReteNet.prototype.addRule = function(ruleId,components){
    if(ruleId instanceof Array){
        return ruleId.map(d=>this.addRule(d,components));
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
        //Get the action descriptions that are triggered by the rule:
        actionDescriptions = _.keys(rule.actions).map(d=>components[d]),
        //Bind proposalFuncs with actionDescriptions
        boundActionDescriptions = actionDescriptions.map(function(d){
            if(this.actionFunctions[d.tags.actionType] === undefined){
                throw new Error("Unrecognised action type");
            }
            return _.bind(this.actionFunctions[d.tags.actionType].proposeFunc,d);
        }),
        //Create the action, with the bound action functions
        ruleAction = new RDS.ActionNode(finalBetaMemory,actionDescriptions,boundActions,rule.name,this);

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
