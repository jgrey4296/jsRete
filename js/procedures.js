/**
   Procedures for a rete net.
   Addition of rules, activation, etc
 */
if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

define(['./dataStructures'],function(DataStructures){

    //Trigger an alpha memory with a new wme to store
    var alphaMemoryActivation = function(alphaMem,wme){
        var newItem = new DataStructures.itemInAlphaMemory(wme,alphaMem);
        alphaMem.items.unshift(newItem);
        wme.alphaMemoryItems.unshift(newItem);

        for(var i in alphaMem.childNodes){
            var child = alphaMem.childNodes[i];
            rightActivate(child,wme);
        }
    };

    //Trigger a constant test with a new wme
    var alphaNodeActivation = function(alphaNode,wme){
        //test the wme using the constant test in the node

        //if true, activate children
    };
    
    //TODO:
    //Assert a wme into the network
    var addWME = function(wme,reteNet){
        //activate the root node of the reteNet
    };
    
    //trigger a beta memory to store a new token
    //bindings are from the join node, holding results of the NEW binding tests
    //old bindings are still in the token, the constructor of Token will combine the two
    //sets of bindings
    var betaMemoryLeftActivation = function(betaMemory,token,wme,bindings){
        var newToken = new DataStructures.Token(token,wme,betaMemory,bindings);
        betaMemory.items.unshift(newToken);
        for(var i in betaMemory.children){
            var child = betaMemory.children[i];
            leftActivate(child,newToken);
        }
    };

    //joinNode.tests are TestAtJoinNode objects
    //compare a token and wme, using defined bindings from a joinNode
    //returns false if they dont match, otherwise returns a dict of the new bindings
    //and their values
    var performJoinTests = function(joinNode,token,wme){
        var newBindings = {};
        //TODO:copy existing bindings from token
        for(var i in joinNode.tests){
            var test = joinNode.tests[i];
            var wmeValue = wme.data[test.field1];
            //If the binding exists
            if(token.bindings[test.field2]){
                var tokenValue = token.bindings[test.field2];
                if(wmeValue !== tokenValue){
                    //binding doesnt match, break.
                    return false;
                }else{
                    //continue, binding exists and matches
                }
            }else{//binding doesnt exist
                //create the binding
                newBindings[test.field2] = wmeValue;
            }            
        }
        return newBindings;
    };


    //Trigger a join node with a new token
    //will pull all wmes needed from the linked alphaMemory
    var joinNodeLeftActivation = function(node,token){
        //If necessary, relink or unlink the parent betamemory or alphamemory
        if(node.parent.items && node.parent.items.length > 0){
            relinkToAlphaMemory(node);
            if(node.alphaMemory.items.length === 0){
                node.parent.children = node.parent.children.filter(function(d){
                    return d.id !== node.id
                });
            }
        }
        //for each wme in the alpha memory, compare using join tests,
        //and pass on successful combinations to beta memory /negative node children to be combined into tokens
        for(var i in node.alphaMemory.items){
            var currWME = node.alphaMemory.items[i].wme;
            var joinTestResult = performJoinTests(node,token,currWME);
            if(joinTestResult !== false){
                for(var j in node.children){
                    var currChild = node.children[i];
                    leftActivate(currChild,token,currWME,joinTestResult);
                }
            }
        }
        
    };

    //Trigger a join node with a new wme
    //pulling all necessary tokens from the parent as needed
    var joinNodeRightActivation = function(node,wme){
        //relink or unlink as necessary
        if(node.alphaMemory.childNodes.length === 0){
            relinkToBetaMemory(node);
            if(node.parent.items.length === 0){
                node.alphaMemory.childNodes = node.alphaMemory.childNodes.filter(function(d){
                    return d.id !== node.id;
                });
            }
        }

        //For all tokens, compare to the new wme,
        //pass on successful combinations to betamemory/negative node
        for(var i in node.parent.items){
            var currToken = node.parent.items[i];
            var joinTestResult = performJoinTests(node,currToken,wme);
            if(joinTestResult !== false){
                for(var j in node.children){
                    var currNode = node.children[i];
                    leftActivate(currNode,currToken,wme,joinTestResult);
                }
            }
        }
    };

    //reconnect an unlinked join node to its alpha memory when there are
    //wmes in said alpha memory
    var relinkToAlphaMemory = function(node){
        var ancestor = node.ancestor;
        while(ancestor && ancestor.ancestor){
            ancestor = ancestor.ancestor;
        }
        if(ancestor){
            //TODO: insert node in node.amem.children
            //prior to ancestor
        }else{
            node.alphaMemory.children.push(node);
        }
    };

    //relink an unlinked join node to its betamemory when there are tokens
    //in said memory
    var relinkToBetaMemory = function(node){
        node.parent.children.unshift(node);
    }

    //Trigger a negative node from a new token
    //brings in bindings, creates a new token as necessary,
    //combining bindings to.
    var negativeNodeLeftActivation = function(node,token,wme,bindings){
        if(node.items.length === 0){
            relinkToalphaMemory(node);
        }
        var newToken = new DataStructures.Token(token,wme,node,bindings);
        node.items.unshift(newToken);

        for(var i in node.alphaMemory.items){
            var currWme = node.alphaMemory.items[i];
            var joinTestResult = performJoinTests(node,newToken,currWme);
            if(joinTestResult){
                var joinResult = new DataStructures.NegativeJoinResult(newToken,currWme);
                newToken.negJoinResults.unshift(joinResult);
                currWme.negJoinResults.unshift(joinResult);
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
        for(var i in node.items){
            var currToken = node.items[i];
            var joinTestResult = performJoinTests(node,currToken,wme);
            if(joinTestResult){
                if(currToken.negJoinResults.length === 0){
                    deleteDescendentsOfToken(currToken);
                }
                var negJoinResult = new DataStructures.NegativeJoinResult(currToken,wme);
                currToken.negJoinResults.unshift(negJoinResult);
                wme.negJoinResults.unshift(negJoinresult);
            }
        }
    };

    //from a new token, trigger the subnetwork?
    var nccNodeLeftActivation = function(nccNode,token,wme,bidings){
        //Create and store the incoming token from prior join node
        var newToken = new DataStructures.Token(token,wme,nccNode,bindings);
        nccNode.items.unshift(newToken);

        //if there are new results to process:
        while(nccNode.partner.newResultBuffer.length > 0){
            var newResult = nccNode.partner.newResultBuff.pop();
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
    var nccParterNodeLeftActivation = function(partner,token,wme,bindings){
        var nccNode = partner.nccNode;
        var newToken = new DataStructures.Token(token,wme,partner,bindings);
        
        var ownersToken = token;
        var ownersWme = wme;
        for(var i = 1; i < partner.numberOfConjuncts){
            ownersToken = ownersToken.parentToken;
            ownersWme = ownersWme.wme;
        }

        for(var i in nccNode.items){
            var potentialOwner = nccNode.items[i];
            //todo: this might be better to compare ids?
            if(potentialOwner.parent === ownersToken
               && potentialOwner.wme === ownersWme){
                potentialOwner.nccResults.unshift(newToken);
                newToken.parentToken = potentialOwner;
                deleteDescendentsOfToken(potentialOwner);
                return;
            }            
        }
        //else no owner:
        partner.newResultbuffer.unshift(newToken);        
    };

    //Remove/retract a wme from the network
    var removeWME = function(wme,reteNet){
        //For all alphaMemory items
        var i = wme.alphaMemoryItems.length;
        while(i !== 0){
            var currItem = wme.alphaMemoryItems[i];
            //remove from item.amem.items
            wme.alphaMemoryItems = wme.alphaMemoryItems.filter(function(d){
                return d.id !== currItem.id;
            });;
            //if the alphaMem has no items:
            if(currItem.alphaMemory.items.length === 0){
                //for each child
                for(var i in currItem.alphaMemory.children){
                    var currChild = currItem.alphaMemory.children[i];
                    if(currChild.type && currChild.type === "JoinNode"){
                        currChild.parent.children = currChild.parent.children.filter(function(d){
                            return d.id !== currChild.id;
                        });
                    }
                }
            }
            //delete item here
        }
        //For all tokens
        while(wme.tokens.length > 0){
            deleteTokenAndDescendents(wme.tokens[0]);
        }
        
        //for all negative join results
        var i = wme.negJoinResults.length;
        while(i !== 0){
            var currJoinResult = wme.negJoinResults[i];
            if(currJoinResult.owner.negJoinResults.length === 0){
                for(var j in currJoinResult.owner.node.children){
                    var currChild = currJoinResult.owner.node.children[j];
                    leftActivate(currChild,currJoinResult.owner);
                }
            }
            //delete join result
        }
    };

    //delete a token and all the tokens that rely on it
    var deleteTokenAndDescendents = function(token){
        while(token.children.length > 0){
            deleteTokenAndDescendents(token.children[0]);
        }
        if(token.node.type && token.node.type !== 'NCCPartnerNode'){
            token.node.items = token.node.items.filter(function(d){
                return d.id !== token.id;
            });
        }

        if(token.wme){
            token.wme.tokens = token.wme.tokens.filter(function(d){
                return d.id !== token.id;
            });
        }

        token.parentToken.children = token.parentToken.children.filter(function(d){
            return d.id !== token.id;
        });

        if(token.node.isMemoryNode){
            if(token.node.items.length === 0){
                for(var i in token.node.children){
                    var currChild = token.node.children[i];
                    currChild.alphaMemory.children = currChild.alphaMemory.children.filter(function(d){
                        return d.id !== currChild.id;
                    });
                }
            }
        }

        if(token.node.isNegativeNode){
            if(token.node.items.length > 0){
                token.node.alphaMemory.children = token.node.alphaMemory.children.filter(function(d){
                    return d.id !== token.id;
                });
            }
            for(var i in token.negJoinResults){
                var currNJR = token.negJoinResults[i];
                currJRN.wme.negJoinResults = currJRN.wme.negJoinResults.filter(function(d){
                    return d.id !== currNJR.id;
                });
            }
        }

        if(token.node.isAnNCCNode){
            for(var i in token.nccResults){
                var currToken = token.nccResults[i];
                currToken.wme.tokens = currToken.wme.tokens.filter(function(d){
                    return d.id !== currToken.id;
                });
                currToken.parentToken.children = currToken.parentToken.children.filter(function(d){
                    return d.id !== currToken.id;
                });
                //deallocate currToken
            }
        }

        if(token.node.isAnNCCPartnerNode){
            token.parentToken.nccResults = token.parentToken.nccResults.filter(function(d){
                return d.id !== token.id;
            });
            if(token.parentToken.nccResults.length === 0){
                for(var i in token.node.nccNode.children){
                    var currChild = token.node.nccNode.children[i];
                    leftActivate(currChild,token.parentToken);
                }
            }
        }
        //deallocate token        
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
    
    //added parameter of 'retenet' for hash table lookup
    var buildOrShareAlphaMemory = function(condition,reteNet){
        //see if there is an existing memory for this condition. if so, return existing alphamemory

        //else: create the alpha memory

        //run wmes in working memory against the alpha network

        return alphamemory
    };

    var buildOrShareBetaMemoryNode = function(node){
        //if theres an available beta memory to use,
        //return that

        //else: create a new beta memory
        //update it with matches
        //return new beta memory
    };

    //Return the bindings from a condition
    var getJoinTestsFromconditions(condition){

    }

    //walk up from a beta node until you find a node
    //connected to the specified alpha memory
    var findNearestAncestorWithSameAlphaMemory(node,alphaMemory){

    };


    var buildOrShareJoinNode = function(parent,alphaMemory,tests){
        //see if theres a join node to use already
        //return it

        //else: create a new join node
        //increment alphamemories reference count
        //if either parent memory is empty, unlink

        //return new join node
        
    };
    
    var buildOrShareNegativeNode = function(parent,alphaMemory,tests){
        //see if theres an existing negative node to use
        //return it

        //else: create negative node
        //increment alphamemory reference count
        //update with matches
        //unlink if it has no tokens
        //return new negative node
    };


    var buildOrShareNCCNodes = function(parent,conditions){
        //build a network for the conditions

        //find an existing NCCNode with partner to use
        //return it

        //else: build NCC and Partner nodes
        //update NCC
        //update partner
        
        
    };


    var buildOrShareNetworkForConditions = function(parent,conditions,earlierConditions){
        //for each condition
        //if condition is positive:
        //build betamemory
        //build alphamemory
        //build join node
        
        //if condition is negative:
        //build alpha memory
        //build negative node
                
        //if condition is NCC:
        //build ncc
        
        //return current node        
    };
    

    var addRule = function(conditions){
        //build network with a dummy node for the parent
        //build new action node
        //update node with matches
    }

    var updateNewNodeWithMatchesFromAbove = function(newNode){
        //if parent is:
        //a beta memory
        //left activate
        
        //a join node
        //left activate only the new node
        
        //a negative node
        //left activate
        
        //an ncc
        //left activate
    };


    var removeRule = function(rule){
        //delete from bottom up
    };

    var deleteNodeAndAnyUnusedAncestors = function(node){
        //if NCC, delete partner to

        //clean up tokens

        //clean up alphamemory

        //clean up parent
        

    };
    
});
