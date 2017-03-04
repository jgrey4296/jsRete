
import _ from 'lodash';
import * as ArithmeticActions from './ReteArithmeticActions';
import * as ReteUtil from './ReteUtilities';
import * as RDS from './ReteDataStructures';

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

export { ActionInterface };
