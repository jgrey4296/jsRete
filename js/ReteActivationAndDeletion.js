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
        var wmeFieldValue = ReteUtil.retrieveWMEValueFromDotString(wme,alphaNode.testField),
            value = alphaNode.testValue,
            operator = alphaNode.operator;
        if(wmeFieldValue === null){ return false; }
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
        if(currToken.negJoinResults.length > 0 || currToken.nccResults.length > 0){
            return false;
        }
        //console.log("--------\nComparing: ",currToken.bindings,"\n To: ",wme.data,"\n using: ",node.tests);
        var joinTestResult = ReteTestExecution.performJoinTests(node,currToken,wme);
        if(joinTestResult !== undefined && joinTestResult !== false){
            node.children.forEach(currNode=>leftActivate(currNode,currToken,wme,joinTestResult));
        }
    });
};


/**
   Given a new token, proposes a set of actions
   @param actionNode
   @param token
   @function activateActionNode
*/
var actionNodeActivation = function(actionNode,token){
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
    if(!(node instanceof RDS.JoinNode || node instanceof RDS.ActionNode)){
        token = new RDS.Token(token,wme,node,joinTestResults);
    }
    //owning node is the node going into, rather than coming out of

    //Activate the node:
    //Essentially a switch of:
    //betaMemory, JoinNode, NegativeNode, NCC, PartnerNode, and action
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
        actionNodeActivation(node,token);
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
        if(currToken.negJoinResults.length > 0 || currToken.nccResults.length > 0){
            return false;
        }
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

    for(var i = 0; i <= partner.numberOfConjuncts; i++){
        //go up the owner chain
        ownersWme = ownersToken.wme;
        ownersToken = ownersToken.parentToken;
    }

    //find an owner in the ncc node's memory to link to
    if(nccNode !== undefined && ownersToken && ownersWme){
        var possible_tokens = _.reject(nccNode.items,function(d){
            return d.parentToken.id !== ownersToken.id || d.wme.id !== ownersWme.id;
        });
        if(possible_tokens.length > 0){
            owner = possible_tokens[0];
        }
    }

    //link the owner and the new token
    if(owner !== undefined){
        //the necessary owner exists in the nccNode,
        //so update it:
        owner.nccResults.unshift(newToken);
        newToken.parentToken = owner;
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
        item.alphaMemory.items = _.reject(item.alphaMemory.items,d=>d.id===item.id);
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
    var invalidatedActions = new Set();
    //For all tokens
    while(wme.tokens.length > 0){
        deleteTokenAndDescendents(wme.tokens[0]).forEach(d=>invalidatedActions.add(d));
    }
    return Array.from(invalidatedActions);
};

/**
   For negative conditions, discount the wme as a block
   @param wme
   @function deleteAllNegJoinResultsForWME
*/
var deleteAllNegJoinResultsForWME = function(wme){
    //unlink the negative Join results in the owning token
    wme.negJoinResults.forEach(function(jr){
        jr.owner.negJoinResults = _.reject(jr.owner.negJoinResults,d=>d.id === jr.id);
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
        jr.wme.negJoinResults = _.reject(jr.wme.negJoinResults,d=>d.id === jr.id);
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
       && !(token.owningNode instanceof RDS.NCCPartnerNode)){
       //&& (token.owningNode instanceof RDS.AlphaMemory || token.owningNode instanceof RDS.BetaMemory)){
        //by removing the token as an element in that node
        token.owningNode.items = _.reject(token.owningNode.items,d=>d.id === token.id);
    }
};

/**
   To clean a token up, removing it from any WME references
   @function removeTokenFromWME
*/
var removeTokenFromWME = function(token){
    //remove the token from the wme it is based on
    if(token.wme && token.wme.tokens){
        token.wme.tokens = _.reject(token.wme.tokens,d=>d.id === token.id);
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
        token.parentToken.children = _.reject(token.parentToken.children,d=>d.id === token.id);
    }
};

/**
   Cleanup an unused node and any parent nodes that are also unused once this node is gone.
   @param node
   @function deleteNodeAndAnyUnusedAncestors
*/
var deleteNodeAndAnyUnusedAncestors = function(node){
    "use strict";
    /*
      Do a number of things:
      clean up tokens stored in a node
      remove any reference to the node from a connected alpha
      remove any reference to the node from a parent
      
      +: call recursively on any parent that has no children
    */
    var invalidatedActions = new Set();
    if(node instanceof RDS.ActionNode){
        node.reteNet = null;
    }
    
    //if NCC, delete partner too
    if(node instanceof RDS.NCCNode){
        let tempPartner = node.partner;
        node.partner = null;
        deleteNodeAndAnyUnusedAncestors(tempPartner).forEach(d=>invalidatedActions.add(d));
    }
    
    //clean up tokens
    if((node instanceof RDS.BetaMemory && node.dummy === undefined) || (node instanceof RDS.NegativeNode) || (node instanceof RDS.NCCNode)){
        while(node.items.length > 0){
            let curr = node.items.pop();
            deleteTokenAndDescendents(curr).forEach(d=>invalidatedActions.add(d));
        }
    }
    if(node instanceof RDS.NCCPartnerNode){
        while(node.newResultBuffer.length > 0){
            let curr = node.newResultBuffer.pop();
            deleteTokenAndDescendents(curr).forEach(d=>invalidatedActions.add(d));
        }
    }

    //clean up any associated alphamemory
    if(node.alphaMemory && (node instanceof RDS.JoinNode || node instanceof RDS.NegativeNode)){
        node.alphaMemory.children = _.reject(node.alphaMemory.children,d=>d.id===node.id);
        node.alphaMemory.unlinkedChildren = _.reject(node.alphaMemory.unlinkedChildren,d=>d.id===node.id);
        node.alphaMemory.referenceCount--;

        if(node.alphaMemory.referenceCount < 1){
            let tempAlphaMemory = node.alphaMemory;
            node.alphaMemory = null;
            deleteAlphaNode(tempAlphaMemory).forEach(d=>invalidatedActions.add(d));
        }
    }

    //remove the node from its parent
    if(node.parent){
        //check the child list:
        node.parent.children = _.reject(node.parent.children,d=>d.id===node.id);
        node.parent.unlinkedChildren = _.reject(node.parent.unlinkedChildren,d=>d.id===node.id);
    }

    //delete parent node if its got no children
    if(node.parent && node.parent.children.length === 0
       && node.parent.unlinkedChildren
       && node.parent.unlinkedChildren.length === 0
       && node.parent.dummy === undefined){
        let tempParent = node.parent;
        node.parent = null;
        deleteNodeAndAnyUnusedAncestors(tempParent).forEach(d=>invalidatedActions.add(d));
    }

    //delete any children to be sure
    node.children.forEach(d=>deleteNodeAndAnyUnusedAncestors(d).forEach(e=>invalidatedActions.add(e)));
    node.unlinkedChildren.forEach(d=>deleteNodeAndAnyUnusedAncestors(d).forEach(ed=>invalidatedActions.add(e)));
    
    //deallocate memory for none

    node.cleanup = true; //schedule for cleanup in the retenet
    
    return Array.from(invalidatedActions);
};


/**
   Simplification of removing children of a token, but not the token itself
   @param token
   @function deleteDescendentsOfToken
*/
//utility function to delete all descendents without deleting the token
var deleteDescendentsOfToken = function(token){
    var invalidatedActions = new Set();
    while(token.children.length > 0){
        var curr = token.children.pop();
        deleteTokenAndDescendents(curr).forEach(d=>invalidatedActions.add(d));
    }
    token.proposedActions.forEach(d=>invalidatedActions.add(d));
    return Array.from(invalidatedActions);
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
    var invalidatedActions = new Set();
    //Recursive call:
    while(token.children.length > 0){
        var curr = token.children.pop();
        deleteTokenAndDescendents(curr).forEach(d=>invalidatedActions.add(d));
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
    token.proposedActions.forEach(d=>invalidatedActions.add(d));
    return Array.from(invalidatedActions);
};

/**
   @param token
   @function cleanupNCCResultsInToken
*/
var cleanupNCCResultsInToken = function(token){
    //NCCNODE
    //for all the nccResult tokens, delete them
    token.nccResults.forEach(function(nccR){
        //remove the nccR token from its linked wme
        if(nccR.wme){
            nccR.wme.tokens = _.reject(nccR.wme.tokens,d=>d.id === nccR.id);
        }
        if(nccR.parentToken){
            //remove the token from it's parent
            nccR.parentToken.children = _.reject(nccR.parentToken.children,d=>d.id === nccR.id);
        }
    });
    //clear the nccResults
    token.nccResults = [];
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
        token.parentToken.nccResults = _.reject(token.parentToken.nccResults,d=>d.id === token.id);
        token.owningNode.newResultBuffer = _.reject(token.owningNode.newResultBuffer,d=>d.id === token.id);
        return true;
    }else{
        return false;
    }
};

var deleteAlphaNode = function(alphaNode){
    "use strict";
    var invalidatedActions = new Set();
    if(alphaNode instanceof RDS.AlphaNode && alphaNode.children.length === 0 && alphaNode.outputMemory === null && alphaNode.passThrough === undefined){
        alphaNode.testField = null;
        alphaNode.testValue = null;
        alphaNode.operator = null;
        alphaNode.parent.children = _.reject(alphaNode.parent.children,d=>d.id === alphaNode.id);
        let oldParent = alphaNode.parent;
        alphaNode.parent = null;
        deleteAlphaNode(oldParent).forEach(d=>invalidatedActions.add(d));
        alphaNode.cleanup = true;
    }else if(alphaNode instanceof RDS.AlphaMemory){
        alphaNode.children.forEach(d=>deleteNodeAndAnyUnusedAncestors(d));
        alphaNode.unlinkedChildren.forEach(d=>deleteNodeAndAnyUnusedAncestors(d));
        alphaNode.children = [];
        alphaNode.unlinkedChildren = [];

        let itemIds = alphaNode.items.map(d=>d.id),
            itemWMEs = alphaNode.items.map(d=>d.wme);
        itemWMEs.forEach(function(d){
            d.alphaMemoryItems = _.reject(d.alphaMemoryItems,e=>itemIds.indexOf(e.id) > -1);
        });
        alphaNode.items = [];
        let oldParent = alphaNode.parent;
        oldParent.outputMemory = null;
        alphaNode.parent = null;
        deleteAlphaNode(oldParent).forEach(d=>invalidatedActions.add(d));
        alphaNode.cleanup = true;
    }    
    return Array.from(invalidatedActions);
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
