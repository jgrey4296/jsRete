/**
   Defines the Retract Action
   @module ReteActionRetract
   @requires ReteArithmeticActions
   @requires ReteUtilities
   @requires ReteDataStructures
   @requires underscore
*/
var ArithmeticActions = require('./ReteArithmeticActions'),
    _ = require('underscore'),
    ReteUtil = require('./ReteUtilities'),
    RDS = require('./ReteDataStructures');

"use strict";

/**
   @class RetractAction
   @implements {ReteActionInterface}
 */
var RetractAction = {
    "name" : "retract",
    propose : null,
    perform : null
};

/**
   Propose the Retraction
   @function
 */
RetractAction.propose = function(token,reteNet){
    "use strict";
    //get all wmes the token touches:
    let wmes = [],
        currToken = token,
        varRegex = /^\${(\w+)}/;
    while(currToken && currToken.wme !== undefined){
        wmes.push(currToken.wme);
        currToken = currToken.parentToken;
    }
    //Get the keys of the action that have 'wme' in them
    let wmeKeys = _.keys(this.values).filter(d=>/^wme([0-9]*)/.test(d)),
        //get the ones of those that related to a binding in the token
        wmeIdBindings = wmeKeys.map(d=>this.values[d]).filter(d=>varRegex.test(d)),
        //get the value for those bindings
        wmeIds = wmeIdBindings.map(function(d){
            let match = varRegex.exec(d);
            return token.bindings[match[1]];
        });
    //console.log("Token bindings :",token.bindings);
    //console.log("Retrieved wme ids for retraction:",wmeIds);
    // //filter the wmeList by the wmeIDs:
    // var toRetract = _.filter(wmes,function(wme){
    //     return _.contains(wmeIDs,wme.id);
    // });

    //Propose the list of all wmes to retract 
    var proposedAction = new RDS.ProposedAction(reteNet,"retract", wmeIds, token,
                                                reteNet.currentTime,
                                                this.timing);

    return proposedAction;
};

/**
   Perform the retraction
   @function
 */
RetractAction.perform = function(proposedAction,reteNet){
    if(proposedAction.actionType !== 'retract') { throw new Error("Expected retract"); }
    //console.log("Retracting:",proposedAction.payload);
    if(proposedAction.payload instanceof Array){
        var retractedWMEs = proposedAction.payload.map(d=>reteNet.retractWME(d));
        return {
            "retracted" : retractedWMEs
        };
    }else{
        var retractedWME = reteNet.retractWME(proposedAction.payload);
        return {
            "retracted" : [retractedWME]
        };
    }
    //do anything with the retracted wme(s)?

};

/** The Retract Action Definition */
module.exports = RetractAction;
