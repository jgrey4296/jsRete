var RDS = require('./ReteDataStructures'),
    ConstantTestOperators = require('./ReteComparisonOperators'),
    ReteUtil = require('./ReteUtilities'),
    ReteTestExecution = require('./ReteTestExecution'),
    PossibleActions = require('./ReteActions'),
    _ = require('underscore');

"use strict";


/**
   @function alphaMemoryActivation
   @purpose stores a wme in an alpha memory
   Trigger an alpha memory with a new wme to store
*/
var alphaMemoryActivation = function(alphaMem,wme){
    var newItem = new RDS.AlphaMemoryItem(wme,alphaMem);
    alphaMem.items.unshift(newItem);
    wme.alphaMemoryItems.unshift(newItem);
    //console.log("AlphaMemory activated:",alphaMem,wme);
    alphaMem.children.forEach(child=>rightActivate(child,wme));
};

/**
   @function constantTestNodeActivation
   @purpose tests a wme against the test in the given node
*/
//Trigger a constant test with a new wme
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
        alphaNode.children.forEach(child=>alphaNodeActivation(child,wme));
        if(alphaNode.outputMemory){
            alphaNodeActivation(alphaNode.outputMemory,wme);
        }
    }
    //console.log("ConstantTest Result:",alphaNode,wme,testResult);
    return testResult;
};

/**
   @function alphaNodeActivation
   @utility
   @purpose selects whether to store a wme, or test the wme
*/
//Switchable activation function for alpha network stuff
var alphaNodeActivation = function(alphaNode,wme){
    if(alphaNode.isAlphaMemory){
        alphaMemoryActivation(alphaNode,wme);
    }else if(alphaNode.isConstantTestNode){
        return constantTestNodeActivation(alphaNode,wme);
    }else{
        throw new Error("Unrecognised node:",alphaNode);
    }
};

/**
   @function betaMemoryActivation
   @purpose stores a token in the beta memory
*/
//trigger a beta memory to store a new token
//bindings are from the join node, holding results of the NEW binding tests
//old bindings are still in the token, the constructor of Token will combine the two
//sets of bindings
var betaMemoryActivation = function(betaMemory,token){
    var newToken = token;
    betaMemory.items.unshift(newToken);
    betaMemory.children.forEach(child=>leftActivate(child,newToken));
};


/**
   @function joinNodeLeftActivation
   @purpose given a new token, compares it to all wmes in the related alpha memory
*/
//Trigger a join node with a new token
//will pull all wmes needed from the linked alphaMemory
var joinNodeLeftActivation = function(node,token){
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
   @function activateActionNode
   @purpose given a new token, activates any stored actions necessary
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
        d.parallelActions = newProposedActionIds;
        actionNode.reteNet.proposedActions[d.id] = d;
    });
};


/**
   @function leftActivate
   @utility
   @purpose selects what node to activate as appropriate, for a new token
*/
//Utility leftActivation function to call
//whichever specific type is needed
var leftActivate = function(node,token,wme,joinTestResults){
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
    }else if(node.isBetaMemory){
        betaMemoryActivation(node,token);
    }else if(node.isJoinNode){
        joinNodeLeftActivation(node,token);
    }else if(node.isNegativeNode){
        negativeNodeLeftActivation(node,token);
    }else if(node.isAnNCCNode){
        nccNodeLeftActivation(node,token);
    }else if(node.isAnNCCPartnerNode){
        nccPartnerNodeLeftActivation(node,token);
    }else if(node.isActionNode){
        activateActionNode(node,token);
    }else{
        throw new Error("Unknown node type leftActivated");
    }
    return token;
};

/**
   @function rightActivate
   @purpose selects what node to activate, given a new wme
*/
var rightActivate = function(node,wme){
    if(node.isJoinNode){
        joinNodeRightActivation(node,wme);
    }else if(node.isNegativeNode){
        negativeNodeRightActivation(node,wme);
    }else{
        throw new Error("Tried to rightActivate Unrecognised node");
    }
};

/**
   @function negativeNodeLeftActivation
*/
//Trigger a negative node from a new token
//brings in bindings, creates a new token as necessary,
//combining bindings to.
var negativeNodeLeftActivation = function(node,newToken){
    //Relink
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
   @function negativeNodeRightActivation
*/
//trigger a negative node from a new wme,
//getting all tokens stored, comparing to the wme.
//any that the wme blocks, gets an additional negative Join result
//any that don't get blocked should already have been activated
var negativeNodeRightActivation = function(node,wme){
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
   @function nccNodeLeftActivation
*/
//from a new token, trigger the subnetwork?
var nccNodeLeftActivation = function(nccNode,token){
    //Create and store the incoming token from prior join node
    if(nccNode.isAnNCCNode === undefined){
        throw new Error("nccNodeLeftActivation should be on an NCCNode");
    }
    if(token.isToken === undefined){
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
   @function nccPartnerNodeLeftActivation
*/
//the nccPartnerNode is activated by a new token from the subnetwork
//figure out who owns this new token from the main (positive) network
var nccPartnerNodeLeftActivation = function(partner,token){
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
   @function removeAlphaMemoryItemsForWME
   @purpose to remove a wme from all alpha memories it is stored in
   @postCondition wme.alphaMemoryItems is empty
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
   @function deleteAllTokensForWME
   @purpose to cleanup all tokens a wme is part of
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
   @function deleteAllNegJoinResultsForWME
   @purpose For negative conditions, discount the wme as a block
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
   @function removeNegJoinResultsForToken
   @purpose to delete any blocked tokens in negative conditions
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
   @function removeTokenFromNode
   @purpose To remove a token from whatever node created it
*/
//Now the utility functions for deleteing token:
var removeTokenFromNode = function(token){
    //Deal with if the owning node is NOT an NCC
    if(token.owningNode
       && token.owningNode.isAnNCCPartnerNode === undefined
       && token.owningNode.isMemoryNode){
        //by removing the token as an element in that node
        var index = token.owningNode.items.map(d=>d.id).indexOf(token.id);
        if(index !== -1){
            token.owningNode.items.splice(index,1);
        }
    }
};

/**
   @function removeTokenFromWME
   @purpose to clean a token up, removing it from any WME references
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
   @function removeTokenFromParentToken
   @purpose cleanup the token from its parents list
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




/*
  Removes DOWNWARD links, but leaves UPWARD links intact
  Do a number of things:
  clean up tokens stored in a node
  remove any reference to the node from a connected alpha
  remove any reference to the node from a parent

  +: call recursively on any parent that has no children
*/

/**
   @function deleteNodeAndAnyUnusedAncestors
   @purpose cleanup an unused node and any parent nodes that are also unused once this node is gone.
*/
var deleteNodeAndAnyUnusedAncestors = function(node){
    var index,
        invalidatedActions = [];
    //if NCC, delete partner to
    if(node.isAnNCCNode){
        invalidatedActions = invalidatedActions.concat(deleteNodeAndAnyUnusedAncestors(node.partner));
    }
    
    //clean up tokens
    if(node.isBetaMemory){
        while(node.items.length > 0){
            invalidatedActions = invalidatedActions.concat(deleteTokenAndDescendents(node.items[0]));
        }
    }
    if(node.isAnNCCPartnerNode){
        while(node.newResultBuffer.length > 0){
            invalidatedActions = invalidatedActions.concat(deleteTokenAndDescendents(node.items[0]));
        }
    }

    //clean up any associated alphamemory
    if(node.isJoinNode || node.isNegativeNode && node.alphaMemory){
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
   @function deleteDescendentsOfToken
   @purpose simplification of removing children of a token, but not the token itself
   @utility
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
   @function deleteTokenAndDescendents
   @purpose To remove a token and clean it 
   delete a token and all the tokens that rely on it
   a bit of a frankenstein. Deletes the token,
   deletes descendents, but also sets and cleans up 
   left unlinking of join nodes, AND
   activates NCC's that are no longer blocked
*/
var deleteTokenAndDescendents = function(token){
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
       && token.owningNode.isAnNCCPartnerNode
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
   @function cleanupNCCResultsInToken
*/
var cleanupNCCResultsInToken = function(token){
    //NCCNODE
    if(token && token.owningNode && token.owningNode.isAnNCCNode){
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
   @function cleanupNCCPartnerOwnedToken
*/
var cleanupNCCPartnerOwnedToken = function(token){
    //NCCPARTNERNODE
    if(token.owningNode
       && token.owningNode.isAnNCCPartnerNode
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
