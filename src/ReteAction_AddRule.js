
let ArithmeticActions = require('./ReteArithmeticActions'),
    _ = require('lodash'),
    ReteUtil = require('./ReteUtilities'),
    RDS = require('./ReteDataStructures');



let ActionInterface = {
    "name" : "addRule",
    propose : null,
    perform : null
};

//Token + Action Description -> ProposedAction
ActionInterface.propose = function(token,reteNet){
    
    //Propose the list of all wmes to retract
    //TODO: Check this
    let proposedAction = new RDS.ProposedAction(reteNet,"NO-OP", token.wme, token,
                                                reteNet.currentTime,
                                                this.timing);

    return proposedAction;
};

//ProposedAction -> Performance
ActionInterface.perform = function(proposedAction,reteNet){
    
    console.log("No-op");
};


module.exports = ActionInterface;
