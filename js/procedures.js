
/**
   Procedures for a rete net.
   Addition of rules, activation, etc
*/
if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

define(['./dataStructures','./comparisonOperators'],function(DataStructures,ConstantTestOperators){

    
    //Trigger an alpha memory with a new wme to store
    var alphaMemoryActivation = function(alphaMem,wme){
        var newItem = new DataStructures.AlphaMemoryItem(wme,alphaMem);
        alphaMem.items.unshift(newItem);
        wme.alphaMemoryItems.unshift(newItem);

        for(var i in alphaMem.children){
            var child = alphaMem.children[i];
            rightActivate(child,wme);
        }
    };

    //Trigger a constant test with a new wme
    var constantTestNodeActivation = function(alphaNode,wme){
        //test the wme using the constant test in the node
        var testResult = false;
        if(alphaNode.passThrough){
            testResult = true;
        }else{
            var wmeFieldValue = wme.data[alphaNode.testField];
            var value = alphaNode.testValue;
            var operator = alphaNode.operator;
            if(ConstantTestOperators[operator]){
                testResult = ConstantTestOperators[operator](wmeFieldValue,value);
            }
        }
        if(testResult){
            for(var i in alphaNode.children){
                var child = alphaNode.children[i];
                alphaNodeActivation(child,wme);
            }
            if(alphaNode.outputMemory){
                alphaNodeActivation(alphaNode.outputMemory,wme);
            }
        }
        return testResult;
    };

    //Switchable activation function for alpha network stuff
    var alphaNodeActivation = function(alphaNode,wme){
        if(alphaNode.isAlphaMemory){
            alphaMemoryActivation(alphaNode,wme);
        }else if(alphaNode.isConstantTestNode){
            return constantTestNodeActivation(alphaNode,wme);
        }else{
            throw new Error("Unrecognised node:",alphaNode);
        }
    }

    //Assert a wme into the network
    var addWME = function(wmeData,reteNet){

        //activate the root node of the reteNet
        var wme = new DataStructures.WME(wmeData);
        reteNet.allWMEs[wme.id] = wme;
        alphaNodeActivation(reteNet.rootAlpha,wme);
        return wme.id;
    };
    
    //trigger a beta memory to store a new token
    //bindings are from the join node, holding results of the NEW binding tests
    //old bindings are still in the token, the constructor of Token will combine the two
    //sets of bindings
    var betaMemoryActivation = function(betaMemory,token){
        var newToken = token;
        betaMemory.items.unshift(newToken);
        for(var i in betaMemory.children){
            var child = betaMemory.children[i];
            leftActivate(child,newToken);
        }
    };

    //compare a token and wme, using defined
    //bindings from a joinNode
    //returns false if they dont match,
    //otherwise returns a dict of the new bindings
    //and their values
    var performJoinTests = function(joinNode,token,wme){
        var newBindings = {};
        //Populate with current bindings from token
        for(var i in token.bindings){
            newBindings[i] = token.bindings[i];
        }

        //For all the bindings in this join node:
        for(var i in joinNode.tests){
            //get the bind test
            var test = joinNode.tests[i];
            
            //get the wme value it references
            var wmeValue = wme.data[test[1]];
            if(wmeValue === undefined){
                continue;
            }
            //If the binding exists in the token
            if(newBindings[test[0]]){
                if(newBindings[test[0]] === wmeValue){
                    continue;
                }else{
                    return false; //not the same, break right out
                } 
            }else{
                newBindings[test[0]] = wmeValue;
            }
        }
        return newBindings;
    };


    //Trigger a join node with a new token
    //will pull all wmes needed from the linked alphaMemory
    var joinNodeLeftActivation = function(node,token){
        //If necessary, relink or unlink the
        //parent betamemory or alphamemory
        if(node.parent.items && node.parent.items.length > 0){
            relinkToAlphaMemory(node);
            if(node.alphaMemory.items.length === 0){
                //unlink beta memory if alphamemory is empty
                var index = node.parent.children.map(function(d){return d.id;}).indexOf(node.id);
                var unlinked = node.parent.children.splice(index,1);
                node.parent.unlinkedChildren.push(unlinked[0]);
            }
        }
        //for each wme in the alpha memory,
        //compare using join tests,
        //and pass on successful combinations
        //to beta memory /negative node children
        //to be combined into tokens
        for(var i in node.alphaMemory.items){
            var currWME = node.alphaMemory.items[i].wme;
            var joinTestResult = performJoinTests(node,token,currWME);
            if(joinTestResult !== false){
                for(var j in node.children){
                    var currChild = node.children[i];
                    leftActivate(currChild,token,currWME,joinTestResult);
                }//end of loop activating all children
            }
        }//end of looping all wmes in alphamemory
    };

    //Trigger a join node with a new wme
    //pulling all necessary tokens from the parent as needed
    var joinNodeRightActivation = function(node,wme){
        //relink or unlink as necessary
        if(node.alphaMemory.items.length === 1){
            relinkToBetaMemory(node);
            if(node.parent.items.length === 0){
                var index = node.alphaMemory.children.map(function(d){ return d.id; }).indexOf(node.id);
                var unlinked = node.alphaMemory.children.splice(index,1);
                node.alphaMemory.unlinkedChildren.push(unlinked[0]);
            }
        }

        //For all tokens, compare to the new wme,
        //pass on successful combinations to betamemory/negative node
        for(var i in node.parent.items){
            var currToken = node.parent.items[i];
            //console.log("--------\nComparing: ",currToken.bindings,"\n To: ",wme.data,"\n using: ",node.tests);
            var joinTestResult = performJoinTests(node,currToken,wme);
            if(joinTestResult !== false){
                for(var j in node.children){
                    var currNode = node.children[j];
                    leftActivate(currNode,currToken,wme,joinTestResult);
                }
            }
        }
    };

    //reconnect an unlinked join node to its alpha memory when there are
    //wmes in said alpha memory
    var relinkToAlphaMemory = function(node){
        if(node.isJoinNode === undefined && node.isNegativeNode === undefined){
            throw new Error("trying to relink alpha on something other than a join node or negative node");
        }
        
        var ancestor = node.nearestAncestor;
        var indices = node.alphaMemory.children.map(function(d){ return d.id; });

        //While the ancestor is a child of the alpha memory
        while(ancestor && indices.indexOf(ancestor.id) === -1){
            //go up an ancestor if it is unlinked to
            ancestor = findNearestAncestorWithAlphaMemory(ancestor,node.alphaMemory.id);
        }
        
        //When finished, if the ancestor exists:
        if(ancestor !== null){
            var index = node.alphaMemory.children.map(function(d){ return d.id; }).indexOf(ancestor.id);
            //add the node into the child list in front of the ancestor
            node.alphaMemory.children.splice(index,0,node);
        }else{
            //otherwise just add at the end
            node.alphaMemory.children.push(node);
        }

        //remove from the unlinkedChildren Field
        var index = node.alphaMemory.unlinkedChildren.map(function(d){ return d.id;}).indexOf(node.id);
        node.alphaMemory.unlinkedChildren.splice(index,1);
        
        
    };

    //relink an unlinked join node to its betamemory when there are tokens
    //in said memory
    var relinkToBetaMemory = function(node){
        //remove from the unlinked children list
        //and add it into the children
        var index = node.parent.unlinkedChildren.map(function(d){return d.id; }).indexOf(node.id);
        if(index > -1){
            node.parent.unlinkedChildren.splice(index,1);
            node.parent.children.unshift(node);
        }
    };

    //Trigger a negative node from a new token
    //brings in bindings, creates a new token as necessary,
    //combining bindings to.
    var negativeNodeLeftActivation = function(node,token){
        if(node.items.length === 1){
            relinkToAlphaMemory(node);
        }
        var newToken = token;
        node.items.unshift(newToken);

        for(var i in node.alphaMemory.items){
            var currWme = node.alphaMemory.items[i].wme;
            var joinTestResult = performJoinTests(node,newToken,currWme);
            if(joinTestResult){
                //adds itself to the token and
                //wme as necessary to block the token
                var joinResult = new DataStructures.NegativeJoinResult(newToken,currWme);
            }
        }

        //if no wmes block the token, pass it on down the network
        if(newToken.negJoinResults.length === 0){
            for(var i in node.children){
                var currChild = node.children[i];
                leftActivate(currChild,newToken);
            }
        }
        
    };

    //trigger a negative node from a new wme,
    //getting all tokens stored, comparing to the wme.
    //any that the wme blocks, gets an additional negative Join result
    //any that don't get blocked should already have been activated
    var negativeNodeRightActivation = function(node,wme){
        //todo: this could be a map
        
        for(var i in node.items){
            var currToken = node.items[i];
            var joinTestResult = performJoinTests(node,currToken,wme);
            if(joinTestResult){
                if(currToken.negJoinResults.length === 0){
                    deleteDescendentsOfToken(currToken);
                }
                //Adds itself to the currToken and wme as
                //necessary
                var negJoinResult = new DataStructures.NegativeJoinResult(currToken,wme);
            }
        }
    };

    //from a new token, trigger the subnetwork?
    var nccNodeLeftActivation = function(nccNode,token){
        //Create and store the incoming token from prior join node
        if(nccNode.isAnNCCNode === undefined){
            throw new Error("nccNodeLeftActivation should be on an NCCNode");
        }
        if(token.isToken === undefined){
            throw new Error("nccNodeLeftActivation should be on a token");
        }
        var newToken = token
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
            for(var i in nccNode.children){
                var currChild = nccNode.children[i];
                leftActivate(currChild,newToken);
            }
        }
    };

    //the nccPartnerNode is activated by a new token from the subnetwork
    //figure out who owns this new token from the main (positive) network
    var nccPartnerNodeLeftActivation = function(partner,token){
        //the partner's ncc
        var nccNode = partner.nccNode;
        //the token created in left activate, with partner as owner
        var newToken = token;

        //the prior token and wme
        var ownersToken = token.parentToken;
        var ownersWme = token.wme;
        for(var i = 1; i < partner.numberOfConjuncts; i++){
            //go up the owner chain
            ownersToken = ownersToken.parentToken;
            ownersWme = ownersWme.wme;
        }
        var possible_tokens = [];
        if(nccNode){
        possible_tokens = nccNode.items.map(function(d){
            if(d.parentToken.id === ownersToken.id
               && d.wme.id === ownersWme.id){
                return d;
            }}).filter(function(d){if(d) return true;});
        }
        if(possible_tokens.length > 0){
            //the necessary owner exists in the nccNode,
            //so update it:
            possible_tokens[0].nccResults.unshift(newToken);
            newToken.parent = possible_tokens[0];
            deleteDescendentsOfToken(possible_tokens[0]);
        }else{        
            //else no owner:
            partner.newResultBuffer.unshift(newToken);
        }
    };

    //Remove/retract a wme from the network
    //has three main sections:
    //alphaMemoryItem Cleanup, token Cleanup,
    //and negJoinResult Cleanup
    var removeWME = function(wme,reteNet){

        removeAlphaMemoryItemsForWME(wme);
        deleteAllTokensForWME(wme);
        deleteAllNegJoinResultsForWME(wme);
    };

    var removeAlphaMemoryItemsForWME = function(wme){
        //remove alpha memory items
        wme.alphaMemoryItems.forEach(function(item){
            //unlink the alphamemory from the item
            var index = item.alphaMemory.items.map(function(d){return d.id;}).indexOf(item.id);
            if(index !== -1){ item.alphaMemory.items.splice(index,1);}
            //unlink the alphaMemory itself if it is now empty
            //will unlink if am.items.length === 0
            unlinkAlphaMemory(item.alphaMemory);
            //clear the item's links
            item.alphaMemory = undefined;
            item.wme = undefined;
        });

        //completely clear am items:
        wme.alphaMemoryItems = [];

    };

    var deleteAllTokensForWME = function(wme){
        //For all tokens
        while(wme.tokens.length > 0){
            deleteTokenAndDescendents(wme.tokens[0]);
        }
    };

    var deleteAllNegJoinResultsForWME = function(wme){
        //unlink the negative Join results in the owning token
        wme.negJoinResults.forEach(function(jr){
            var index = jr.owner.negJoinResults.map(function(j){
                return j.id;
            }).indexOf(jr.id);
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
    
    var unlinkAlphaMemory = function(alphaMemory){
        //if the alphaMem has no items: UNLINK
        if(alphaMemory.items.length === 0){
            alphaMemory.children.forEach(function(amChild){
                if(amChild.isJoinNode){
                    var index = amChild.parent.children.map(function(parentChild){return parentChild.id;}).indexOf(amChild.id);
                    //splice out
                    var removed = amChild.parent.children.splice(index,1);
                    //and store
                    amChild.parent.unlinkedChildren.push(removed[0]);
                }
            });
        }
    };

    var activateIfNegatedJRIsUnblocked = function(nJR){
        var currJoinResult = nJR;
        //if the negation clears, activate it
        if(currJoinResult.owner.negJoinResults.length === 0){
            currJoinResult.owner.owningNode.children.forEach(function(child){
                //activate the token for all its owners children
                leftActivate(child,currJoinResult.owner);
            });
        }
    };
    
    //delete a token and all the tokens that rely on it
    //a bit of a frankenstein. Deletes the token,
    //deletes descendents, but also sets and cleans up 
    //left unlinking of join nodes, AND
    //activates NCC's that are no longer blocked
    var deleteTokenAndDescendents = function(token){
        //Recursive call:
        while(token.children.length > 0){
            deleteTokenAndDescendents(token.children[0]);
        }

        //Base Cases:
        //remove memory items
        removeTokenFromNode(token);
        removeTokenFromWME(token);
        removeTokenFromParentToken(token);
        
        ifEmptyBetaMemoryUnlink(token.owningNode)
        ifEmptyNegNodeUnlink(token.owningNode,token.id);

        removeNegJoinResultsForToken(token);

        cleanupNCCResultsInToken(token);
        cleanupNCCPartnerOwnedToken(token);
        ifNCCPartnerNodeActivateIfAppropriate(token);
        
        //dealloc token:
        //console.log("Dealloc'd Token:",token);
    };
    //finish of delete token.


    //TOKEN DELETION HELPER FUNCTIONS
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
    
     var removeTokenFromWME = function(token){
        //remove the token from the wme it is based on
         if(token.wme && token.wme.tokens){
             var index = token.wme.tokens.map(function(d){return d.id;}).indexOf(token.id);
             if(index !== -1){
                 token.wme.tokens.splice(index,1);
             }
        }
    };

    var removeTokenFromParentToken = function(token){
        //Remove the token from it's parent's child list
        if(token && token.parentToken){
            var index = token.parentToken.children.map(function(d){return d.id;}).indexOf(token.id);
            if(index !== -1){
                token.parentToken.children.splice(index,1);
            }
        }
    };
    
    //Now Essentially switch on: BetaMemory, NegativeNode,
    //NCCNode, and NCCPartnerNode
    
    var ifEmptyBetaMemoryUnlink = function(node){
        //BETAMEMORY
        if(node && node.isBetaMemory){
            //and that betaMemory has no other items
            if(node.items.length === 0){
                //for all the node's children
                node.children.forEach(function(jn){
                    if(jn.isJoinNode === undefined){return;}
                    var index = jn.alphaMemory.children.map(function(d){return d.id;}).indexOf(jn.id);
                    if(index !== -1){
                        var removed = jn.alphaMemory.children.splice(index,1);
                        //push it in the unlinked children list
                        jn.alphaMemory.unlinkedChildren.push(removed[0]);
                    }
                });
            }
            return true;
        }else{
            return false;
        }        
    };

    var ifEmptyNegNodeUnlink = function(node){
        if(node && node.isNegativeNode){
            //with elements
            if(node.items.length === 0){
                //unlink alpha memory
                var index = node.alphaMemory.children.map(function(d){return d.id;}).indexOf(node.id);
                var removed = node.alphaMemory.children.splice(index,1);
                node.alphaMemory.unlinkedChildren.push(removed[0]);
            }
        }
    };


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
                    index = nccR.parent.children.map(function(t){return t.id;}).indexOf(nccR.id);
                    if(index !== -1);{
                        nccR.parent.children.splice(index,1);
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

    var ifNCCPartnerNodeActivateIfAppropriate = function(token){
        if(token && token.owningNode
           && token.owningNode.isAnNCCPartnerNode){
            if(token.parentToken.nccResults.length === 0){
                token.owningNode.nccNode.children.forEach(function(d){
                    leftActivate(d,token.parentToken);
                });
                return true;
            }
        }
        return false;
    };


    //utility function to delete all descendents without deleting the token
    var deleteDescendentsOfToken = function(token){
        while(token.children.length > 0){
            deleteTokenAndDescendents(token.children[0]);
        }
    };

    //--------------------
    // Creation of Network:
    //--------------------
    
    //taking an alpha node and a ConstantTest
    var compareConstantNodeToTest = function(node,constantTest){
        if(!constantTest.isConstantTest){
            throw new Error("constantTest should be a ConstantTest Object");
        }
        if(!node.isConstantTestNode){
            throw new Error("Node should be an alpha/constant test node");
        }
        if(node.testField !== constantTest['field']
           || node.testValue !== constantTest['value']){
            return false;
        }
        if(node.operator !== constantTest['operator']){
            return false;
        }
        return true;
    };
    
    var buildOrShareConstantTestNode = function(parent,constantTest){
        for(var i in parent.children){
            var node = parent.children[i];
            if(compareConstantNodeToTest(node,constantTest)){
                return node;
            }
        }
        var newAlphaNode = new DataStructures.AlphaNode(parent,constantTest);
        return newAlphaNode;
    }
    
    
    //added retenet parameter
    //Reminder: Rule{Conditions[]},
    //          Condition{constantTests:[],bindings:[[]]}
    var buildOrShareAlphaMemory = function(condition,root){
        var currentNode = root;
        for(var i in condition.constantTests){
            var constantTest = condition.constantTests[i];
            currentNode = buildOrShareConstantTestNode(currentNode,constantTest);
        }
        //see if there is an existing memory for this condition.
        //if so, return existing alphamemory
        if(currentNode.outputMemory !== undefined){
            return currentNode.outputMemory;
        }
        //else: create the alpha memory
        //ctor will update the current node's outputMemory field
        var newAlphaMemory = new DataStructures.AlphaMemory(currentNode);
        //run wmes in working memory against the alpha network
        return newAlphaMemory;
    };
    
    var buildOrShareBetaMemoryNode = function(parent){
        //if passed in the dummy top node, return it:
        if(parent.isBetaMemory === true){
            return parent;
        }
        
        
        
        //if theres an available beta memory to use,
        //return that
        for(var i in parent.children){
            var child = parent.children[i];
            if(child.isBetaMemory){
                return child;
            }
        }
        //else: create a new beta memory
        //ctor should update  parent's children
        var newBetaMemory = new DataStructures.BetaMemory(parent);
        //update it with matches
        updateNewNodeWithMatchesFromAbove(newBetaMemory);
        //return new beta memory
        return newBetaMemory;
    };
    
    
    //walk up from a join node until you find a node
    //connected to the specified alpha memory
    var findNearestAncestorWithAlphaMemory = function(node,alphaMemory){
        //base conditions:
        if(node.dummy){ return null;}
        if(node.isJoinNode || node.isNegativeNode){
            if(node.alphaMemory.id === alphaMemory.id){
                return node;
            }
        }
        //switch recursion into the partner clause
        if(node.isAnNCCNode){
            return findNearestAncestorWithAlphaMemory(node.partner.parent,alphaMemory);
        }
        //recurse:
        return findNearestAncestorWithAlphaMemory(node.parent,alphaMemory);        
    };
    
    var compareJoinTests = function(firstTestSet,secondTestSet){
        if(firstTestSet.length === 0 && secondTestSet.length === 0){
            return true;
        }
        var i = firstTestSet.length -1;
        var j = secondTestSet.length -1;
        while(i >= 0 && j >= 0){
            var ts1 = firstTestSet[i];
            var ts2 = secondTestSet[j];
            //console.log("comparing",i,j,"|||",firstTestSet[i][0],secondTestSet[j][0],"|||",firstTestSet[i][1],secondTestSet[j][1]);
            if(firstTestSet[i][0] === secondTestSet[j][0]){
                if(firstTestSet[i][1] === secondTestSet[j][1]){
                    i--; j--;
                }else{
                    return false;
                }
            }else if(firstTestSet[i][0] > secondTestSet[j][0]){
                i--;
            }else if(firstTestSet[i][0] < secondTestSet[j][0]){
                j--;
            }else{
                return false;
            }
        }
        if(i === j && i === -1){
            return true;
        }
        return false;
    };
    
    
    var buildOrShareJoinNode = function(parent,alphaMemory,tests){
        //see if theres a join node to use already
        var allChildren = parent.children.concat(parent.unlinkedChildren);
        for(var i in allChildren){
            var child = allChildren[i];
            if(child.isJoinNode && child.alphaMemory.id === alphaMemory.id && compareJoinTests(child.tests,tests)){
                //return it
                return child;
            }
        }
        //else: create a new join node
        //increment alphamemories reference count in the constructor
        var newJoinNode = new DataStructures.JoinNode(parent,alphaMemory,tests);
        //set the nearest ancestor
        newJoinNode.nearestAncestor = findNearestAncestorWithAlphaMemory(parent,alphaMemory);

        //if either parent memory is empty, unlink
        if(parent.items.length === 0){
            //BETA IS EMPTY: UNLINK RIGHT
            var index = alphaMemory.children.map(function(d){ return d.id; }).indexOf(newJoinNode.id);
            var removed = alphaMemory.children.splice(index,1);
            alphaMemory.unlinkedChildren.unshift(removed[0]);
        }else if(alphaMemory.items.length === 0){
            //ALPHA IS EMPTY: UNLINK LEFT
            var index = parent.children.map(function(d){
                return d.id;
            }).indexOf(newJoinNode.id);
            var removed = parent.children.splice(index,1);
            parent.unlinkedChildren.unshift(removed[0]);
        }
        //return new join node
        return newJoinNode;
    };
    
    var buildOrShareNegativeNode = function(parent,alphaMemory,tests){
        //see if theres an existing negative node to use
        for(var i in parent.children){
            var child = parent.children[i];
            if(child.isNegativeNode
               && child.alphaMemory.id === alphaMemory.id
               && compareJoinTests(child.tests,tests)){
                return child;
            }
        }
        var newNegativeNode = new DataStructures.NegativeNode(parent,alphaMemory,tests);
        newNegativeNode.nearestAncestor = findNearestAncestorWithAlphaMemory(parent,alphaMemory);
        //update with matches
        updateNewNodeWithMatchesFromAbove(newNegativeNode);
        //unlink if it has no tokens
        if(newNegativeNode.items.length === 0){
            var index = alphaMemory.children.map(function(d){
                return d.id;
            }).indexOf(newNegativeNode.id);
            var removed = alphaMemory.children.splice(index,1);
            alphaMemory.unlinkedChildren.push(removed[0]);
        }
        //return new negative node
        return newNegativeNode
    };


    var buildOrShareNCCNodes = function(parent,condition,rootAlpha){
        if(condition.isNCCCondition === undefined){
            throw new Error("BuildOrShareNCCNodes only takes NCCCondition");
        }
        //build a network for the conditions
        var bottomOfSubNetwork = buildOrShareNetworkForConditions(parent,condition.conditions,rootAlpha);
        //find an existing NCCNode with partner to use
        for(var i in parent.children){
            var child = parent.children[i];
            if(child.isAnNCCNode && child.partner.parent.id === bottomOfSubNetwork.id){
                return child;
            }
        }
        //else: build NCC and Partner nodes
        var newNCC = new DataStructures.NCCNode(parent);
        var newNCCPartner = new DataStructures.NCCPartnerNode(bottomOfSubNetwork,condition.conditions.length);
        newNCC.partner = newNCCPartner;
        newNCCPartner.nccNode = newNCC;
        //update NCC
        updateNewNodeWithMatchesFromAbove(newNCC);
        //update partner
        updateNewNodeWithMatchesFromAbove(newNCCPartner);
        return newNCC;
    };


    var buildOrShareNetworkForConditions = function(parent,conditions,rootAlpha){
        var currentNode = parent;
        //for each condition
        for(var i in conditions){
            var condition = conditions[i];
            if(condition.isPositive){
                currentNode = buildOrShareBetaMemoryNode(currentNode);
                var tests = condition.bindings;
                var alphaMemory = buildOrShareAlphaMemory(condition,rootAlpha);
                currentNode = buildOrShareJoinNode(currentNode,alphaMemory,condition.bindings);
            }else if(condition.isNegative){
                var tests = condition.bindings;
                var alphaMemory = buildOrShareAlphaMemory(condition,rootAlpha);
                currentNode = buildOrShareNegativeNode(currentNode,alphaMemory,tests);
            }else if(condition.isNCCCondition){
                currentNode = buildOrShareNCCNodes(currentNode,condition,rootAlpha);
            }else{
                console.error("Problematic Condition:",condition);
                throw new Error("Unrecognised condition type");
            }
        }
        //return current node
        var finalBetaMemory = buildOrShareBetaMemoryNode(currentNode);
        return finalBetaMemory;
    };

    var activateActionNode = function(actionNode,token){
        actionNode.action.call(token);
    };

    
    var addRule = function(rule,reteNet){
        //build network with a dummy node for the parent
        var currentNode = buildOrShareNetworkForConditions(reteNet.dummyBetaMemory,rule.conditions,reteNet.rootAlpha);
        //build new action node
        var actionNode = new DataStructures.ActionNode(currentNode,rule.action,rule.name);
        //update node with matches
        reteNet.actions[actionNode.name] = actionNode;
        return actionNode;
    }

    //Utility leftActivation function to call
    //whichever specific type is needed
    var leftActivate = function(node,token,wme,joinTestResults){
        //Construct a new token if supplied the correct
        //parameters
        if(joinTestResults && wme){
            token = new DataStructures.Token(token,wme,node,joinTestResults);
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

    var rightActivate = function(node,wme){
        if(node.isJoinNode){
            joinNodeRightActivation(node,wme);
        }else if(node.isNegativeNode){
            negativeNodeRightActivation(node,wme);
        }else{
            throw new Error("Tried to rightActivate Unrecognised node");
        }
    };

    //essentially a 4 state switch:
    //betaMemory, joinNode, negativeNode, NCC
    var updateNewNodeWithMatchesFromAbove = function(newNode){
        var parent = newNode.parent;
        if(parent.isBetaMemory){
            for(var i in parent.items){
                leftActivate(newNode,parent.items[i]);
            }
        }else if(parent.isJoinNode){
            var savedChildren = parent.children;
            parent.children = [newNode];
            for(var i in parent.alphaMemory.items){
                var item = parent.alphaMemory.items[i];
                rightActivate(parent,item.wme);
            }
            parent.children = savedChildren;
        }else if(parent.isNegativeNode){
            for(var i in parent.items){
                var token = parent.items[i];
                if(token.negJoinResults.length === 0){
                    leftActivate(newNode,token);
                }
            }
        }else if(parent.isAnNCCNode){
            for(var i in parent.items){
                var token = parent.items[i];
                if(token.nccResults.length === 0){
                    leftActivate(newNode,token);
                }
            }
        }
    };
    

    var removeRule = function(actionNode){
        //delete from bottom up
        deleteNodeAndAnyUnusedAncestors(actionNode);
    };

    /*
      Do a number of things:
      clean up tokens stored in a node
      remove any reference to the node from a connected alpha
      remove any reference to the node from a parent

      +: call recursively on any parent that has no children
     */
    var deleteNodeAndAnyUnusedAncestors = function(node){
        //if NCC, delete partner to
        if(node.isAnNCCNode){
            deleteNodeAndAnyUnusedAncestors(node.partner);
        }
        
        //clean up tokens
        if(node.isBetaMemory){
            while(node.items.length > 0){
                deleteTokenAndDescendents(node.items[0]);
            }
        }
        if(node.isAnNCCPartnerNode){
            while(node.newResultBuffer.length > 0){
                deleteTokenAndDescendents(node.items[0]);
            }
        }

        //clean up any associated alphamemory
        if(node.isJoinNode || node.isNegativeNode && node.alphaMemory){
            var index = node.alphaMemory.children.map(function(d){ return d.id; }).indexOf(node.id);
            if(index > -1){
                node.alphaMemory.children.splice(index,1);
                node.alphaMemory.referenceCount--;
            }
            if(node.alphaMemory.referenceCount === 0){
                //TODO: WRITE THIS:
                //deleteAlphaMemory(node.alphaMemory);
            }
        }
        
        //remove the node from its parent
        if(node.parent){
            //check the child list:
            var index = node.parent.children.map(function(d){
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
            deleteNodeAndAnyUnusedAncestors(node.parent);
        }
        //deallocate memory for none
    };


    var interface = {
        "addRule"   : addRule,
        "removeRule": removeRule,
        "addWME"    : addWME,
        "removeWME" : removeWME,

        //removal helper functions:
        "removeAlphaMemoryItemsForWME":removeAlphaMemoryItemsForWME,
        "deleteAllTokensForWME":deleteAllTokensForWME,
        "deleteAllNegJoinResultsForWME":deleteAllNegJoinResultsForWME,

        "unlinkAlphaMemory":unlinkAlphaMemory,
        "activateIfNegatedJRIsUnblocked" : activateIfNegatedJRIsUnblocked,

        "removeTokenFromNode":removeTokenFromNode,
        "removeTokenFromWME":removeTokenFromWME,
        "removeTokenFromParentToken":removeTokenFromParentToken,
        "ifEmptyBetaMemoryUnlink":ifEmptyBetaMemoryUnlink,
        "ifEmptyNegNodeUnlink":ifEmptyNegNodeUnlink,
        "removeNegJoinResultsForToken":removeNegJoinResultsForToken,

        "cleanupNCCResultsInToken": cleanupNCCResultsInToken,
        "cleanupNCCPartnerOwnedToken":cleanupNCCPartnerOwnedToken,
        "ifNCCPartnerNodeActivateIfAppropriate":ifNCCPartnerNodeActivateIfAppropriate,        

        "deleteTokenAndDescendents":deleteTokenAndDescendents,
        "deleteDescendentsOfToken":deleteDescendentsOfToken,
        "deleteNodeAndAnyUnusedAncestors":deleteNodeAndAnyUnusedAncestors,
        
        //Comparisons:
        "compareConstantNodeToTest"     : compareConstantNodeToTest,
        "compareJoinTests"      : compareJoinTests,
        "performJoinTests"      : performJoinTests,
        //Activation functions::
        "constantTestNodeActivation" : constantTestNodeActivation,
        "alphaMemoryActivation" : alphaMemoryActivation,
        "alphaNodeActivation"   : alphaNodeActivation,
        "activateActionNode"    : activateActionNode,
        "betaMemoryActivation":betaMemoryActivation,
        "joinNodeLeftActivation":joinNodeLeftActivation,
        "joinNodeRightActivation":joinNodeRightActivation,
        "negativeNodeLeftActivation":negativeNodeLeftActivation,
        "negativeNodeRightActivation":negativeNodeRightActivation,
        "nccNodeLeftActivation" : nccNodeLeftActivation,
        "nccPartnerNodeLeftActivation" : nccPartnerNodeLeftActivation,
        "leftActivate"          : leftActivate,
        "rightActivate"         : rightActivate,
        //Build Functions::
        "buildOrShareConstantTestNode":buildOrShareConstantTestNode,
        "buildOrShareAlphaMemory" : buildOrShareAlphaMemory,
        "buildOrShareBetaMemoryNode"  : buildOrShareBetaMemoryNode,
        "buildOrShareJoinNode"        : buildOrShareJoinNode,
        "buildOrShareNegativeNode"    : buildOrShareNegativeNode,
        "buildOrShareNetworkForConditions": buildOrShareNetworkForConditions,
        "buildOrShareNCCNodes"        : buildOrShareNCCNodes,
        //Other:
        "updateNewNodeWithMatchesFromAbove" : updateNewNodeWithMatchesFromAbove,
        "findNearestAncestorWithAlphaMemory":findNearestAncestorWithAlphaMemory,
        "relinkToAlphaMemory" : relinkToAlphaMemory,
        "relinkToBetaMemory"  : relinkToBetaMemory,
    };

    return interface;
});
