if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

define(['require','./ReteDataStructures','./ReteUtilities','./ReteActivations'],function(require,RDS,ReteUtil,ReteActivations){
    "use strict";
    //workaround for circular dependency
    
    
    /**
       @function removeAlphaMemoryItemsForWME
       @purpose to remove a wme from all alpha memories it is stored in
    */
    var removeAlphaMemoryItemsForWME = function(wme){
        //remove alpha memory items
        wme.alphaMemoryItems.forEach(function(item){
            //unlink the alphamemory from the item
            var index = item.alphaMemory.items.map(function(d){return d.id;}).indexOf(item.id);
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
            var index = jr.owner.negJoinResults.map(function(j){
                return j.id;
            }).indexOf(jr.id);
            if(index !== -1){
                jr.owner.negJoinResults.splice(index,1);
            }
            if(ReteActivations === undefined){
                ReteActivations = require('./ReteActivations');
            }
            ReteActivations.activateIfNegatedJRIsUnblocked(jr);
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
            var index = jr.wme.negJoinResults.map(function(d){return d.id;}).indexOf(jr.id);
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
            var index = token.owningNode.items.map(function(d){
                return d.id;
            }).indexOf(token.id);
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
            var index = token.wme.tokens.map(function(d){return d.id;}).indexOf(token.id);
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
            var index = token.parentToken.children.map(function(d){return d.id;}).indexOf(token.id);
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
            index = node.alphaMemory.children.map(function(d){ return d.id; }).indexOf(node.id);
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
            index = node.parent.children.map(function(d){
                return d.id;
            }).indexOf(node.id);
            if(index !== -1){                            
                node.parent.children.splice(index,1);
            }else{
                //check the unlinked children list:
                index = node.parent.unlinkedChildren.map(function(d){ return d.id;}).indexOf(node.id);
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
            if(ReteActivations === undefined){
                ReteActivations = require('./ReteActivations');
            }
            token.owningNode.nccNode.children.forEach(function(d){
                ReteActivations.leftActivate(d,token.parentToken);
            });
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
                    var index = nccR.wme.tokens.map(function(d){return d.id;}).indexOf(nccR.id);
                    if(index !== -1){
                        nccR.wme.tokens.splice(index,1);
                    }
                }
                if(nccR.parent){
                    //remove the token from it's parent
                    var nccRindex = nccR.parent.children.map(function(t){return t.id;}).indexOf(nccR.id);
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
            var index = token.parentToken.nccResults.map(function(d){return d.id;}).indexOf(token.id);
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
    };
    return moduleInterface;
});
