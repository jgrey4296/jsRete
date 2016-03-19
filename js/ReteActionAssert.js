/**
   Defines the Assert Action
   @module ReteActionAssert
   @requires ReteArithmeticActions
   @requires ReteUtilities
   @requires ReteDataStructures
   @requires underscore
*/

var ArithmeticActions = require('./ReteArithmeticActions'),
    _ = require('underscore'),
    ReteUtil = require('./ReteUtilities'),
    RDS = require('./ReteDataStructures');


/**
   @implements {module:ReteActionInterface}
   @class AssertAction
 */
var AssertAction = {
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
    "use strict";
    //create the data object:
    var newWMEData = reteNet.utils.createNewWMEData(this,token);
    reteNet.utils.applyArithmetic(this,newWMEData);
    reteNet.utils.applyRegex(this,newWMEData);
    //Expand out to object structure
    //ie: {values.a:5, tags.type: rule} -> {values:{a:5},tags:{type:rule}}
    var complexFormData = reteNet.utils.objDescToObject(newWMEData);
    
    //To be returned to activateActionNode
    var proposedAction = new reteNet.ProposedAction(reteNet,"assert", complexFormData, token,
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
    "use strict";
    //check the type matches
    if(proposedAction.actionType !== 'assert') { throw new Error("Expected Assert"); }
    //Perform the action:
    var newWMEID = reteNet.assertWME(proposedAction.payload,proposedAction.retractTime);

    //schedule the retraction:
    if(proposedAction.timing.unperformOffset > 0){
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
module.exports = AssertAction;
