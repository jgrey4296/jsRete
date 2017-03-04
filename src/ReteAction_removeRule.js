
let ArithmeticActions = require('./ReteArithmeticActions'),
    _ = require('lodash'),
    ReteUtil = require('./ReteUtilities'),
    RDS = require('./ReteDataStructures');



let ActionInterface = {
    "name" : "removeRule",
    propose : null,
    perform : null
};

//Token + Action Description -> ProposedAction
ActionInterface.propose = function(token,reteNet){
    //Propose the list of all wmes to retract 
    var proposedAction = new RDS.ProposedAction(reteNet,"NO-OP", toRetract, token,
                                                reteNet.currentTime,
                                                this.timing);

    return proposedAction;
};

//ProposedAction -> performance
ActionInterface.perform = function(proposedAction,reteNet){
    console.log("No-op");
};


module.exports = ActionInterface;
