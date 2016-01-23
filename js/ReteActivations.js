if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

define(['require','./ReteDataStructures','./ReteComparisonOperators','./ReteUtilities','./ReteTestExecution','./ReteActions','./ReteDeletion','underscore'],function(require,RDS,ConstantTestOperators,ReteUtil,ReteTestExecution,PossibleActions,ReteDeletion,_){
    "use strict";

    // if(ReteDeletion === undefined){
    //      ReteDeletion = require('./ReteDeletion');
    // }
    
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
        alphaMem.children.forEach(function(child){
            rightActivate(child,wme);
        });
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
            alphaNode.children.forEach(function(child){
                alphaNodeActivation(child,wme);
            });
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
        betaMemory.children.forEach(function(child){
            leftActivate(child,newToken);
        });
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
        node.alphaMemory.items.forEach(function(item){
            var currWME = item.wme;
            var joinTestResult = ReteTestExecution.performJoinTests(node,token,currWME);
            if(joinTestResult !== undefined && joinTestResult !== false){
                node.children.forEach(function(child){
                    leftActivate(child,token,currWME,joinTestResult);
                });//end of loop activating all children
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
                var index = node.alphaMemory.children.map(function(d){ return d.id; }).indexOf(node.id);
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
                node.children.forEach(function(currNode){
                    leftActivate(currNode,currToken,wme,joinTestResult);
                });
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
            //get the individual new proposed actions
            newProposedActions = boundActionFunctions.map(function(d){
               return d(token,actionNode.reteNet);
            }),
            newProposedActionIds = newProposedActions.map(function(d){
                return d.id;
            });
        
        //store the proposed actions in the reteNet.potential actions
        //and also tie all the actions that fire together by their ids
        //ie: {action:"assert",payload:wme}
        newProposedActions.forEach(function(d){
            d.parallelActions = newProposedActionIds;
            actionNode.reteNet.potentialActions[d.id] = d;
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
            node.children.forEach(function(child){
                leftActivate(child,newToken);
            });
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
                    if(ReteDeletion === undefined){
                         ReteDeletion = require('./ReteDeletion');
                    }
                    var invalidatedActions = ReteDeletion.deleteDescendentsOfToken(currToken);
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
            nccNode.children.forEach(function(child){
                leftActivate(child,newToken);
            });
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
                }}).filter(function(d){return d !== undefined;});
            owner = possible_tokens[0];
        }

        //link the owner and the new token
        if(owner !== undefined){
            //the necessary owner exists in the nccNode,
            //so update it:
            owner.nccResults.unshift(newToken);
            newToken.parent = owner;
            if(ReteDeletion === undefined){
                ReteDeletion = require('./ReteDeletion');
            }
            var invalidatedActions = ReteDeletion.deleteDescendentsOfToken(owner);
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
            currJoinResult.owner.owningNode.children.forEach(function(child){
                //activate the token for all its owners children
                leftActivate(child,currJoinResult.owner);
            });
        }
    };


    //** @deprecated ifNCCPartnerNodeActivateIfAppropriate
    //** @note is displaced into methods above to stop circular dependencies with retedeletion
    // var ifNCCPartnerNodeActivateIfAppropriate = function(token){
    //     if(token && token.owningNode
    //        && token.owningNode.isAnNCCPartnerNode){
    //         if(token.parentToken.nccResults.length === 0){
    //             token.owningNode.nccNode.children.forEach(function(d){
    //                 leftActivate(d,token.parentToken);
    //             });
    //             return true;
    //         }
    //     }
    //     return false;
    // };

    
    

    var moduleInterface = {
        "leftActivate" : leftActivate,
        "rightActivate" : rightActivate,
        "alphaNodeActivation" : alphaNodeActivation,
        "activateIfNegatedJRIsUnblocked" : activateIfNegatedJRIsUnblocked,
    };
    return moduleInterface;
});
