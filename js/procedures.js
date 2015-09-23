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
        console.log("Activating alpha memory: ",alphaMem.id);
        var newItem = new DataStructures.ItemInAlphaMemory(wme,alphaMem);
        alphaMem.items.unshift(newItem);
        wme.alphaMemoryItems.unshift(newItem);

        for(var i in alphaMem.children){
            var child = alphaMem.children[i];
            rightActivate(child,wme);
        }
    };

    //Trigger a constant test with a new wme
    var constantTestNodeActivation = function(alphaNode,wme){
        console.log("constant test node activating: ",alphaNode.id, wme.id);
        //test the wme using the constant test in the node
        var wmeFieldValue = wme.data[alphaNode.testField];
        var value = alphaNode.testValue;
        var testResult = false;
        if(wmeFieldValue && value && alphaNode.operator){
        //TODO: add more operators:
            console.log("Operator:",alphaNode);
            if(alphaNode.operator === 'EQ'){
                console.log("Comparing:",wmeFieldValue,value);
                testResult = (wmeFieldValue === value);
            }
        }else{
            //no test, pass it on through
            console.log("Passing wme through empty test node");
            testResult = true;
        }
        
        if(testResult){
            console.log("Alpha node activating children",alphaNode.children);
            for(var i in alphaNode.children){
                var child = alphaNode.children[i];
                alphaNodeActivation(child,wme);
            }
        }
    };

    //Switchable activation function for alpha network stuff
    var alphaNodeActivation = function(alphaNode,wme){
        console.log("alpha node activating:",alphaNode.id," on wme: ",wme);
        if(alphaNode.isAlphaMemory){
            alphaMemoryActivation(alphaNode,wme);
        }else if(alphaNode.isConstantTestNode){
            constantTestNodeActivation(alphaNode,wme);
        }else{
            throw new Error("Unrecognised node:",alphaNode);
        }
    }

    //Assert a wme into the network
    var addWME = function(wmeData,reteNet){

        //activate the root node of the reteNet
        var wme = new DataStructures.WME(wmeData);
        console.log("Adding wme: ",wme.id);
        reteNet.allWMEs.push(wme);
        alphaNodeActivation(reteNet.rootAlpha,wme);
        return wme.id;
    };
    
    //trigger a beta memory to store a new token
    //bindings are from the join node, holding results of the NEW binding tests
    //old bindings are still in the token, the constructor of Token will combine the two
    //sets of bindings
    var betaMemoryLeftActivation = function(betaMemory,token){
        console.log("Activating Beta Memory Left:",betaMemory.id);
        var newToken = token;
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
        for(var i in token.bindings){
            newBindings[i] = token.bindings[i];
        }
        
        for(var i in joinNode.tests){
            var test = joinNode.tests[i];
            var wmeValue = wme.data[test[1]];
            //If the binding exists
            if(token.bindings[test[0]]){
                var tokenValue = token.bindings[test[0]];
                //TODO:Add Operators here
                if(wmeValue !== tokenValue){
                    //binding doesnt match, break.
                    console.log("binding testing:",wmeValue,tokenValue,"has failed");
                    return false;
                }else{
                    //continue, binding exists and matches
                    console.log("binding testing succeeding:",wmeValue,tokenValue);
                }
            }else{//binding doesnt exist
                //create the binding
                console.log("creating binding:",test[0],wmeValue);
                newBindings[test[0]] = wmeValue;
            }            
        }
        console.log("Returning bindings:",newBindings);
        return newBindings;
    };


    //Trigger a join node with a new token
    //will pull all wmes needed from the linked alphaMemory
    var joinNodeLeftActivation = function(node,token){
        console.log("join node left activation");
        //If necessary, relink or unlink the parent betamemory or alphamemory
        if(node.parent.items && node.parent.items.length > 0){
            relinkToAlphaMemory(node);
            if(node.alphaMemory.items.length === 0){
                console.log("filtering join node out of parent");
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
            console.log("returned jtr 1:",joinTestResult);
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
        console.log("join node right activation");
        //relink or unlink as necessary
        if(node.alphaMemory.children.length === 1){
            relinkToBetaMemory(node);
            if(node.parent.items.length === 0){
                console.log("unlinking alpha memory");
                var index = node.alphaMemory.children.map(function(d){ return d.id; }).indexOf(node.id);
                node.alphaMemory.children.splice(index,1);
            }
        }

        //For all tokens, compare to the new wme,
        //pass on successful combinations to betamemory/negative node
        for(var i in node.parent.items){
            var currToken = node.parent.items[i];
            var joinTestResult = performJoinTests(node,currToken,wme);
            console.log("returned jtr 2:",joinTestResult);
            if(joinTestResult !== false){
                console.log("going on to left activate...");
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
        var ancestor = node.nearestAncestor;
        var indices = node.alphaMemory.children.map(function(d){ return d.id; });
        
        while(ancestor && indices.indexOf(ancestor.id) === -1){
            ancestor = findNearestAncestorWithSameAlphaMemory(ancestor,node.alphaMemory.id);
        }
        if(ancestor !== null){
            var index = node.alphaMemory.children.map(function(d){ return d.id; }).indexOf(ancestor.id);
            node.alphaMemory.children.splice(index,0,node);
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
    var negativeNodeLeftActivation = function(node,token){
        if(node.items.length === 1){
            relinkToAlphaMemory(node);
        }
        var newToken = token;
        node.items.unshift(newToken);

        for(var i in node.alphaMemory.items){
            var currWme = node.alphaMemory.items[i];
            var joinTestResult = performJoinTests(node,newToken,currWme);
            console.log("Returned jtr 3:",joinTestResult);
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
            conosle.log("Returned jtr4 :",joinTestResult);
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
    var nccNodeLeftActivation = function(nccNode,token){
        //Create and store the incoming token from prior join node
        var newToken = token
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
    var nccParterNodeLeftActivation = function(partner,token){
        var nccNode = partner.nccNode;
        var newToken = token
        
        var ownersToken = token;
        var ownersWme = wme;
        for(var i = 1; i < partner.numberOfConjuncts; i++){
            ownersToken = ownersToken.parentToken;
            ownersWme = ownersWme.wme;
        }

        for(var i in nccNode.items){
            var potentialOwner = nccNode.items[i];
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
                    if(currChild.isJoinNode){
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
        if(token.node.isAnNCCPartnerNode){
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

    var compareNodeToTest = function(node,testTuple){
        if(node.testField !== testTuple[0]
           || node.testValue !== testTuple[1]){
            return false;
        }
        if(testTuple.length === 3
           && node.operator !== testTuple[2]){
            return false;
        }
        return true;
    };
    
    var buildOrShareConstantTestNode = function(parent,testTuple){
        for(var i in parent.children){
            var node = parent.children[i];
            if(compareNodeToTest(node,testTuple)){
                return node;
            }
        }
        var newAlphaNode = new DataStructures.AlphaNode(parent,testTuple);
        return newAlphaNode;
    }

    
    //added retenet parameter
    //Remind: Rule{Conditions:Condition{constantTests
    var buildOrShareAlphaMemory = function(condition,root){
        var currentNode = root;
        for(var i in condition.constantTests){
            var constantTestTuple = condition.constantTests[i];
            currentNode = buildOrShareConstantTestNode(currentNode,constantTestTuple);
        }
        //see if there is an existing memory for this condition. if so, return existing alphamemory
        if(currentNode.outputMemory !== undefined){
            return currentNode.outputMemory;
        }
        //else: create the alpha memory
        var newAlphaMemory = new DataStructures.AlphaMemory(currentNode);
        //run wmes in working memory against the alpha network
        return newAlphaMemory;
    };

    var buildOrShareBetaMemoryNode = function(parent){
        //if theres an available beta memory to use,
        //return that
        for(var i in parent.children){
            var child = parent.children[i];
            if(child.isBetaMemory){
                return child;
            }
        }
        //else: create a new beta memory
        var newBetaMemory = new DataStructures.BetaMemory(parent);
        //update it with matches
        updateNewNodeWithMatchesFromAbove(newBetaMemory);
        //return new beta memory
        return newBetaMemory;
    };

    //Return the bindings from a condition
    //a : first_field_of_wme
    //Just tuples of (boundVariable,wmeField)
    //To be entries in the token's binding dictionary
    var getJoinTestsFromCondition = function(condition){
        return condition.bindings;
    }

    //walk up from a beta node until you find a node
    //connected to the specified alpha memory
    var findNearestAncestorWithSameAlphaMemory = function(node,alphaMemory){
        if(node.dummy){ return null;}
        if(node.isJoinNode || node.isNegativeNode){
            if(node.alphaMemory.id === alphaMemory.id){
                return node;
            }
        }
        if(node.isAnNCCNode){
            return findNearestAncestorWithSameAlphaMemory(node.partner.parent,alphaMemory);
        }
        return findNearestAncestorWithSameAlphaMemory(node.parent,alphaMemory);        
    };

    var compareJoinTests = function(firstTestSet,secondTestSet){
        var i = firstTestSet.length;
        var j = secondTestSet.length;
        while(i || j){
            if(firstTestSet[i][0] === secondTestSet[j][0]
               && firstTestSet[i][1] === secondTestSet[j][1]){
                i--; j--;
            }else if(firstTestSet[i][0] > secondTestSet[j][0]){
                i--;
            }else{
                j--;
            }
        }
        if(i === j && i === 0){        
            return true;
        }
        return false;
    };
    

    var buildOrShareJoinNode = function(parent,alphaMemory,tests){
        //see if theres a join node to use already
        for(var i in parent.children){
            var child = parent.children[i];
            if(child.isJoinNode && child.alphaMemory.id === alphaMemory.id && compareTests(child.tests,tests)){
                //return it
                return child;
            }
        }
        //else: create a new join node
        //increment alphamemories reference count in the constructor
        var newJoinNode = new DataStructures.JoinNode(parent,alphaMemory,tests);
        //set the nearest ancestor
        newJoinNode.nearestAncestor = findNearestAncestorWithSameAlphaMemory(parent,alphaMemory);

        //if either parent memory is empty, unlink
        if(alphaMemory.items.length === 0){
            console.log("unlinking join node parent");
            var index = parent.children.map(function(d){
                return d.id;
            }).indexOf(newJoinNode.id);
            parent.children.splice(index,1);
        }else if(parent.items.length === 0){
            console.log("unlinking join node alpha memory");
            var index = alphaMemory.children.map(function(d){ return d.id; }).indexOf(newJoinNode.id);
            alphaMemory.children.splice(index,1);
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
               && compareTests(child.tests,tests)){
                return child;
            }
        }
        var newNegativeNode = new DataStructures.NegativeNode(parent,alphaMemory,tests);
        newNegativeNode.nearestAncestor = nearestAncestorWithSameAlphaMemory(parent,alphaMemory);
        //update with matches
        updateNewNodeWithMatchesFromAbove(newNegativeNode);
        //unlink if it has no tokens
        if(newNegativeNode.items.length === 0){
            var index = alphaMemory.children.map(function(d){
                return d.id;
            }).indexOf(newNegativeNode.id);
            alphaMemory.children.splice(index,1);
        }
        //return new negative node
        return newNegativeNode
    };


    var buildOrShareNCCNodes = function(parent,conditions,rootAlpha){
        //build a network for the conditions
        var bottomOfSubNetwork = buildOrShareNetworkForConditions(parent,conditions,rootAlpha);
        //find an existing NCCNode with partner to use
        for(var i in parent.children){
            var child = parent.children[i];
            if(child.isAnNCCNode && child.partner.parent.id === bottomOfSubNetwork.id){
                return child;
            }
        }
        //else: build NCC and Partner nodes
        var newNCC = new DataStructures.NegatedConjunctiveConditionNode(parent);
        var newNCCPartner = new DataStructures.NegConjuConPartnerNode(bottomOfSubNetwork,conditions.length);
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
                var tests = getJoinTestsFromCondition(condition);
                var alphaMemory = buildOrShareAlphaMemory(condition,rootAlpha);
                currentNode = buildOrShareJoinNode(currentNode,alphaMemory,condition.bindings);
            }else if(condition.isNegative){
                var tests = getJoinTestsFromCondition(condition);
                var alphaMemory = buildOrShareAlphaMemory(condition,rootAlpha);
                currentNode = buildOrShareNegativeNode(currentNode,alphaMemory,tests);
            }else if(condition.isNCCCondition){
                currentNode = buildOrShareNCCNodes(currentNode,condition,rootAlpha);
            }else{
                throw new Error("Unrecognised condition type");
            }
            //return current node
            return currentNode;
        }
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

    var leftActivate = function(node,token,wme,joinTestResults){
        console.log("Left Activatin:",node);
        if(token && joinTestResults && wme){
            token = new DataStructures.Token(token,wme,node,joinTestResults);
        }
        if(node.isBetaMemory){
            betaMemoryLeftActivation(node,token);
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
        }
        
    };

    var rightActivate = function(node,wme){
        console.log("Right activating:",node);
        if(node.isJoinNode){
            joinNodeRightActivation(node,wme);
        }else if(node.isNegativeNode){
            negativeNodeRightActivation(node,wme);
        }else{
            throw new Error("Tried to rightActivate Unrecognised node");
        }
    };
        
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
                    var token = parent.items;
                    if(token.negJoinResults.length === 0){
                        leftActivate(newNode,token);
                    }
                }
        }else if(parent.isAnNCCNode){
            for(var i in parent.items){
                var token = parent.items;
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

    var deleteNodeAndAnyUnusedAncestors = function(node){
        //if NCC, delete partner to
        if(node.isAnNCCNode){
            deleteNodeAnAnyUnusedAncestors(node.partner);
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

        //clean up alphamemory
        if(node.isJoinNode || node.isNegativeNode){
            var index = node.alphaMemory.children.map(function(d){ return d.id; }).indexOf(node.id);
            if(index > -1){
                node.alphaMemory.children.splice(index,1);
            }
            node.alphaMemory.referenceCount--;
            if(node.alphaMemory.referenceCount === 0){
                deleteAlphaMemory(node.alphaMemory);
            }
        }
        
        //clean up parent
        if(node.alphaMemory){
            var index = node.parent.children.map(function(d){ return d.id; }).indexOf(node.id);
            if(index > -1){
                node.parent.children.splice(index,1);
            }
        }
        if(node.isJoinNode){
            var index = node.parent.children.map(function(d){
                return d.id;
            }).indexOf(node.id);
            node.parent.children.splice(index,1);
            if(node.parent.allChildren.length === 0){
                deleteNodeAndAnyUnusedAncestors(node.parent);
            }
        }else if(node.parent.children.length === 0){
            deleteNodeAndAnyUnusedAncestors(node.parent);
        }
        //deallocate memory for none
    };


    var interface = {
        "addRule"   : addRule,
        "removeRule": removeRule,
        "addWME"    : addWME,
        "removeWME" : removeWME,
    };

    return interface;
});
