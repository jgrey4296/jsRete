/**
   Defines the Assert Action
   @module ReteActionAssert
   @requires ReteArithmeticActions
   @requires ReteUtilities
   @requires ReteDataStructures
   @requires lodash
*/
import _ from 'lodash';
import * as ArithmeticActions from './ReteArithmeticActions';
import * as ReteUtil from './ReteUtilities';
import * as RDS from './ReteDataStructures';

/**
   @implements {module:ReteActionInterface}
   @class AssertAction
 */
let AssertAction = {
    "name" : "assert",
    propose : null,
    perform : null
};

/**
   Propose the Assertion
   @param {module:ReteDataStructures.Token} token The token that is emitted by the network
   @param {module:ReteClassInterface.ReteNet} reteNet The top level reteNet
   @function
 */
AssertAction.propose = function(token,reteNet){
    
    //create the data object:
    let newWMEData = reteNet.utils.createNewWMEData(this,token);
    reteNet.utils.applyArithmetic(this,newWMEData);
    reteNet.utils.applyRegex(this,newWMEData);
    //Expand out to object structure
    //ie: {values.a:5, tags.type: rule} -> {values:{a:5},tags:{type:rule}}
    let complexFormData = reteNet.utils.objDescToObject(newWMEData);
    
    //To be returned to activateActionNode
    let proposedAction = new reteNet.ProposedAction(reteNet,"assert", complexFormData, token,
                                                reteNet.currentTime,
                                                this.timing,
                                                this.priority
                                                );

    return proposedAction;
};

/**
   Perform the Assertion, after having been scheduled
   @param {module:ReteDataStructures.ProposedAction} proposedAction
   @param {module:ReteClassInterface.ReteNet} reteNet
   @function
   @return {Object}
 */
AssertAction.perform = function(proposedAction,reteNet){
    
    //check the type matches
    if (proposedAction.actionType !== 'assert') { throw new Error("Expected Assert"); }
    //Perform the action:
    let newWMEID = reteNet.assertWME(proposedAction.payload,proposedAction.retractTime);

    //schedule the retraction:
    if (proposedAction.timing.unperformOffset > 0){
        //schedule a retract, with no invalidate time (its not being proposed)
        //and the perform time being the original actions unperformoffset
        reteNet.addToSchedule(new RDS.ProposedAction(reteNet,"retract",newWMEID,null,reteNet.currentTime,{
            invalidateOffset : null,
            performOffset : proposedAction.timing.unperformOffset,
            unperformOffset : null
        }));
    }

    return {
        "asserted" : newWMEID
    };
};

/** The Assert Action Definition */
export { AssertAction };
