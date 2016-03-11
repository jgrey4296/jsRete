/**
   Defines a class based ReteNet interface
   @module ReteClassInterface
   @requires ReteDataStructures
   @requires ReteNetworkBuilding
   @requires ReteActivationAndDeletion
   @requires ReteUtilities
   @requires RuleCtors
   @requires ReteActions
   @requires ReteComparisonOperators
   @requires ReteArithmeticActions
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
   The General controller for a retenet
   @constructor
   @param actionsToRegister
*/
var ReteNet = function(actionsToRegister){
    if(actionsToRegister === undefined){
        actionsToRegister = [];
    }
    /** 
        The starting BetaMemory of the retenet
        @member {module:ReteDataStructures.BetaMemory} dummyBetaMemory
        @private
    */
    this.dummyBetaMemory = new RDS.BetaMemory();
    /**
       The starting alpha node of the retenet
       @member {module:ReteDataStructures.AlphaNode} rootAlpha
       @private
     */
    this.rootAlpha = new RDS.AlphaNode();

    /**
       The available actions the retenet can perform
       {name: string ,perform : function, propose : function };
       @member {Object} 
       @see {@link module:ReteActions}
    */
    this.actionFunctions = _.clone(ReteActions);

    /** @alias {module:RuleCtors.Rule} */
    this.Rule = RuleCtors.Rule;
    /** @see {module:ReteComparisonOperators} */
    this.ComparisonOperators = ComparisonOperators;
    /** @see {module:ReteArithmeticActions} */
    this.ArithmeticOperators = ArithmeticOperators;
    /** @see {module:ReteDataStructures.ProposedAction} */
    this.ProposedAction = RDS.ProposedAction;
    /** @see {module:ReteDataStructures.WME} */
    this.WME = RDS.WME;
    /** @see {module:ReteDataStructures.Token} */
    this.Token = RDS.Token;
    /** @see {module:ReteUtilities} */
    this.utils = ReteUtil;
    /**
       All rules loaded into the ReteNet
       @member {Object}
       @see {@link module:RuleCtors.Rule}
     */
    this.allRules = {};
    /**
       Constructed ActionNodes of the ReteNet
       @member {Object}
       @see {@link module:ReteDataStructures.ActionNode}
     */
    this.actions = {};
    /**
       All WMEs that exist in the ReteNet
       @member {Object}
       @see {@link module:ReteDataStructures.WME}
     */
    this.allWMEs = {};

    /**
       All Proposed Actions, from ActionNodes that have fired, indexed by id
       @member {Object}
       @see {@link module:ReteDataStructure.ProposedActions}
     */
    this.proposedActions = {};
    /**
       All Actions that were schedule and then performed
       @member {Array} 
       @see {@link module:ReteDataStructures.ProposedActions}
     */
    this.enactedActions = [];

    /**
       All nodes of the ReteNet, enabling inspection
       @member {Object}        
     */
    this.allReteNodes = {};
    /**
       All ReteNodes, indexed by type
       todo: make this a weak map?
       @member {Object} 
     */
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

    /**
       The current time step of the retenet
       @member {Int}
     */
    this.currentTime = 1;
    /**
       The Actions that have been scheduled
       @member {Object}
     */
    this.schedule = {
        assertions : [],
        retractions : [],
        modifications: []
    };

    /**
       Listeners that have been registered for various occurences
       @member {Object}
     */
    this.listeners = {
        "propose" : [],
        "assert" : [],
        "retract" : [],
        "addRule" : [],
        "removeRule" : [],
        "schedule" : [],
        "stepTimeActions" : [],
    };

    //Register actions passed in:
    actionsToRegister.forEach(function(d){
        this.registerAction(d);
    },this);
    
    
};
//--------------------
//METHODS:
//--------------------

//Utility to register listeners:
/**
   Register a function for a retenet occurent
   @param {string} name The occurrence type to listen for
   @param {function} fn The function to trigger when the occurrence happens
   @method
 */
ReteNet.prototype.registerListener = function(name,fn){
    if(this.listeners[name] !== undefined){
        this.listeners[name].push(fn);
    }
};

/**
   Trigger all registered listeners for an occurence
   @param {string} name The name of the occurrence that happened
   @param ...vals The parameters to pass to the listener functions
   @method
 */
ReteNet.prototype.fireListener = function(name,...vals){
    if(this.listeners[name] === undefined){
        throw new Error(`Unrecognised listener fired: ${name}`);
    }
    //call the registered functions
    this.listeners[name].forEach(d=>d(...vals));
};


/**
   Stores a wme in the retenet
   @param {WME} wme
   @private
 */
ReteNet.prototype.storeWME = function(wme){
    this.allWMEs[wme.id] = wme;
};

/**
   Clears the history of actions that have been performed
   @method
 */
ReteNet.prototype.clearHistory = function(){
    this.enactedActions = [];
};

/**
   Clear the proposed actions list
   @method
 */
ReteNet.prototype.clearProposedActions = function(){
    this.proposedActions = {};
};

/**
   Assert a wme immediately
   @param {WME/Object} wme The wme or data to assert
   @return {Int} WME.id
   @method
 */
ReteNet.prototype.assertWME = function(wme){
    this.fireListener("assert",wme);
    //console.log("ASSERTING:",wme);
    if(!(wme instanceof RDS.WME)){
        wme = new RDS.WME(wme,this.currentTime);
        this.storeWME(wme);
    }
    //Actually push the wme into the net
    ReteActivationsAndDeletion.alphaNodeActivation(this.rootAlpha,wme);
    return wme.id;
};

/**
   Retract a wme immediately
   @param {wme/id} wme The wme object or id to retract
   @method
 */
ReteNet.prototype.retractWME = function(wme){
    this.fireListener("retract",wme);
    //console.log("retracting immediately:",wme);
    //if not given the wme directly
    if(!(wme instanceof RDS.WME)){
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

    delete this.allWMEs[wme.id];
    return wme;
};

/**
   Retract, change, and then assert some data
   @param {WME/id} wme The wme to retract
   @param {function} modifyFunction The function that changes the data of the wme
   @method
 */
ReteNet.prototype.modifyWME = function(wme,modifyFunction){
    var retractedWME = this.retractWME(wme),
        data = retractedWME.data,
        modifiedData = modifyFunction(data);
    if(modifiedData === undefined || modifiedData === null) {
        throw new Error("Modify function must return the new data");
    }
    return this.assertWME(modifiedData);
    
};

/**
   Propose an action, typically from an action node
   @param {module:ReteDataStructures.ProposedAction} action
   @method
 */
ReteNet.prototype.proposeAction = function(action){
    //Call the listeners:
    this.fireListener("propose",action);
    
    if(action instanceof Array){
        action.forEach(d=>this.proposeAction(d));
        return;
    }
    if(this.proposedActions[action.id] !== undefined){
        throw new Error("Proposing a duplicate action");
    }
    //console.log("Proposing:",action);
    this.proposedActions[action.id] = action;
};

/**
   Schedule an action by it's ID, ALSO scheduling any parallel actions   
   @param  {module:ReteDataStructures.ProposedAction|Int} actionId The action to propose
   @method
 */
ReteNet.prototype.scheduleAction = function(actionId){
    this.fireListener("schedule",actionId);
    if(actionId instanceof this.ProposedAction){
        this.scheduleAction(actionId.id);
        return;
    }
    if(this.proposedActions[actionId] === undefined){
        throw new Error("Invalid action specified: " + actionId);
    }
    var action = this.proposedActions[actionId],
        parallelActions = action.parallelActions.map(d=>this.proposedActions[d]);

    this.addToSchedule(action);
    parallelActions.forEach(d=>this.addToSchedule(d));
    return this;
};

/**
   Internal method to add to the schedule
   @param {module:ReteDataStructures.ProposedAction} action
   @method
   @private
 */
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
    //also remove it from retenet's proposed actions:
    delete this.proposedActions[action.id];
};

/**
   Step Time forward. actions should be scheduled BEFORE CALLING STEP TIME.
   @method
   @returns {Array} An array of the effects of this timestep
*/
ReteNet.prototype.stepTime = function(){
    //get all actions scheduled at the current timepoint
    var actions = _.values(this.schedule),
        actionsForTimePoint = _.reject(_.flatten(actions.map(d=>d[this.currentTime])),d=>d===undefined);
    //todo : group by tags:
    
    //Sort by priority
    actionsForTimePoint.sort((a,b)=>b.priority - a.priority);
    
    this.fireListener('stepTimeActions',actionsForTimePoint);
    //perform those actions, storing objects describing the changes
    var changes = actionsForTimePoint.map(function(d){
        var performanceFunction = this.actionFunctions[d.actionType].perform;
        var effects = performanceFunction(d,this);
        this.enactedActions.push(d);
        return effects;
    },this);

    //cleanup invalidated actions
    _.values(this.proposedActions).forEach(function(d){
        if(d.timing.invalidateTime === this.currentTime){
            delete this.proposedActions[d.id];
        }
    });
    
    this.currentTime++;

    return changes;
};

/**
   Add a rule to the retenet, auto converting to correct format if necessary, returning [ReteNet,{@link{module:ReteDataStructures.ActionNode}]
   @param {Array | int | module:RuleCtors.Rule} ruleId The rule/rules to add
   @param {Object} components An object to lookup components of rules in
   @method
   @returns {Array}
   
*/
ReteNet.prototype.addRule = function(ruleId,components){
    this.fireListener("addRule",components);
    if(ruleId instanceof Array){
        return ruleId.map(d=>this.addRule(d,components));
    }
    if(ruleId instanceof this.Rule){
        var convertedComponents = this.convertRulesToComponents(ruleId);
        return this.addRule(ruleId.id,convertedComponents);
    }
    if(!Number.isInteger(ruleId) || components[ruleId] === undefined){
        throw new Error("Unrecognised rule id specified");
    }
    //-----------
    //Add a single rule:
    var rule = components[ruleId],
        //TODO: support rules as conditions by flattening the conditions repeatedly
        conditions = _.keys(rule.conditions).map(d=>components[d]),
        //build network with a dummy node for the parent
        finalBetaMemory = ReteNetworkBuilding.buildOrShareNetworkForConditions(this.dummyBetaMemory,conditions,this.rootAlpha,components,this),
        //Get the action descriptions that are triggered by the rule:
        //TODO: support rules as actions by repeatedly flattening
        actionDescriptions = _.keys(rule.actions).map(d=>components[d]),
        //Bind proposalFuncs with actionDescriptions
        boundActionDescriptions = actionDescriptions.map(function(d){
            if(this.actionFunctions[d.tags.actionType] === undefined){
                throw new Error("Unrecognised action type");
            }
            return _.bind(this.actionFunctions[d.tags.actionType].propose,d);
        },this),
        //Create the action, with the bound action functions
        ruleAction = new RDS.ActionNode(finalBetaMemory,actionDescriptions,boundActionDescriptions,rule.name,this);
    
    //Add the bound actions into the action node:
    ruleAction.boundActions = boundActionDescriptions;
    this.actions[rule.id] = ruleAction;
    this.allRules[rule.id] = rule;
    return [this,ruleAction];
};


/**
   Remove rule(s) from the retenet, bottom up, by {@link:module.ReteDataStructures.ActionNode}
   @param {module:ReteDataStructures.ActionNode | Array} rule The rule(s) to remove from the net
   @method
 */
ReteNet.prototype.removeRule = function(rule){
    this.fireListener("removeRule",rule);
    if(rule instanceof Array){
        rule.forEach(d=>this.removeRule(d));
        return;
    }
    //delete from bottom up
    var action = this.actions[rule.id],
        invalidatedActions = ReteActivationsAndDeletion.deleteNodeAndAnyUnusedAncestors(action);
    ReteUtil.cleanupInvalidatedActions(invalidatedActions);
    //delete from the allrules record
    if(this.allRules[rule.id] !== undefined){
        delete this.allRules[rule.id];
    }
    //todo: remove from all rete nodes by type
    if(this.actions[rule.id] !== undefined){
        delete this.actions[rule.id];
    }
};



/**
   register a join action proposal and performance function   
   @param {{name : string, propose : function, perform : function}} actionObj
   @method
   @see module:ReteActions
*/
ReteNet.prototype.registerAction = function(actionObj){
    console.log("Registering Rete Action:",actionObj);
    if(actionObj.name === undefined || actionObj.perform === undefined || actionObj.propose === undefined){
        throw new Error("Action Registration Failure");
    }
    if(this.actionFunctions[actionObj.name] !== undefined){
        throw new Error("Registration Attempt for existing Action");
    }
    this.actionFunctions[actionObj.name] = actionObj;
};


/**
   Store a node in the appropriate members of the ReteNet
   @param {module:ReteDataStructures.ReteNode} node
   @method
   @private
 */
ReteNet.prototype.storeNode = function(node){
    this.allReteNodes[node.id] = node;
    var storeTarget = "unknown";
    if(node instanceof RDS.AlphaNode){
        storeTarget = "constantTests";
    }else if(node instanceof RDS.AlphaMemory){
        storeTarget = "alphaMemories";
    }else if(node instanceof RDS.BetaMemory){
        storeTarget = "betaMemories";
    }else if(node instanceof RDS.JoinNode){
        storeTarget = "joinNodes";
    }else if(node instanceof RDS.ActionNode){
        storeTarget = "actionNodes";
    }else if(node instanceof RDS.NegativeNode){
        storeTarget = "negativeNodes";
    }else if(node instanceof RDS.NCCNode){
        storeTarget = "nccNodes";
    }else if(node instanceof RDS.NCCPartnerNode){
        storeTarget = "nccPartnerNodes";
    }

    if(this.allReteNodesByType[storeTarget] !== undefined){
        this.allReteNodesByType[storeTarget][node.id] = node;
    }else{
        console.log(node);
        throw new Error("unrecognised type attempted to be stored");
    }
};

/**
   Converts rules to an object of their components for easy addition 
   @param {module:RuleCtors.Rule | Array} rules
   @method
   @return {Object}
 */
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

/**
   Clean up
 */
ReteNet.prototype.cleanup = function(){
    //retract all wmes
    _.values(this.allWMEs).forEach(d=>this.retractWME(d));
    this.allWMEs = {};
    //remove all rules
    this.removeRule(_.values(this.allRules));
    this.allRules = {};
    this.proposedActions = {};
    this.enactedActions = {};
    this.allReteNodesByType = {};
    this.schedule = {};
};

module.exports = ReteNet;
