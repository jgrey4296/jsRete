
var ArithmeticActions = require('./ReteArithmeticActions'),
    _ = require('lodash'),
    ReteUtil = require('./ReteUtilities'),
    RDS = require('./ReteDataStructures');

"use strict";

var ActionInterface = {
    "name" : "addRule",
    propose : null,
    perform : null
};

//Token + Action Description -> ProposedAction
ActionInterface.propose = function(token,reteNet){
    "use strict";
    //Propose the list of all wmes to retract 
    var proposedAction = new RDS.ProposedAction(reteNet,"NO-OP", toRetract, token,
                                                reteNet.currentTime,
                                                this.timing);

    return proposedAction;
};

//ProposedAction -> Performance
ActionInterface.perform = function(proposedAction,reteNet){
    "use strict";
    console.log("No-op");
};


module.exports = ActionInterface;
