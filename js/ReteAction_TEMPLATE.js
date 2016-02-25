
var ArithmeticActions = require('./ReteArithmeticActions'),
    _ = require('underscore'),
    ReteUtil = require('./ReteUtilities'),
    RDS = require('./ReteDataStructures');

"use strict";

var ActionInterface = {
    "name" : "TEMPLATE",
    proposeFunc : null,
    performFunc : null
};

//Token + Action Description -> ProposedAction
ActionInterface.proposeFunc = function(token,reteNet){
    //Propose the list of all wmes to retract 
    var proposedAction = new RDS.ProposedAction(reteNet,"NO-OP", toRetract, token,
                                                reteNet.currentTime,
                                                this.timing);

    return proposedAction;
};

//ProposedAction -> Performance
ActionInterface.performFunc = function(reteNet,proposedAction){
    console.log("No-op");
};


module.exports = ActionInterface;
