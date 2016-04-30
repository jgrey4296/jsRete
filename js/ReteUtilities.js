/**
   @module ReteUtilities
   @requires underscore
*/
var _ = require('lodash'),
    RDS = require('./ReteDataStructures'),
    ArithmeticActions = require('./ReteArithmeticActions');
"use strict";

/**
   Reconnects a joinnode with its alpha memory, once the beta memory is populated
   @param node
   @function relinkToAlphaMemory
*/
var relinkToAlphaMemory = function(node){
    //reconnect an unlinked join node to its alpha memory when there are
    //wmes in said alpha memory
    if(!(node instanceof RDS.JoinNode || node instanceof RDS.NegativeNode)){
        throw new Error("trying to relink alpha on something other than a join node or negative node");
    }
    var ancestor = node.nearestAncestor,
        indices = node.alphaMemory.children.map(d=>d.id);

    //While the ancestor is a child of the alpha memory
    while(ancestor && indices.indexOf(ancestor.id) === -1){
        //go up an ancestor if it is unlinked to
        ancestor = findNearestAncestorWithAlphaMemory(ancestor,node.alphaMemory.id);
    }
    
    //When finished, if the ancestor exists:
    if(ancestor !== null){
        var index = node.alphaMemory.children.map(d=>d.id).indexOf(ancestor.id);
        //add the node into the child list in front of the ancestor
        node.alphaMemory.children.splice(index,0,node);
    }else{
        //otherwise just add at the end
        node.alphaMemory.children.push(node);
    }

    //remove from the unlinkedChildren Field
    var nodeIndex = node.alphaMemory.unlinkedChildren.map(d=>d.id).indexOf(node.id);
    node.alphaMemory.unlinkedChildren.splice(nodeIndex,1);
        
};

/**
   Reconnects a join node to its beta memory, once the alpha memory is populated
   @param node
   @function relinkToBetaMemory
*/
var relinkToBetaMemory = function(node){
    //relink an unlinked join node to its betamemory when there are tokens
    //in said memory
    //remove from the unlinked children list
    //and add it into the children
    if(node.parent.unlinkedChildren.length === 0) { return; }
    var index = node.parent.unlinkedChildren.map(d=>d.id).indexOf(node.id);
    if(index > -1){
        node.parent.unlinkedChildren.splice(index,1);
        node.parent.children.unshift(node);
    }
};


/**
   If an alpha memory becomes empty, displace all its children temporarily
   @param alphaMemory
   @function unlinkAlphaMemory
*/
var unlinkAlphaMemory = function(alphaMemory){
    //if the alphaMem has no items: UNLINK
    if(alphaMemory.items.length === 0){
        alphaMemory.children.forEach(function(amChild){
            if(amChild instanceof RDS.JoinNode){
                var index = amChild.parent.children.map(d=>d.id).indexOf(amChild.id);
                //splice out
                var removed = amChild.parent.children.splice(index,1);
                //and store
                amChild.parent.unlinkedChildren.push(removed[0]);
            }
        });
    }
};


/**
   If a beta memory becomes empty, displace all its children temporarily
   @param node
   @function ifEmptyBetaMemoryUnlink
*/
var ifEmptyBetaMemoryUnlink = function(node){
    //Now Essentially switch on: BetaMemory, NegativeNode,
    //NCCNode, and NCCPartnerNode

    //BETAMEMORY
    if(node && (node instanceof RDS.BetaMemory || node instanceof RDS.JoinNode) ){
        //and that betaMemory has no other items
        if(node.items.length === 0){
            //for all the node's children
            node.children.forEach(function(jn){
                if(!(jn instanceof RDS.JoinNode)){ return; }
                var index = jn.alphaMemory.children.map(d=>d.id).indexOf(jn.id);
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
   If a negative node becomes empty, displace its alpha memory's children
   @param node
   @function ifEmptyNegNodeUnlink
*/
var ifEmptyNegNodeUnlink = function(node){
    if(node && node instanceof RDS.NegativeNode){
        //with elements
        if(node.items.length === 0){
            //unlink alpha memory
            var index = node.alphaMemory.children.map(d=>d.id).indexOf(node.id);
            var removed = node.alphaMemory.children.splice(index,1);
            node.alphaMemory.unlinkedChildren.push(removed[0]);
        }
    }
};

/**
   Compare an existing constant test node to a constant test that wants to be built
   @param node
   @param constantTestSpec
   @function compareConstantNodeToTest
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
   Compare specified join tests, to see if a join node is the same as one needed
   @param firstTestSet
   @param secondTestSet
   @function compareJoinTests
*/
var CompareJoinTests = function(firstTestSet,secondTestSet){
    try{
        //compare lengths
        if(firstTestSet.length !== secondTestSet.length) { throw "unequal lengths"; }
        for(var i = 0; i < firstTestSet.length; i++){
            var fTest = firstTestSet[i],
                sTest = secondTestSet[i];
            //compare the bound names
            if(fTest[0] !== sTest[0]) { throw "different bound names"; }
            
            //compare the source names
            if(fTest[1][0] !== sTest[1][0]) { throw "different source names"; }
            
            //compare the bind tests
            if(fTest[1][1].length !== sTest[1][1].length) { throw "different binding tests length"; }
            for(var j = 0; fTest[1][1].length; j++){
                if(fTest[1][1][j][0] !== sTest[1][1][j][0]) { throw "different comp operator"; }
                if(fTest[1][1][j][1] !== sTest[1][1][j][1]) { throw "different comp value"; }
            }
        }
    }catch(e){
        return false;
    }
    return true;
};

/**
   To go up the network, to find appropriate beta network elements linked to the alphamemory
   @param node
   @param alphaMemory
   @function findNearestAncestorWithAlphaMemory
*/
var findNearestAncestorWithAlphaMemory = function(node,alphaMemory){
    //recursive

    //base conditions:
    if(node.dummy){ return null;}
    if(node instanceof RDS.JoinNode || node instanceof RDS.NegativeNode){
        if(node.alphaMemory.id === alphaMemory.id){
            return node;
        }
    }
    //switch recursion into the partner clause
    if(node instanceof RDS.NCCNode){
        return findNearestAncestorWithAlphaMemory(node.partner.parent,alphaMemory);
    }
    //recurse:
    return findNearestAncestorWithAlphaMemory(node.parent,alphaMemory);        
};

//--------------------
/**
   Retrieves a value from an object based on a dot style strings
   eg: "values.object.a" will get { values : { object { a : 5 } } }
   @param wme
   @param dotString
   @function
 */
var retrieveWMEValueFromDotString = function(wme,dotString){
    "use strict";
    //get from the node stored in wme.data the value
    //that the dotString address specifies
    let address = dotString.split("."),
        currLocation = wme.data;
    while(address.length > 0){
        let curr = address.shift();
        if(currLocation[curr] !== undefined){
            currLocation = currLocation[curr];
        }else{
            return null;
        }
    }

    //return the final location arrived at
    return currLocation;
};

/**
   Remove proposed actions from the retenet, and from their owning tokens
   @param invalidatedActions
   @function
*/

var cleanupInvalidatedActions = function(invalidatedActions){
    if(invalidatedActions.length === 0 || invalidatedActions[0].reteNet === undefined){
        return;
    }
    var reteNet = invalidatedActions[0].reteNet,
        proposedActions = reteNet.proposedActions,
        idList = invalidatedActions.map(d=>d.id);
    //console.log("Cleaning up:",[idList,invalidatedActions,proposedActions]);
    
    //filter out the ids from the proposedActions list
    //also removing them from the owning tokens
    reteNet.proposedActions = _.reject(reteNet.proposedActions,d=>d === undefined || idList.indexOf(d.id) !== -1);
};


/**
   Take a single object that describes a more complex object, and convert it to that more complex object
   @param objDesc
   @param baseObject
   @function objDescToObject
*/
var objDescToObject = function(objDesc,baseObject){
    /* can work on arbitrary depths, will overwrite primitives if later an object is needed
       
       ie: {"values.a" : 5, "values.b" : 10,
       "tags.type" : "rule", "tags.character" : "bob"}
       --->
       {"values": {"a": 5, "b": 10},
       "tags" : {"type" : "rule", "character": "bob"}}
    */
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

/**
   Create new wme data from an action description and a token's bindings
   @param {Action} action
   @param {Token} token
 */
var createNewWMEData = function(action,token){
    "use strict";
    //initialise from the action's 'values' object
    let newWMEData = _.reduce(_.keys(action.values),function(memo,key){
        let v = action.values[key];
        //splice in bindings into the values
        memo[key] = spliceInValues(v,token.bindings);
        return memo;
    },{bindings: {} }),
    //copy in the bindings
        dataPlusBindings = _.reduce(_.keys(token.bindings),function(m,v){
            m.bindings[v] = token.bindings[v];
            return m;
        },newWMEData);
    return dataPlusBindings;
};

/**
   Apply arithmetic actions to a data object, in place
   @param {Action} action
   @param {Object} data
 */
var applyArithmetic = function(action,data){
    "use strict";
    //perform arithmetic:
    _.keys(action.arithmeticActions).forEach(function(key){        
        let arithDesc = action.arithmeticActions[key],
            currVal = Number(data[key]),
            //look up the function:
            //because the representation form is: a : ["+", 5]
            arithFunc = ArithmeticActions[arithDesc[0]],
            //Get the value if its a binding
            applyVal = typeof arithDesc[1] === 'number' ? arithDesc[1] : arithDesc[1].match(/\$/) ? parseInt(data.bindings[arithDesc[1].slice(1)]) : parseInt(arithDesc[1]);
        if(arithFunc === undefined) { throw new Error("Undefined arithmetic function"); }
        if(isNaN(currVal) || isNaN(applyVal)) { throw new Error("Arithmetic value should be convertable to a number: " + currVal + " " + applyVal); }
        data[key] = arithFunc(currVal,applyVal);
    });
};

/**
   Apply an actions Regex transforms to some data, in place
   @param {Action} action
   @param {Object} data
 */
var applyRegex = function(action,data){
    "use strict";
    _.keys(action.regexActions).forEach(function(key){
        let regexAction = action.regexActions[key],
            regex = new RegExp(regexAction[0],regexAction[1]),
            replaceValue = spliceInValues(regexAction[2],data.bindings);
        
        data[key] = data[key].replace(regex,replaceValue);
    });

};

/**
   Repeatedly splice in values into a string
   @param {String} baseString
   @param {Object} valueObject
 */
var spliceInValues = function(baseString,valueObject){
    "use strict";
    let match = (/\${(\w+)}/g).exec(baseString);
    while(match !== null){
        if(valueObject[match[1]] !== undefined){
            baseString = spliceStr(baseString,match.index,valueObject[match[1]],match[0].length);
        }else{
            throw new Error("Unrecognised binding: " + match[1]);
        }
        match = (/\${(\w+)}/g).exec(baseString);
    }
    return baseString;
};

/**
   Utility function to splice a string, from
   http://stackoverflow.com/questions/20817618/is-there-a-splice-method-for-strings
   @param {String} orig the original string
   @param {Int} index the start point to splice from
   @param {String} addition The string to splce in
   @param {Int} cutLength The amount after the index to ignore before using the remaining string
 */
var spliceStr = function(orig,index,addition,cutLength){
    return orig.slice(0,index) + addition + orig.slice(index+cutLength);
};

//------------------------------
var moduleInterface = {
    "unlinkAlphaMemory" : unlinkAlphaMemory,
    "relinkToAlphaMemory" : relinkToAlphaMemory,
    "ifEmptyBetaMemoryUnlink" : ifEmptyBetaMemoryUnlink,
    "ifEmptyNegNodeUnlink" : ifEmptyNegNodeUnlink,
    "relinkToBetaMemory" : relinkToBetaMemory,
    "compareJoinTests" : CompareJoinTests,
    "compareConstantNodeToTest" : compareConstantNodeToTest,
    "findNearestAncestorWithAlphaMemory" : findNearestAncestorWithAlphaMemory,
    "retrieveWMEValueFromDotString" : retrieveWMEValueFromDotString,
    "cleanupInvalidatedActions" : cleanupInvalidatedActions,
    "objDescToObject" : objDescToObject,
    "createNewWMEData" : createNewWMEData,
    "applyArithmetic" : applyArithmetic,
    "applyRegex" : applyRegex
};
module.exports = moduleInterface;    

