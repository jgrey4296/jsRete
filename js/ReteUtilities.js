if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

define(['require','underscore'],function(require,_){
    "use strict";


    
    /**
       @function relinkToAlphaMemory
       @utility
       @purpose reconnects a joinnode with its alpha memory, once the beta memory is populated
     */
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
        var nodeIndex = node.alphaMemory.unlinkedChildren.map(function(d){ return d.id;}).indexOf(node.id);
        node.alphaMemory.unlinkedChildren.splice(nodeIndex,1);
        
        
    };

    /**
       @function relinkToBetaMemory
       @utility
       @purpose reconnects a join node to its beta memory, once the alpha memory is populated
     */
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


    /**
       @function unlinkAlphaMemory
       @purpose if an alpha memory becomes empty, displace all its children temporarily
     */
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

    
    /**
       @function ifEmptyBetaMemoryUnlink
       @purpose if a beta memory becomes empty, displace all its children temporarily
     */
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

    /**
       @function ifEmptyNegNodeUnlink
       @purpose if a negative node becomes empty, displace its alpha memory's children
     */
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

    

    /**
       @function compareConstantNodeToTest
       @purpose compare an existing constant test node to a constant test that wants to be built
     */
    //taking an alpha node and a ConstantTest
    var compareConstantNodeToTest = function(node,constantTestSpec){
        if(node.testField !== constantTestSpec.field
           || node.testValue !== constantTestSpec.value){
            return false;
        }
        if(node.operator !== constantTestSpec.operator){
            return false;
        }
        return true;
    };

    /**
       @function compareJoinTests
       @purpose Compare specified join tests, to see if a join node is the same as one needed
    */
    var compareJoinTests = function(firstTestSet,secondTestSet){
        if(!(secondTestSet instanceof Array)){
            secondTestSet = _.pairs(secondTestSet);
        }
        
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


    var altCompareJoinTests = function(firstTestSet,secondTestSet){
        try{
            //compare lengths
            if(firstTestSet.length !== secondTestSet.length) throw "unequal lengths";
            for(var i = 0; i < firstTestSet.length; i++){
                var fTest = firstTestSet[i],
                    sTest = secondTestSet[i];
                //compare the bound names
                if(fTest[0] !== sTest[0]) throw "different bound names";
            
                //compare the source names
                if(fTest[1][0] !== sTest[1][0]) throw "different source names";
            
                //compare the bind tests
                if(fTest[1][1].length !== sTest[1][1].length) throw "different binding tests length";
                for(var j = 0; fTest[1][1].length; j++){
                    if(fTest[1][1][j][0] !== sTest[1][1][j][0]) throw "different comp operator";
                    if(fTest[1][1][j][1] !== sTest[1][1][j][1]) throw "different comp value";
                }
            }
        }catch(e){
            return false;
        }
        return true;
    };

    
    /**
       @function findNearestAncestorWithAlphaMemory
       @recursive
       @purpose To go up the network, to find appropriate beta network elements linked to the alphamemory
    */
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

    //--------------------
    var retrieveWMEValueFromDotString = function(wme,dotString){
        //get from the node stored in wme.data the value
        //that the dotString address specifies
        var address = dotString.split("."),
            currLocation = wme.data;
        while(address.length > 0){
            var curr = address.shift();
            if(currLocation[curr] !== undefined){
                currLocation = currLocation[curr];
            }
        };

        //return the final location arrived at
        return currLocation;
    };

    //remove proposed actions from the retenet, and from their owning tokens
    var cleanupInvalidatedActions = function(invalidatedActions){
        if(invalidatedActions.length === 0 || invalidatedActions[0].reteNet === undefined){
            return;
        }
        var reteNet = invalidatedActions[0].reteNet,
            potentialActions = reteNet.potentialActions,
            idList = invalidatedActions.map(function(d){
                return d.id;
            });
        console.log("Cleaning up:",[idList,invalidatedActions,potentialActions]);
        //filter out the ids from the potentialActions list
        //also removing them from the owning tokens
        potentialActions = _.reject(potentialActions,function(d){
            if(d === undefined) return false;
            return idList.indexOf(d.id) != -1;
        }).filter(function(d){ return d === undefined; });
        reteNet.potentialActions = potentialActions;
    };


    /**
       @function objDescToObject
       @purpose Take a single object that describes a more complex object,
       and convert it to that more complex object

       @note can work on arbitrary depths, will overwrite primitives if later an object is needed

       ie: {"values.a" : 5, "values.b" : 10,
       "tags.type" : "rule", "tags.character" : "bob"}
       --->
       {"values": {"a": 5, "b": 10},
       "tags" : {"type" : "rule", "character": "bob"}}

     */
    var objDescToObject = function(objDesc,baseObject){
        var newObj = baseObject || {},
            //take the starting object and for all keys
            finalObj = _.keys(objDesc).reduce(function(m,v){
                //split the keys apart
                var keys = v.split(/\./),
                    currObj = m,
                    currKey;
                //add an object for each key
                while(keys.length > 1){
                    currKey = keys.shift();
                    if(currObj[currKey] === undefined
                      || typeof currObj[currKey] !== 'object'){
                        currObj[currKey] = {};
                    }
                    currObj = currObj[currKey];
                }
                currKey = keys.shift();
                currObj[currKey] = objDesc[v];
                return m;
            },newObj);
        return finalObj;
    };

    
    
    //------------------------------
    var moduleInterface = {
        "unlinkAlphaMemory" : unlinkAlphaMemory,
        "relinkToAlphaMemory" : relinkToAlphaMemory,
        "ifEmptyBetaMemoryUnlink" : ifEmptyBetaMemoryUnlink,
        "ifEmptyNegNodeUnlink" : ifEmptyNegNodeUnlink,
        "relinkToBetaMemory" : relinkToBetaMemory,
        "compareJoinTests" : altCompareJoinTests,
        //"compareJoinTests" : compareJoinTests,
        "compareConstantNodeToTest" : compareConstantNodeToTest,
        "findNearestAncestorWithAlphaMemory" : findNearestAncestorWithAlphaMemory,
        "retrieveWMEValueFromDotString" : retrieveWMEValueFromDotString,
        "cleanupInvalidatedActions" : cleanupInvalidatedActions,
        "objDescToObject" : objDescToObject
    };
    return moduleInterface;    
});
