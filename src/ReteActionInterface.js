/**
   Describes the interface for ReteActions
   @module ReteActionInterface
*/
import _ from 'lodash';
import { ArithmeticOperators as ArithmeticActions } from './ReteArithmeticActions';
import * as ReteUtil from './ReteUtilities';
import * as RDS from './ReteDataStructures';

/**
   @interface
 */
let ActionInterface = {
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
    let proposedAction = new RDS.ProposedAction(reteNet,"NO-OP",
                                                this.name,
                                                toRetract, token,
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


export { ActionInterface };
