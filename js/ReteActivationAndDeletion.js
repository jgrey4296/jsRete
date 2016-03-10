/**
   Functions that describe Activation of ReteNet nodes, and the removal of said nodes
   @module ReteActivationAndDeletion
   @requires ReteDataStructures
   @requires ReteComparisonOperators
   @requires ReteUtilities
   @requires ReteTestExecution
   @requires ReteActions
   @requires underscore
 */
var RDS = require('./ReteDataStructures'),
    ConstantTestOperators = require('./ReteComparisonOperators'),
    ReteUtil = require('./ReteUtilities'),
    ReteTestExecution = require('./ReteTestExecution'),
    PossibleActions = require('./ReteActions'),
    _ = require('underscore');

"use strict";

/**
   Stores a wme in an alpha memory, 
   Trigger an alpha memory with a new wme to store
   @param alphaMem
   @param wme
   @function alphaMemoryActivation
*/
var alphaMemoryActivation = function(alphaMem,wme){
    var newItem = new RDS.AlphaMemoryItem(wme,alphaMem);
    alphaMem.items.unshift(newItem);
    wme.alphaMemoryItems.unshift(newItem);
    //console.log("AlphaMemory activated:",alphaMem,wme);
    alphaMem.children.forEach(child=>rightActivate(child,wme));
};

/**
   Tests a wme against the test in the given node
   @param alphaNode
   @param wme
   @function constantTestNodeActivation
*/
var constantTestNodeActivation = function(alphaNode,wme){
    //test the wme using the constant test in the node
    var testResult = false;
    if(alphaNode.passThrough){
        testResult = true;
    }else{
        var wmeFieldValue = ReteUtil.retrieveWMEValueFromDotString(wme,alphaNode.testField);
        var value = alphaNode.testValue;
        var operator = alphaNode.operator;
        if(ConstantTestOperators[operator]){
            if(operator !== 'EQ' && operator !== 'NE'){
                testResult = ConstantTestOperators[operator](Number(wmeFieldValue),Number(value));
            }else{
                //console.log("testing:",wmeFieldValue,operator,value,alphaNode,wme);
                testResult = ConstantTestOperators[operator](wmeFieldValue,value);
            }
            
        }
    }
    if(testResult){
        //console.log("successful constant test result",testResult,wme,alphaNode);
        if(alphaNode.outputMemory){
            alphaNodeActivation(alphaNode.outputMemory,wme);
        }
        alphaNode.children.forEach(child=>alphaNodeActivation(child,wme));
    }
    //console.log("ConstantTest Result:",alphaNode,wme,testResult);
    return testResult;
};

/**
   Selects whether to store a wme, or test the wme
   @param alphaNode
   @param wme
   @function alphaNodeActivation
*/
//Switchable activation function for alpha network stuff
var alphaNodeActivation = function(alphaNode,wme){
    if(alphaNode instanceof RDS.AlphaMemory){
        alphaMemoryActivation(alphaNode,wme);
    }else if(alphaNode instanceof RDS.AlphaNode){
        return constantTestNodeActivation(alphaNode,wme);
    }else{
        throw new Error("Unrecognised node:",alphaNode);
    }
};

/**
   Stores a token in the beta memory
   @param betaMemory
   @param token
   @function betaMemoryActivation
*/
var betaMemoryActivation = function(betaMemory,token){
    //trigger a beta memory to store a new token
    //bindings are from the join node, holding results of the NEW binding tests
    //old bindings are still in the token, the constructor of Token will combine the two
    //sets of bindings
    var newToken = token;
    betaMemory.items.unshift(newToken);
    betaMemory.children.forEach(child=>leftActivate(child,newToken));
};


/**
   Given a new token, compares it to all wmes in the related alpha memory
   @param node
   @param token
   @function joinNodeLeftActivation
*/
var joinNodeLeftActivation = function(node,token){
    //Trigger a join node with a new token
    //will pull all wmes needed from the linked alphaMemory
    //If necessary, relink or unlink the
    //parent betamemory or alphamemory
    if(node.parent.items && node.parent.items.length === 1){
        ReteUtil.relinkToAlphaMemory(node);
        if(node.alphaMemory.items.length === 0){
            //unlink beta memory if alphamemory is empty
            var index = node.parent.children.map(d=>d.id).indexOf(node.id);
            var unlinked = node.parent.children.splice(index,1);
            node.parent.unlinkedChildren.push(unlinked[0]);
        }
    }
    //for each wme in the alpha memory,
    //compare using join tests,
    //and pass on successful combinations
    //to beta memory /negative node children
    //to be combined into tokens
    node.alphaMemory.items.forEach(function(item){
        var currWME = item.wme;
        var joinTestResult = ReteTestExecution.performJoinTests(node,token,currWME);
        if(joinTestResult !== undefined && joinTestResult !== false){
            node.children.forEach(child=>leftActivate(child,token,currWME,joinTestResult));
            
        }
    });//end of looping all wmes in alphamemory
};

/**
   @function joinNodeRightActivation
   @param node
   @param wme
   @purpose given a new wme, compares it against all tokens in the related beta memory
*/
//Trigger a join node with a new wme
//pulling all necessary tokens from the parent as needed
var joinNodeRightActivation = function(node,wme){
    //relink or unlink as necessary
    if(node.alphaMemory.items.length === 1){
        ReteUtil.relinkToBetaMemory(node);
        if(node.parent.items.length === 0){
            var index = node.alphaMemory.children.map(d=>d.id).indexOf(node.id);
            var unlinked = node.alphaMemory.children.splice(index,1);
            node.alphaMemory.unlinkedChildren.push(unlinked[0]);
        }
    }

    //For all tokens, compare to the new wme,
    //pass on successful combinations to betamemory/negative node
    node.parent.items.forEach(function(currToken){
        //console.log("--------\nComparing: ",currToken.bindings,"\n To: ",wme.data,"\n using: ",node.tests);
        var joinTestResult = ReteTestExecution.performJoinTests(node,currToken,wme);
        if(joinTestResult !== undefined && joinTestResult !== false){
            node.children.forEach(currNode=>leftActivate(currNode,currToken,wme,joinTestResult));
        }
    });
};


/**
   Given a new token, activates any stored actions necessary
   @param actionNode
   @param token
   @function activateActionNode
*/
var activateActionNode = function(actionNode,token){
    //get the actions the node embodies:
    var boundActionFunctions = actionNode.boundActions,
        //apply the token to each of the actions
        newProposedActions = boundActionFunctions.map(d=>d(token,actionNode.reteNet)),
        newProposedActionIds = newProposedActions.map(d=>d.id);
    //store the proposed actions in the reteNet.potential actions
    //and also tie all the actions that fire together by their ids
    //ie: {action:"assert",payload:wme}
    //see RDS.ProposedAction for details
    newProposedActions.forEach(function(d){
        d.parallelActions = _.reject(newProposedActionIds,e=>e===d.id);
        actionNode.reteNet.proposeAction(d);
    });
};


/**
   Selects what node to activate as appropriate, for a new token
   @function leftActivate
*/
var leftActivate = function(node,token,wme,joinTestResults){
    //Utility leftActivation function to call
    //whichever specific type is needed
    //Construct a new token if supplied the correct
    //parameters
    if(joinTestResults && wme){
        token = new RDS.Token(token,wme,node,joinTestResults);
        //owning node is the node going into, rather than coming out of
    }
    //Activate the node:
    //Essentially a switch of:
    //betaMemory, JoinNode, NegativeNode, NCC, PartnerNode,
    //and Action
    if(node.__isDummy){
        //pass on, because this is a test
    }else if(node instanceof RDS.BetaMemory){
        betaMemoryActivation(node,token);
    }else if(node instanceof RDS.JoinNode){
        joinNodeLeftActivation(node,token);
    }else if(node instanceof RDS.NegativeNode){
        negativeNodeLeftActivation(node,token);
    }else if(node instanceof RDS.NCCNode){
        nccNodeLeftActivation(node,token);
    }else if(node instanceof RDS.NCCPartnerNode){
        nccPartnerNodeLeftActivation(node,token);
    }else if(node instanceof RDS.ActionNode){
        activateActionNode(node,token);
    }else{
        throw new Error("Unknown node type leftActivated");
    }
    return token;
};

/**
   Selects what node to activate, given a new wme
   @param node
   @param wme
   @function rightActivate
*/
var rightActivate = function(node,wme){
    if(node instanceof RDS.JoinNode){
        joinNodeRightActivation(node,wme);
    }else if(node instanceof RDS.NegativeNode){
        negativeNodeRightActivation(node,wme);
    }else{
        throw new Error("Tried to rightActivate Unrecognised node");
    }
};

/**
   Activate a negative node with a new token
   @param node
   @param newToken
   @function negativeNodeLeftActivation
*/
var negativeNodeLeftActivation = function(node,newToken){
    //Trigger a negative node from a new token
    //brings in bindings, creates a new token as necessary,
    //combining bindings to.

    //Relink
    //console.log("Negative node left activation");
    if(node.items.length === 0){
        ReteUtil.relinkToAlphaMemory(node);
    }
    node.items.unshift(newToken);

    node.alphaMemory.items.forEach(function(item){
        var currWme = item.wme;
        var joinTestResult = ReteTestExecution.performJoinTests(node,newToken,currWme);
        if(joinTestResult){
            //adds itself to the token and
            //wme as necessary to block the token
            var joinResult = new RDS.NegativeJoinResult(newToken,currWme);
        }
    });

    //if no wmes block the token, pass it on down the network
    if(newToken.negJoinResults.length === 0){
        node.children.forEach(child=>leftActivate(child,newToken));
    }
    
};

/**
   Activate a negative node with a new wme
   @param node
   @param wme
   @function negativeNodeRightActivation
*/
var negativeNodeRightActivation = function(node,wme){
    //trigger a negative node from a new wme,
    //getting all tokens stored, comparing to the wme.
    //any that the wme blocks, gets an additional negative Join result
    //any that don't get blocked should already have been activated
    console.log("Negative node right activation");
    node.items.forEach(function(currToken){
        var joinTestResult = ReteTestExecution.performJoinTests(node,currToken,wme);
        if(joinTestResult !== undefined && joinTestResult !== false){
            if(currToken.negJoinResults.length === 0){
                //todo: fix this
                var invalidatedActions = deleteDescendentsOfToken(currToken);
                ReteUtil.cleanupInvalidatedActions(invalidatedActions);
            }
            //Adds itself to the currToken and wme as
            //necessary
            var negJoinResult = new RDS.NegativeJoinResult(currToken,wme);
        }
    });
};

/**
   Activate a Negated Conjunctive Condition with a new Token
   @param nccNode
   @param token
   @function nccNodeLeftActivation
*/
var nccNodeLeftActivation = function(nccNode,token){
    //from a new token, trigger the subnetwork?
    //Create and store the incoming token from prior join node
    if(!(nccNode instanceof RDS.NCCNode)){
        throw new Error("nccNodeLeftActivation should be on an NCCNode");
    }
    if(!(token instanceof RDS.Token)){
        throw new Error("nccNodeLeftActivation should be on a token");
    }
    var newToken = token;
    nccNode.items.unshift(newToken);

    //the partner's network MUST fire before the nccnode
    //hence this. all the new results' in the partners new result buffer,
    //are from the same origin as token
    //if there are new results to process:
    while(nccNode.partner && nccNode.partner.newResultBuffer.length > 0){
        var newResult = nccNode.partner.newResultBuffer.pop();
        //add the subnetworks result as a blocking token
        newToken.nccResults.unshift(newResult);
        //set the subnetwork result to have its parent as the new token
        newResult.parentToken = newToken;
    }

    //if the new token has no blocking tokens,
    //continue on
    if(newToken.nccResults.length === 0){
        nccNode.children.forEach(child=>leftActivate(child,newToken));
    }
};

/**
   Activate a Negated Conjunctive Condition's subnetwork with a new token
   @param partner
   @param token
   @function nccPartnerNodeLeftActivation
*/
var nccPartnerNodeLeftActivation = function(partner,token){
    //the nccPartnerNode is activated by a new token from the subnetwork
    //figure out who owns this new token from the main (positive) network
    //the partner's ncc
    var nccNode = partner.nccNode,
        //the token created in left activate, with partner as owner
        newToken = token,
        ownersToken = token.parentToken,//the prior token
        ownersWme = token.wme,//the prior wme
        owner;

    
    for(var i = 1; i < partner.numberOfConjuncts; i++){
        //go up the owner chain
        ownersToken = ownersToken.parentToken;
        ownersWme = ownersWme.wme;
    }

    //find an owner in the ncc node's memory to link to
    if(nccNode !== undefined){
        var possible_tokens = nccNode.items.map(function(d){
            if(d.parentToken.id === ownersToken.id && d.wme.id === ownersWme.id){
                return d;
            }}).filter(d=> d !== undefined);
        owner = possible_tokens[0];
    }

    //link the owner and the new token
    if(owner !== undefined){
        //the necessary owner exists in the nccNode,
        //so update it:
        owner.nccResults.unshift(newToken);
        newToken.parent = owner;
        var invalidatedActions = deleteDescendentsOfToken(owner);
        ReteUtil.cleanupInvalidatedActions(invalidatedActions); 
    }else{        
        //else no owner: add to temp buffer to wait for the ncc node to be activated
        partner.newResultBuffer.unshift(newToken);
    }
};


/**
   Utility function to activate based on lack of existence of negated join results
   @param nJR
   @function activateIfNegatedJRIsUnblocked
*/
var activateIfNegatedJRIsUnblocked = function(nJR){
    var currJoinResult = nJR;
    //if the negation clears, activate it
    if(currJoinResult.owner.negJoinResults.length === 0){
        currJoinResult.owner.owningNode.children.forEach(child=>leftActivate(child,currJoinResult.owner));
    }
};


/**
   To remove a wme from all alpha memories it is stored in
   postCondition wme.alphaMemoryItems is empty
   @param wme
   @function removeAlphaMemoryItemsForWME   
*/
var removeAlphaMemoryItemsForWME = function(wme){
    //remove alpha memory items
    wme.alphaMemoryItems.forEach(function(item){
        //unlink the alphamemory from the item
        var index = item.alphaMemory.items.map(d=>d.id).indexOf(item.id);
        if(index !== -1){ item.alphaMemory.items.splice(index,1);}
        //unlink the alphaMemory itself if it is now empty
        //will unlink if am.items.length === 0
        ReteUtil.unlinkAlphaMemory(item.alphaMemory);
        //clear the item's links
        item.alphaMemory = undefined;
        item.wme = undefined;
    });
    //completely clear am items:
    wme.alphaMemoryItems = [];
};

/**
   To cleanup all tokens a wme is part of
   @param wme
   @function deleteAllTokensForWME
*/
var deleteAllTokensForWME = function(wme){
    var invalidatedActions = [];
    //For all tokens
    while(wme.tokens.length > 0){
        invalidatedActions = invalidatedActions.concat(deleteTokenAndDescendents(wme.tokens[0]));
    }

    return invalidatedActions;
    
};

/**
   For negative conditions, discount the wme as a block
   @param wme
   @function deleteAllNegJoinResultsForWME
*/
var deleteAllNegJoinResultsForWME = function(wme){
    //unlink the negative Join results in the owning token
    wme.negJoinResults.forEach(function(jr){
        var index = jr.owner.negJoinResults.map(j=>j.id).indexOf(jr.id);
        if(index !== -1){
            jr.owner.negJoinResults.splice(index,1);
        }
        activateIfNegatedJRIsUnblocked(jr);
        //remove internal references:
        jr.owner = undefined;
        jr.wme = undefined;
    });
    //completely clear negjoinresults
    wme.negJoinResults = [];
};


/**
   To delete any blocked tokens in negative conditions
   @param token
   @function removeNegJoinResultsForToken
*/
var removeNegJoinResultsForToken = function(token){
    //remove Negative join results
    token.negJoinResults.forEach(function(jr){
        var index = jr.wme.negJoinResults.map(d=>d.id).indexOf(jr.id);
        if(index !== -1){
            jr.wme.negJoinResults.splice(index,1);
        }
        //clear the references
        jr.wme = undefined;
        jr.token = undefined;
    });
    token.negJoinResults = [];
};


/**
   To remove a token from whatever node created it
   @param token
   @function removeTokenFromNode
*/
//Now the utility functions for deleteing token:
var removeTokenFromNode = function(token){
    //Deal with if the owning node is NOT an NCC
    if(token.owningNode
       && !(token.owningNode instanceof RDS.NCCPartnerNode)
       && (token instanceof RDS.AlphaMemory || token instanceof RDS.BetaMemory)){
        //by removing the token as an element in that node
        var index = token.owningNode.items.map(d=>d.id).indexOf(token.id);
        if(index !== -1){
            token.owningNode.items.splice(index,1);
        }
    }
};

/**
   To clean a token up, removing it from any WME references
   @function removeTokenFromWME
*/
var removeTokenFromWME = function(token){
    //remove the token from the wme it is based on
    if(token.wme && token.wme.tokens){
        var index = token.wme.tokens.map(d=>d.id).indexOf(token.id);
        if(index !== -1){
            token.wme.tokens.splice(index,1);
        }
    }
};

/**
   Cleanup the token from its parents list
   @param token
   @function removeTokenFromParentToken
*/
var removeTokenFromParentToken = function(token){
    //Remove the token from it's parent's child list
    if(token && token.parentToken){
        var index = token.parentToken.children.map(d=>d.id).indexOf(token.id);
        if(index !== -1){
            token.parentToken.children.splice(index,1);
        }
    }
};





/**
   Cleanup an unused node and any parent nodes that are also unused once this node is gone.
   @param node
   @function deleteNodeAndAnyUnusedAncestors
*/
var deleteNodeAndAnyUnusedAncestors = function(node){
    /*
      Removes DOWNWARD links, but leaves UPWARD links intact
      Do a number of things:
      clean up tokens stored in a node
      remove any reference to the node from a connected alpha
      remove any reference to the node from a parent
      
      +: call recursively on any parent that has no children
    */
    var index,
        invalidatedActions = [];
    //if NCC, delete partner to
    if(node instanceof RDS.NCCNode){
        invalidatedActions = invalidatedActions.concat(deleteNodeAndAnyUnusedAncestors(node.partner));
    }
    
    //clean up tokens
    if(node instanceof RDS.BetaMemory){
        while(node.items.length > 0){
            invalidatedActions = invalidatedActions.concat(deleteTokenAndDescendents(node.items[0]));
        }
    }
    if(node instanceof RDS.NCCPartnerNode){
        while(node.newResultBuffer.length > 0){
            invalidatedActions = invalidatedActions.concat(deleteTokenAndDescendents(node.items[0]));
        }
    }

    //clean up any associated alphamemory
    if(node instanceof RDS.JoinNode || (node instanceof RDS.NegativeNode && node.alphaMemory)){
        index = node.alphaMemory.children.map(d=>d.id).indexOf(node.id);
        if(index > -1){
            node.alphaMemory.children.splice(index,1);
            node.alphaMemory.referenceCount--;
        }
        if(node.alphaMemory.referenceCount === 0){
            //TODO: write delete alpha memory
            //deleteAlphaMemory(node.alphaMemory);
        }
    }
    
    //remove the node from its parent
    if(node.parent){
        //check the child list:
        index = node.parent.children.map(d=>d.id).indexOf(node.id);
        if(index !== -1){                            
            node.parent.children.splice(index,1);
        }else{
            //check the unlinked children list:
            index = node.parent.unlinkedChildren.map(d=>d.id).indexOf(node.id);
            if(index !== -1){
                node.parent.unlinkedChildren.splice(index,1);
            }
        }
    }

    //delete parent node if its got no children
    if(node.parent && node.parent.children.length === 0
       && node.parent.unlinkedChildren
       && node.parent.unlinkedChildren.length === 0){
        invalidatedActions = invalidatedActions.concat(deleteNodeAndAnyUnusedAncestors(node.parent));
    }
    //deallocate memory for none
    return invalidatedActions;
    
};


/**
   Simplification of removing children of a token, but not the token itself
   @param token
   @function deleteDescendentsOfToken
*/
//utility function to delete all descendents without deleting the token
var deleteDescendentsOfToken = function(token){
    var invalidatedActions = [];
    while(token.children.length > 0){
        invalidatedActions = invalidatedActions.concat(deleteTokenAndDescendents(token.children[0]));
    }
    invalidatedActions = invalidatedActions.concat(token.proposedActions);
    return invalidatedActions;
};


/**
   @param token
   @function deleteTokenAndDescendents
*/
var deleteTokenAndDescendents = function(token){
   /* purpose To remove a token and clean it 
   delete a token and all the tokens that rely on it
   a bit of a frankenstein. Deletes the token,
   deletes descendents, but also sets and cleans up 
   left unlinking of join nodes, AND
   activates NCC's that are no longer blocked
   */

    var invalidatedActions = [];
    
    //Recursive call:
    while(token.children.length > 0){
        invalidatedActions = invalidatedActions.concat(deleteTokenAndDescendents(token.children[0]));
    }

    //Base Cases:
    //remove memory items
    removeTokenFromNode(token);
    removeTokenFromWME(token);
    removeTokenFromParentToken(token);
    
    ReteUtil.ifEmptyBetaMemoryUnlink(token.owningNode);
    ReteUtil.ifEmptyNegNodeUnlink(token.owningNode,token.id);

    removeNegJoinResultsForToken(token);

    cleanupNCCResultsInToken(token);
    cleanupNCCPartnerOwnedToken(token);
    
    if(token && token.owningNode
       && token.owningNode instanceof RDS.NCCPartnerNode
       && token.parentToken.nccResults.length === 0){
        //Activate newly unblocked Token
        //todo: should this be nccnode AND/OR negNode?
        token.owningNode.nccNode.children.forEach(d=>leftActivate(d,token.parentToken));
    }

    //get the queued actions linked with the token, and return them for cleanup
    invalidatedActions = invalidatedActions.concat(token.proposedActions);
    
    return invalidatedActions;
};

/**
   @param token
   @function cleanupNCCResultsInToken
*/
var cleanupNCCResultsInToken = function(token){
    //NCCNODE
    if(token && token.owningNode && token.owningNode instanceof RDS.NCCNode){
        //for all the nccResult tokens, delete them
        token.nccResults.forEach(function(nccR){
            //remove the nccR token from its linked wme
            if(nccR.wme){
                var index = nccR.wme.tokens.map(d=>d.id).indexOf(nccR.id);
                if(index !== -1){
                    nccR.wme.tokens.splice(index,1);
                }
            }
            if(nccR.parent){
                //remove the token from it's parent
                var nccRindex = nccR.parent.children.map(d=>d.id).indexOf(nccR.id);
                if(nccRindex !== -1){
                    nccR.parent.children.splice(nccRindex,1);
                }
            }
        });
        //clear the nccResults
        token.nccResults = [];
        return true;
    }else{
        return false;
    }
};

/**
   @param token
   @function cleanupNCCPartnerOwnedToken
*/
var cleanupNCCPartnerOwnedToken = function(token){
    //NCCPARTNERNODE
    if(token.owningNode
       && token.owningNode instanceof RDS.NCCPartnerNode
       && token.parentToken){
        //remove from owner.nccResults:
        var index = token.parentToken.nccResults.map(d=>d.id).indexOf(token.id);
        if(index !== -1){
            token.parentToken.nccResults.splice(index,1);
        }
        return true;
    }else{
        return false;
    }
};



var moduleInterface = {
    "deleteDescendentsOfToken" : deleteDescendentsOfToken,
    "removeAlphaMemoryItemsForWME" : removeAlphaMemoryItemsForWME,
    "deleteAllTokensForWME" : deleteAllTokensForWME,
    "deleteAllNegJoinResultsForWME" : deleteAllNegJoinResultsForWME,
    "deleteNodeAndAnyUnusedAncestors" : deleteNodeAndAnyUnusedAncestors,
    "leftActivate" : leftActivate,
    "rightActivate" : rightActivate,
    "alphaNodeActivation" : alphaNodeActivation,
    "activateIfNegatedJRIsUnblocked" : activateIfNegatedJRIsUnblocked,
};
module.exports = moduleInterface;
