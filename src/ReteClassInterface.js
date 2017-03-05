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

import _ from "lodash";
import * as RDS from "./ReteDataStructures";
import { buildOrShareNetworkForConditions } from "./ReteNetworkBuilding";
import * as ReteActivationsAndDeletion from "./ReteActivationAndDeletion";
import * as ReteUtil from "./ReteUtilities";
import { Rule } from "./RuleCtors";
import { ReteActions } from "./ReteActions";
import { ComparisonOperators } from "./ReteComparisonOperators";
import { ArithmeticOperators } from "./ReteArithmeticActions";


/**
   The General controller for a retenet
   @constructor
   @param actionsToRegister
*/
class ReteNet {
    constructor(actionsToRegister){
        if (actionsToRegister === undefined){
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
        this.Rule = Rule;
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
           could otherwise be known as the conflict set.
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
        this.allReteNodesByType = {};

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
            "registerAction" : []
        };

        //Register actions passed in:
        actionsToRegister.forEach(function(d){
            this.registerAction(d);
        },this);
        
        
    };
}
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
    if (this.listeners[name] !== undefined){
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
    if (this.listeners[name] === undefined){
        throw new Error(`Unrecognised listener fired: ${name}`);
    }
    //call the registered functions
    this.listeners[name].forEach(d=>d(...vals));
};


/**
   Stores a wme in the retenet, without asserting it.
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
    if (!(wme instanceof RDS.WME)){
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
    if (!(wme instanceof RDS.WME)){
        //if given a wme id
        if (Number.isInteger(wme) && this.allWMEs[wme] !== undefined){
            wme = this.allWMEs[wme];
            //if given a graph node with a related wme
        } else if (wme.wmeId !== undefined && this.allWMEs[wme.wmeId] !== undefined){
            wme = this.allWMEs[wme.wmeId];
        } else {
            console.log("Unknown:",wme);
            throw new Error("Unknown wme to retract");
        }
    }
    //console.log("Retracting:",wme);
    ReteActivationsAndDeletion.removeAlphaMemoryItemsForWME(wme);
    let invalidatedActions = ReteActivationsAndDeletion.deleteAllTokensForWME(wme);
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
    let retractedWME = this.retractWME(wme),
        data = retractedWME.data,
        modifiedData = modifyFunction(data);
    if (modifiedData === undefined || modifiedData === null) {
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
    
    if (action instanceof Array){
        action.forEach(d=>this.proposeAction(d));
        return;
    }
    if (this.proposedActions[action.id] !== undefined){
        throw new Error("Proposing a duplicate action");
    }
    //console.log("Proposing:",action);
    this.proposedActions[action.id] = action;
};

ReteNet.prototype.unproposeAction = function(actionId){
    if (this.proposedActions[actionId] !== undefined){
        delete this.proposedActions[actionId];
    }
};

/**
   Schedule an action by it's ID, ALSO scheduling any parallel actions
   @param  {module:ReteDataStructures.ProposedAction|Int} actionId The action to propose
   @method
*/
ReteNet.prototype.scheduleAction = function(actionId){
    this.fireListener("schedule",actionId);
    if (actionId instanceof this.ProposedAction){
        this.scheduleAction(actionId.id);
        return;
    }
    if (this.proposedActions[actionId] === undefined){
        throw new Error("Invalid action specified: " + actionId);
    }
    let action = this.proposedActions[actionId],
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
    if (action.actionType === undefined || action.payload === undefined || action.timing === undefined){
        throw new Error("Scheduling action failure");
    }
    if (this.schedule[action.actionType] === undefined){
        this.schedule[action.actionType] = [];
    }
    let performTime = this.currentTime + action.timing.performOffset;
    if (this.schedule[action.actionType][performTime] === undefined){
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
    let actions = _.values(this.schedule),
        actionsForTimePoint = _.reject(_.flatten(actions.map(d=>d[this.currentTime])),d=>d===undefined);
    //todo : group by tags:
    
    //Sort by priority
    actionsForTimePoint.sort((a,b)=>b.priority - a.priority);
    
    this.fireListener('stepTimeActions',actionsForTimePoint);
    //perform those actions, storing objects describing the changes
    let changes = actionsForTimePoint.map(function(d){
        let performanceFunction = this.actionFunctions[d.actionType].perform,
            effects = performanceFunction(d,this);
        this.enactedActions.push(d);
        return effects;
    },this);

    //cleanup invalidated actions
    _.values(this.proposedActions).forEach(function(d){
        if (d.timing.invalidateTime === this.currentTime){
            delete this.proposedActions[d.id];
        }
    },this);
    
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
    if (ruleId instanceof Array){
        return ruleId.map(d=>this.addRule(d,components));
    }
    if (ruleId instanceof this.Rule){
        let convertedComponents = this.convertRulesToComponents(ruleId);
        return this.addRule(ruleId.id,convertedComponents);
    }
    if (!Number.isInteger(ruleId) || components[ruleId] === undefined){
        throw new Error("Unrecognised rule id specified");
    }
    //-----------
    //Add a single rule:
    let rule = components[ruleId],
        ruleLinks = _.toPairs(rule.linkedNodes),
        //TODO: support rules as conditions by flattening the conditions repeatedly
        conditions = ruleLinks.filter(d=>/^condition/.test(d[1])).map(d=>components[d[0]]),
        //build network with a dummy node for the parent
        finalMemoryNode = buildOrShareNetworkForConditions(this.dummyBetaMemory,conditions,this.rootAlpha,components,this),
        //Get the action descriptions that are triggered by the rule:
        //TODO: support rules as actions by repeatedly flattening
        actionDescriptions = ruleLinks.filter(d=>/^action/.test(d[1])).map(d=>components[d[0]]),
        //Bind proposalFuncs with actionDescriptions
        boundActionDescriptions = actionDescriptions.map(function(d){
            if (this.actionFunctions[d.tags.actionType] === undefined){
                throw new Error("Unrecognised action type");
            }
            return _.bind(this.actionFunctions[d.tags.actionType].propose,d);
        },this),
        //Create the action, with the bound action functions
        ruleAction = new RDS.ActionNode(finalMemoryNode,actionDescriptions,boundActionDescriptions,rule.name,this);
    
    //Add the bound actions into the action node:
    ruleAction.ruleId = rule.id;
    ruleAction.boundActions = boundActionDescriptions;
    this.actions[ruleAction.ruleId] = ruleAction;
    this.allRules[ruleAction.ruleId] = rule;
    return [this,ruleAction];
};


/**
   Remove rule(s) from the retenet, bottom up, by {@link:module.ReteDataStructures.ActionNode}
   @param {module:ReteDataStructures.ActionNode | Array} rule The rule(s) to remove from the net
   @method
*/
ReteNet.prototype.removeRule = function(rule){
    
    this.fireListener("removeRule",rule);
    if (rule instanceof Array){
        rule.forEach(d=>this.removeRule(d));
        return;
    }
    //delete from bottom up
    let action = rule instanceof RDS.ActionNode ? rule : this.actions[rule.id],
        invalidatedActions = ReteActivationsAndDeletion.deleteNodeAndAnyUnusedAncestors(action);
    ReteUtil.cleanupInvalidatedActions(invalidatedActions);

    //delete from the allrules record
    if (this.allRules[action.ruleId] !== undefined){
        delete this.allRules[action.ruleId];
    }

    //Remove all nodes scheduled for cleanup
    _.keys(this.allReteNodes).forEach(function(d){
        if (this.allReteNodes[d].cleanup === true){
            let currNode = this.allReteNodes[d];
            delete this.allReteNodesByType[currNode.type][currNode.id];
            delete this.allReteNodes[d];
        }
    },this);
    
    if (this.actions[rule.id] !== undefined){
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
    this.fireListener('registerAction',actionObj);
    if (actionObj.name === undefined || actionObj.perform === undefined || actionObj.propose === undefined){
        throw new Error("Action Registration Failure");
    }
    if (this.actionFunctions[actionObj.name] !== undefined){
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

    if (this.allReteNodesByType[node.type] === undefined){
        this.allReteNodesByType[node.type] = {};
    }
    this.allReteNodesByType[node.type][node.id] = node;
};

/**
   Converts rules to an object of their components for easy addition
   @param {module:RuleCtors.Rule | Array} rules
   @method
   @return {Object}
*/
ReteNet.prototype.convertRulesToComponents = function(rules){
    
    if (!(rules instanceof Array)){
        rules = [rules];
    }
    let actions = _.flatten(rules.map(d=>_.values(d.actions))),
        conditions = _.flatten(rules.map(d=>_.values(d.conditions))),
        all = actions.concat(conditions).concat(rules),
        components = all.reduce((m,v) => {
            m[v.id] = v;
            return m;
        },{});
    //convert to linkednode style for every component:
    _.values(components).forEach((d) => {
        d.linkedNodes = {};
        //add actions
        d.linkedNodes = _.keys(d.actions).reduce((m,v) => {
            m[v] = "action";
            return m;
        },d.linkedNodes);
        //add conditions
        d.linkedNodes = _.keys(d.conditions).reduce((m,v) => {
            m[v] = 'condition';
            return m;
        },d.linkedNodes);
    });
    
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
};


export { ReteNet };
