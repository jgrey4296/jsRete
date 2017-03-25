import * as RDS from './ReteDataStructures';

let RemoveRule = {
    "name" : "removeRule",
    propose : null,
    perform : null
};
export default RemoveRule;

//Token + Action Description -> ProposedAction
RemoveRule.propose = function(token,reteNet){
    //Propose the list of all wmes to retract
    let proposedAction = new RDS.ProposedAction(reteNet,"NO-OP",
                                                this.name,
                                                token.wme, token,
                                                reteNet.currentTime,
                                                this.timing);

    return proposedAction;
};

//ProposedAction -> performance
RemoveRule.perform = function(proposedAction,reteNet){
    console.log("No-op");
};



