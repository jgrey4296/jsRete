/**
   Procedures for a rete net.
   Addition of rules, activation, etc
 */
if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

define(['./dataStructures'],function(DataStructures){

    var alphaMemoryActivation = function(alphaMem,wme){
        var newItem = new DataStructures.itemInAlphaMemory(wme,alphaMem);
        alphaMem.items.unshift(newItem);
        wme.alphaMemoryItems.unshift(newItem);

        for(var i in alphaMem.childNodes){
            var child = alphaMem.childNodes[i];
            right-activate(child,wme);
        }
    };

    //todo: add-wme exhausting hash version


    var betaMemoryLeftActivation = function(betaMemory,token,wme){
        var newToken = new DataStructures.Token(token,wme,betaMemory);
        betaMemory.items.unshift(newToken);
        for(var i in betaMemory.children){
            var child = betaMemory.children[i];
            left-activate(child,newToken);
        }
    };

    var performJoinTests = function(joinNode,token,wme){
        var newBindings = {};
        for(var i in joinNode.tests){
            var test = joinNode.tests[i];
            var wmeValue = wme.data[test.field1];
            //If the binding exists
            if(token.bindings[test.field2]){
                var tokenValue = token.bindings[test.field2];
                if(wmeValue !== tokenValue){
                    return false;
                }else{
                    //continue, they match
                }
            }else{//binding doesnt exist
                newBindings[test.field2] = wmeValue;
            }            
        }
        return newBindings;
    };

    var joinNodeLeftActivation = function(node,token){
        if(node.parent.items && node.parent.items.length > 0){
            relinkToAlphaMemory(node);
            if(node.alphaMemory.items.length === 0){
                node.parent.children = node.parent.children.filter(function(d){
                    return d.id !== node.id
                });
            }
        }
        for(var i in node.alphaMemory.items){
            var currWME = node.alphaMemory.items[i].wme;
            var joinTestResult = performJoinTests(node,token,currWME);
            if(joinTestResult !== false){
                for(var j in node.children){
                    var currChild = node.children[i];
                    leftActivate(currChild,token,currWME,newBindings);
                }
            }
        }
        
    };

    var joinNodeRightActivation = function(node,wme){
        if(node.alphaMemory.childNodes.length === 0){
            relinkToBetaMemory(node);
            if(node.parent.items.length === 0){
                node.alphaMemory.childNodes = node.alphaMemory.childNodes.filter(function(d){
                    return d.id !== node.id;
                });
            }
        }

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

    var relinkToBetaMemory = function(node){
        node.parent.children.unshift(node);
    }

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

        if(newToken.negJoinResults.length === 0){
            for(var i in node.children){
                var currChild = node.children[i];
                leftActivate(currChild,newToken);
            }
        }
        
    };

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

    var nccNodeLeftActivation = function(nccNode,token,wme,bidings){
        var newToken = new DataStructures.Token(token,wme,nccNode,bindings);
        nccNode.items.unshift(newToken);

        while(nccNode.partner.newResultBuffer.length > 0){
            var newResult = nccNode.partner.newResultBuff.pop();
            newToken.nccResults.unshift(newResult);
            newResult.parentToken = newToken;
        }

        if(newToken.nccResults.length === 0){
            for(var i in nccNode.children){
                var currChild = nccNode.children[i];
                leftActivate(currChild,newToken);
            }
        }
    };


    var nccParterNodeLeftActivation = function(partner,token,wme){
        var nccNode = partner.nccNode;
        var newToken = new DataStructures.Token(token,wme,partner);
        var ownersToken = token;
        var ownersWme = wme;
        for(var i = 1; i < partner.numberOfConjuncts){
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

    var removeWME = function(wme){
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

    var deleteDescendentsOfToken = function(token){
        while(token.children.length > 0){
            deleteTokenAndDescendents(token.children[0]);
        }
    };

    var buildOrShareAlphaMemory = function(condition){


    };
    
});
