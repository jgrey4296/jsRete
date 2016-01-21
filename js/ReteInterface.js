/**
   @file ReteInterface
   @purpose Provides functions for operating on a retenet object
 */
var imports = ["ReteDataStructures","ReteDeletion","ReteActivations","ReteNetworkBuilding","ReteComparisonOperators","ReteUtilities"];

if(typeof define !== 'function'){
    var define = require('amdefine')(module);
    imports = imports.map(function(d){
        return "./"+d;
    });
    imports.push("underscore");
}else{
    imports = imports.map(function(d){
        return "Rete/"+d;
    });
    imports.push("underscore");
}

//** @requires ReteDataStructures
define(imports,function(RDS,ReteDeletion,ReteActivations,ReteNetworkBuilding,RCO,ReteUtil,_){
    "use strict";

    
    var clearHistory = function(reteNet){
        reteNet.enactedActions = [];
    };

    var clearPotentialActions = function(reteNet){
        reteNet.potentialActions = [];
    };
    
    //Assert a wme RIGHT NOW
    var assertWME_Immediately = function(data,reteNet,retractionTime){
        console.log("ASSERTING:",data);
        if(retractionTime === undefined) retractionTime = 0;
        if(data.isWME === undefined || data.id === undefined){
            data = new RDS.WME(data,reteNet.currentTime,retractionTime);
            addToRetractionList(reteNet,data,data.lifeTime[1]);
            reteNet.allWMEs[data.id] = data;
        }
        //Actually push the wme into the net
        ReteActivations.alphaNodeActivation(reteNet.rootAlpha,data);
        return data.id;
    };

    //Retract a wme RIGHT NOW, clean up its tokens, and any potential actions
    var retractWME_Immediately = function(wme,reteNet){
        console.log("retracting immediately:",wme);
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
        console.log("Retracting:",wme);
        ReteDeletion.removeAlphaMemoryItemsForWME(wme);
        var invalidatedActions = ReteDeletion.deleteAllTokensForWME(wme);
        ReteUtil.cleanupInvalidatedActions(invalidatedActions);
        ReteDeletion.deleteAllNegJoinResultsForWME(wme);
    };

    var modifyWME_Immediately = function(wme,reteNet,modifyFunction){
        retractWME_Immediately(wme,reteNet);
        var data = wme.data;
        //apply the modify function to the data:
        modifyFunction(data);
        assertWME_Immediately(data,reteNet);
    };

    
    /**
       @function addWME
       @purpose Creates a wme from the passed in data, schedules it for assertion
       @note There is a difference between ADDING to the net and the initial ACTIVATION of the root
     */
    //Assert a wme into the network
    var assertWME_Later = function(wmeData,reteNet,assertionTime,retractionTime){
        //Create the wme:
        if(assertionTime === undefined) assertionTime = reteNet.currentTime;
        if(retractionTime === undefined) retractionTime = 0;
        if(wmeData.isWME === undefined || wmeData.id === undefined){
            wmeData = new RDS.WME(wmeData,assertionTime,retractionTime);
            reteNet.allWMEs[wme.id] = wme;
        }
        //Add it to the input WME Buffer:
        addToAssertionList(reteNet,wme);
        addToRetractionList(reteNet,wme);
        //Store it as part of allWMEs:
        return wme.id;
    };
    
    /**
       @function addToAssertionList
       @purpose to record when a wme needs to be asserted
       @note increment time will use this information
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
       @purpose to record when a wme needs to be retracted
       @note increment time will use this information
    */
    var addToRetractionList = function(reteNet,wme,time){
        if(wme.isWME === undefined){
            if(!Number.isInteger(wme) || reteNet.allWMEs[wme] === undefined){
                throw new Error("Trying to register an invalid wme");
            }
            wme = reteNet.allWMEs[wme];
        }
        if(reteNet.wmeLifeTimes.retractions[time] === undefined){
            reteNet.wmeLifeTimes.retractions[time] = [];
        }
        reteNet.wmeLifeTimes.retractions[time].push(wme);
    };
    
    /**
       @function incrementTime
       @purpose steps the retenet forwards by one step. retracts then asserts new wmes,
       @TODO figure out if this is in the correct order. should it be the otherway around
     */
    var incrementTime = function(reteNet){
        //retract everything scheduled
        console.log("Incrementing time for step:",reteNet.currentTime);
        if(reteNet.wmeLifeTimes.retractions.length > reteNet.currentTime && reteNet.wmeLifeTimes.retractions[reteNet.currentTime] !== undefined){
        reteNet.wmeLifeTimes.retractions[reteNet.currentTime].forEach(function(wme){ retractWME_Immediately(wme,reteNet); });
        }
        console.log("Retractions finished for timeStep:",reteNet.currentTime);
        //assert everything schdeuled
        if(reteNet.wmeLifeTimes.assertions.length > reteNet.currentTime && reteNet.wmeLifeTimes.assertions[reteNet.currentTime] !== undefined){
            reteNet.wmeLifeTimes.assertions[reteNet.currentTime].forEach(function(wme){  assertWME_Immediately(reteNet.rootAlpha,wme,wme.lifeTime[1]); });
        }
        console.log("Assertions finished for timeStep:",reteNet.currentTime);
        
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
       @note Assumes the rule's actions and conditions are objects, not id's,
       @note and allNodes store all relevant objects
       @note see TotalShell::compileRete
     */
    var addRule = function(ruleId,reteNet,allNodes){
        if(!Number.isInteger(ruleId) || allNodes[ruleId] === undefined){
            throw new Error("Unrecognised rule id specified");
        }
        var rule = allNodes[ruleId],        
            conditions = _.keys(rule.conditions).map(function(d){
                return this[d];
            },allNodes),                
            //build network with a dummy node for the parent
            finalBetaMemory = ReteNetworkBuilding.buildOrShareNetworkForConditions(reteNet.dummyBetaMemory,conditions,reteNet.rootAlpha,allNodes,reteNet),
            //Build the actions that are triggered by the rule:
            actionNodes = _.keys(rule.actions).map(function(actionId){
                console.log("Adding action for:",actionId);
                //todo: protect against duplicates here?
                var actionDescription = allNodes[actionId];
                return new RDS.ActionNode(finalBetaMemory,actionDescription,rule.name,reteNet);
            });

        //initialise the action storage for this rule
        if(reteNet.actions[rule.id] === undefined){
            reteNet.actions[rule.id] = [];
        }
        //update node with matches
        actionNodes.forEach(function(d){
            reteNet.actions[rule.id].push(d);
        });
        return actionNodes;
    };

    /**
       @function removeRule
       @purpose to remove a rule from the network
    */
    var removeRule = function(actionNode,reteNet){
        //delete from bottom up
        var invalidatedActions = ReteDeletion.deleteNodeAndAnyUnusedAncestors(actionNode);
        ReteUtil.cleanupInvalidatedActions(invalidatedActions);
    };


    
    var moduleInterface = {
        "ReteNet" : RDS.ReteNet,
        "ConstantTest" : RDS.ConstantTest,
        "CompOperators" : RCO,
        "clearHistory" : clearHistory,
        "clearPotentialActions" : clearPotentialActions,
        "assertWME_Immediately" : assertWME_Immediately,
        "retractWME_Immediately" : retractWME_Immediately,
        "assertWME_Later" : assertWME_Later,
        "incrementTime" : incrementTime,
        "addRule" : addRule,
        "removeRule" : removeRule,
    };
    return moduleInterface;    
});
