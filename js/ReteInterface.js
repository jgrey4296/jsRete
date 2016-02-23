/**
   @file ReteInterface
   @purpose Provides functions for operating on a retenet object
*/
var RDS = require('./ReteDataStructures'),
    ReteActivationsAndDeletion = require('./ReteActivationAndDeletion'),
    ReteNetworkBuilding = require('./ReteNetworkBuilding'),
    RCO = require('./ReteComparisonOperators'),
    ReteUtil = require('./ReteUtilities'),
    _ = require('underscore'),
    RuleCtors = require('./RuleCtors'),
    PossibleActions = require('./ReteActions');

"use strict";


var clearHistory = function(reteNet){
    reteNet.enactedActions = [];
};

var clearPotentialActions = function(reteNet){
    reteNet.potentialActions = [];
};

/**
   @function assertWME_Immediately
   @purpose Takes a wme and actually activates the retenet with it
   @param data : Either a WME({}) or converts {} to a WME
   @param reteNet : the main ReteNet object
   @param retractionTime : Absolute time to retract the wme, will default to 0 (never retract)
*/
var assertWME_Immediately = function(data,reteNet,retractionTime){
    console.log("ASSERTING:",data);
    if(retractionTime === undefined) { retractionTime = 0; }
    if(data.isWME === undefined || data.id === undefined){
        data = new RDS.WME(data,reteNet.currentTime,retractionTime);
        addToRetractionList(reteNet,data,data.lifeTime[1]);
        reteNet.allWMEs[data.id] = data;
    }
    //Actually push the wme into the net
    ReteActivationsAndDeletion.alphaNodeActivation(reteNet.rootAlpha,data);
    return data.id;
};

/**
   @function retractWME_Immediately
   @purpose Remove the wme from the net
   @param wme : The wme object to remove, or gets the wme if its an ID
   @param reteNet : the retenet to remove from
*/
var retractWME_Immediately = function(wme,reteNet){
    //console.log("retracting immediately:",wme);
    //if not given the wme directly
    if(wme.isWME === undefined){
        //if given a wme id
        if(Number.isInteger(wme) && reteNet.allWMEs[wme] !== undefined){
            //throw new Error("Not Retracting a wme, or a valid id");
            wme = reteNet.allWMEs[wme];
            //if given a graph node with a related wme
        }else if(wme.wmeId !== undefined && reteNet.allWMEs[wme.wmeId] !== undefined){
            console.log("Retrieving wme using wmeId:",wme.wmeId);
            wme = reteNet.allWMEs[wme.wmeId];
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

/**
   @function modifyWME_Immeditately
   @purpose retracts a wme, applies a function to it, asserts the new wme
   @param wme : A WME id, or an actual wme
   @param reteNet : the retenet to modify
   @param modifyFunction of form : {} function({}){ return {}; }
   @return the replacement wmeid
 */
var modifyWME_Immediately = function(wme,reteNet,modifyFunction){
    var retractedWME = retractWME_Immediately(wme,reteNet),
        data = retractedWME.data,
        modifiedData = modifyFunction(data);
    if(modifiedData === undefined || modifiedData === null) {
        throw new Error("Modify function must return the new data");
    }
    return assertWME_Immediately(modifiedData,reteNet);
};


/**
   @function assertWME_Later
   @purpose creates a WME from the passed in data, schedules it for assertion/retraction
   @param wmeData : Either a WME, or {} to be used to construct a wme
   @param assertionTime : Absolute time to assert the wme, defaults to current time
   @param 
   
*/
//Assert a wme into the network
var assertWME_Later = function(wmeData,reteNet,assertionTime,retractionTime){
    //Create the wme:
    if(assertionTime === undefined) { assertionTime = reteNet.currentTime; }
    if(retractionTime === undefined) { retractionTime = 0; }
    if(wmeData.isWME === undefined || wmeData.id === undefined){
        wmeData = new RDS.WME(wmeData,assertionTime,retractionTime);
        reteNet.allWMEs[wmeData.id] = wmeData;
    }
    //Add it to the input WME Buffer:
    addToAssertionList(reteNet,wmeData);
    addToRetractionList(reteNet,wmeData);
    //Store it as part of allWMEs:
    return wmeData.id;
};

/**
   @function addToAssertionList
   @purpose schedules a time for assertion or retraction
   @param retenet
   @param wme
   @param time
*/
var addToAssertionList = function(reteNet,wme,time){
    if(wme.isWME === undefined){
        if(!Number.isInteger(wme) || reteNet.allWMEs[wme] === undefined){
            throw new Error("Trying to register an invalid wme");
        }
        wme = reteNet.allWMEs[wme];
    }
    if(time === undefined) {
        time = wme.lifeTime[0];
    }else{
        wme.lifeTime[0] = time;
    }
    if(reteNet.wmeLifeTimes.assertions[time] === undefined){
        reteNet.wmeLifeTimes.assertions[time] = [];
    }
    reteNet.wmeLifeTimes.assertions[time].push(wme);
};

/**
   @function addToRetractionList
   @purpose schedules when to retract a wme
*/
var addToRetractionList = function(reteNet,wme,time){
    if(wme.isWME === undefined){
        if(!Number.isInteger(wme) || reteNet.allWMEs[wme] === undefined){
            throw new Error("Trying to register an invalid wme");
        }
        wme = reteNet.allWMEs[wme];
    }
    if(time === undefined){
        time = wme.lifeTime[1];
    }else{
        wme.lifeTime[1] = time;
    }
    if(reteNet.wmeLifeTimes.retractions[time] === undefined){
        reteNet.wmeLifeTimes.retractions[time] = [];
    }
    reteNet.wmeLifeTimes.retractions[time].push(wme);
};

/**
   @function incrementTime
   @purpose RETRACTS then ASSERTS then INCREMENTS
   @TODO figure out if this is in the correct order. should it be the otherway around
*/
var incrementTime = function(reteNet){
    console.log("Performing schedule for step:",reteNet.currentTime);
    //retract everything scheduled
    if(reteNet.currentTime < reteNet.wmeLifeTimes.retractions.length
       && reteNet.wmeLifeTimes.retractions[reteNet.currentTime] !== undefined){
        reteNet.wmeLifeTimes.retractions[reteNet.currentTime].forEach(function(wme){ retractWME_Immediately(wme,reteNet); });
    }

    //assert everything schdeuled
    if( reteNet.currentTime < reteNet.wmeLifeTimes.assertions.length  && reteNet.wmeLifeTimes.assertions[reteNet.currentTime] !== undefined){
        reteNet.wmeLifeTimes.assertions[reteNet.currentTime].forEach(function(wme){  assertWME_Immediately(reteNet.rootAlpha,wme,wme.lifeTime[1]); });
    }

    
    //At this point: newly activated action instructions are in
    //reteNet.potentialActions,
    //and non-decidable actions are scheduled
    //nothing is asserted immediately to stop infinite inference loops
    
    //increment the time
    reteNet.currentTime++;
};

/**
 @function addRule
 @purpose to build a network for a given rule
 @param ruleID the access point in components to start from
 @param component stores all relevant objects
 @note see TotalShell::compileRete
 @returns actionnode for the rule
*/
var addRule = function(ruleId,reteNet,components){
    //Add a list of rules
    if(ruleId instanceof Array){
        return ruleId.map(d=>addRule(d,reteNet,components));
    }
    //-----------------
    //Add a single rule:
    if(!Number.isInteger(ruleId) || components[ruleId] === undefined){
        throw new Error("Unrecognised rule id specified");
    }
    var rule = components[ruleId],
        conditions = _.keys(rule.conditions).map(d=>components[d]),
        //build network with a dummy node for the parent
        finalBetaMemory = ReteNetworkBuilding.buildOrShareNetworkForConditions(reteNet.dummyBetaMemory,conditions,reteNet.rootAlpha,components,reteNet),
        //Build the actions that are triggered by the rule:
        actionDescriptions = _.keys(rule.actions).map(d=>components[d]),
        ruleAction = new RDS.ActionNode(finalBetaMemory,actionDescriptions,rule.name,reteNet),
        //Bind actions with descriptions and store in the rule Action:
        boundActionDescriptions = actionDescriptions.map(function(d){
            if(PossibleActions[d.tags.actionType] === undefined){
                throw new Error("Unrecognised action type");
            }
            return _.bind(PossibleActions[d.tags.actionType],d);
        });

    //Add the bound actions into the action node:
    ruleAction.boundActions = boundActionDescriptions;
    reteNet.actions[rule.id] = ruleAction;
    return ruleAction;
};

/**
   @function removeRule
   @purpose removes a rule from the bottom up of the network
 @note cleans up invalidated potential actions
*/
var removeRule = function(actionNode,reteNet){
    if(actionNode instanceof Array){
        actionNode.forEach(d=>removeRule(d));
        return;
    }
    //delete from bottom up
    var invalidatedActions = ReteActivationsAndDeletion.deleteNodeAndAnyUnusedAncestors(actionNode);
    ReteUtil.cleanupInvalidatedActions(invalidatedActions);
};


/**
 @convertRulesToComponents
 @purpose convert rules to map of components
 */
var convertRulesToComponents = function(rules){
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


var moduleInterface = {
    "CompOperators" : RCO,
    "ConstantTest" : RDS.ConstantTest,
    "ReteNet" : RDS.ReteNet,
    "addRule" : addRule,
    "assertWME_Immediately" : assertWME_Immediately,
    "assertWME_Later" : assertWME_Later,
    "clearHistory" : clearHistory,
    "clearPotentialActions" : clearPotentialActions,
    "convertRulesToComponents" : convertRulesToComponents,
    "incrementTime" : incrementTime,
    "removeRule" : removeRule,
    "retractWME_Immediately" : retractWME_Immediately,
    "Rule" : RuleCtors.Rule,
    "Condition" : RuleCtors.Condition,
    "Action" : RuleCtors.Action,
    "RDS" : RDS
};
module.exports = moduleInterface;    

