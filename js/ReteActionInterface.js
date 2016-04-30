/**
   Describes the interface for ReteActions
   @module ReteActionInterface
*/
var ArithmeticActions = require('./ReteArithmeticActions'),
    _ = require('lodash'),
    ReteUtil = require('./ReteUtilities'),
    RDS = require('./ReteDataStructures');

"use strict";

/**
   @interface
 */
var ActionInterface = {
    /** @member */
    "name" : "NO-OP",
    propose : null,
    perform : null
};

/**
   @param token
   @param reteNet
   @method propose
 */
ActionInterface.propose = function(token,reteNet){
    //Token + Action Description -> ProposedAction
    //Propose the list of all wmes to retract 
    var proposedAction = new RDS.ProposedAction(reteNet,"NO-OP", toRetract, token,
                                                reteNet.currentTime,
                                                this.timing);

    return proposedAction;
};

/**
   @param proposedAction
   @param reteNet
   @method peform
 */
ActionInterface.perform = function(proposedAction,reteNet){
    //ProposedAction -> Performance
    console.log("No-op");
};


module.exports = ActionInterface;
