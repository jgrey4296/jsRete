import _ from 'lodash';
import { ArithmeticOperators as ArithmeticActions } from './ReteArithmeticActions';
import * as ReteUtil from './ReteUtilities';
import * as RDS from './ReteDataStructures';

let ActionInterface = {
    "name" : "removeRule",
    propose : null,
    perform : null
};

//Token + Action Description -> ProposedAction
ActionInterface.propose = function(token,reteNet){
    //Propose the list of all wmes to retract
    let proposedAction = new RDS.ProposedAction(reteNet,"NO-OP",
                                                this.name,
                                                token.wme, token,
                                                reteNet.currentTime,
                                                this.timing);

    return proposedAction;
};

//ProposedAction -> performance
ActionInterface.perform = function(proposedAction,reteNet){
    console.log("No-op");
};


export { ActionInterface as RemoveRuleAction };
