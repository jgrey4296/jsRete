import * as RDS from './ReteDataStructures';

let AddRule = {
    "name" : "addRule",
    propose : null,
    perform : null
};
export default AddRule;

//Token + Action Description -> ProposedAction
AddRule.propose = function(token,reteNet){
    
    //Propose the list of all wmes to retract
    //TODO: Check this
    let proposedAction = new RDS.ProposedAction(reteNet,"NO-OP",
                                                this.name,
                                                token.wme, token,
                                                reteNet.currentTime,
                                                this.timing);

    return proposedAction;
};

//ProposedAction -> Performance
AddRule.perform = function(proposedAction,reteNet){
    
    console.log("No-op");
};


