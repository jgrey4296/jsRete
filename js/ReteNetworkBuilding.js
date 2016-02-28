/**
   Functions to create the actual Alpha and Beta Networks of the ReteNet
   @module ReteNetworkBuilding
   @requires ReteDataStructures
   @requires ReteUtilities
   @requires ReteActivationAndDeletion
   @requires underscore
 */
var RDS = require('./ReteDataStructures'),
    ReteUtil = require('./ReteUtilities'),
    ReteActivationsAndDeletion = require('./ReteActivationAndDeletion'),
    _ = require('underscore');
"use strict";

/**
   To add all given conditions to the network
   @param parent
   @param conditions
   @param rootAlpha
   @param allNodes
   @param reteNet
   @function buildOrShareNetworkForConditions

*/
var buildOrShareNetworkForConditions = function(parent,conditions,rootAlpha,allNodes,reteNet){
    var currentNode = parent;
    var alphaMemory;
    //for each condition
    conditions.forEach(function(condition){
        if(condition.tags.type !== 'condition' && condition.tags.type !== 'negConjCondition'
           && condition.tags.type !== 'negCondition' && condition.tags.type !== 'rule'){
            throw new Error("Inappropriate condition format");
        }
        //get the binding tests for join nodes
        var tests = _.pairs(condition.bindings);
        
        if(condition.tags.isPositive !== undefined){
            //Build a positive condition:
            currentNode = buildOrShareBetaMemoryNode(currentNode,reteNet);
            alphaMemory = buildOrShareAlphaMemory(condition,rootAlpha,allNodes,reteNet);
            currentNode = buildOrShareJoinNode(currentNode,alphaMemory,tests,reteNet);
        }else if(condition.tags.isNegative !== undefined){
            //Build a negative condition:
            alphaMemory = buildOrShareAlphaMemory(condition,rootAlpha,allNodes,reteNet);
            currentNode = buildOrShareNegativeNode(currentNode,alphaMemory,tests,reteNet);
        }else if(condition.tags.isNCCCondition !== undefined){
            //Build a Negated Conjunctive Condition
            currentNode = buildOrShareNCCNodes(currentNode,condition,rootAlpha,allNodes,reteNet);
        }else if(condition.tags.type === 'rule'){
            //for using other rules as composable conditions
            var ruleConditions = _.keys(condition.conditions).map(d=>allNodes[d]);
            currentNode = buildOrShareNetworkForConditions(currentNode,ruleConditions,rootAlpha,allNodes,reteNet);
        }else{
            console.error("Problematic Condition:",condition);
            throw new Error("Unrecognised condition type");
        }
    });
    
    //Everything is build, tack on a final memory and return that
    //to have action connected to.
    var finalBetaMemory = buildOrShareBetaMemoryNode(currentNode,reteNet);
    return finalBetaMemory;
};

/**
   Reuse, or create a new, constant test node, for the given test
   @param parent
   @param constantTestSped
   @param reteNet
   @function buildOrShareConstantTestNode
*/
var buildOrShareConstantTestNode = function(parent,constantTestSpec,reteNet){
    var children = _.values(parent.children);
    for(var i = 0; i < children.length; i++){
        var node = children[i];
        if(ReteUtil.compareConstantNodeToTest(node,constantTestSpec)){
            return node;
        }
    }
    //No existing, create a new node:
    var newAlphaNode = new RDS.AlphaNode(parent,constantTestSpec);
    reteNet.storeNode(newAlphaNode);
    return newAlphaNode;
};


/**
   Create alpha network as necessary, stick an alpha memory on the end
   @param condition
   @param root
   @param allNodes
   @param reteNet
   @function buildOrShareAlphaMemory
*/   
var buildOrShareAlphaMemory = function(condition,root,allNodes,reteNet){
    //Rule{Conditions[]}, Condition{constantTests:[],bindings:[[]]}
    var currentNode = root,
        constantTests = condition.constantTests;//[{field:,op:,value:}]
    
    currentNode = constantTests.reduce(function(m,v){
        return buildOrShareConstantTestNode(m,v,reteNet);
    },currentNode);
    
    //see if there is an existing memory for this condition.
    //if so, return existing alphamemory
    if(currentNode.outputMemory !== undefined){
        return currentNode.outputMemory;
    }
    //else: create the alpha memory
    //ctor will update the current node's outputMemory field
    var newAlphaMemory = new RDS.AlphaMemory(currentNode);
    //run wmes in working memory against the alpha network
    reteNet.storeNode(newAlphaMemory);
    return newAlphaMemory;
};

/**
   Given a node (ie: join), stick a betamemory on it as a child
   @param parent
   @param reteNet
   @function buildOrShareBetaMemoryNode
*/
var buildOrShareBetaMemoryNode = function(parent,reteNet){
    //if passed in the dummy top node, return it:
    if(parent.isBetaMemory === true){
        return parent;
    }
    
    //if theres an available beta memory to use,
    //return that
    var children = _.values(parent.children);
    for(var i = 0; i < children.length; i++){
        var child = children[i];
        if(child.isBetaMemory){
            return child;
        }
    }
    //else: create a new beta memory
    //ctor should update  parent's children
    var newBetaMemory = new RDS.BetaMemory(parent);
    //update it with matches
    updateNewNodeWithMatchesFromAbove(newBetaMemory);
    reteNet.storeNode(newBetaMemory);
    //return new beta memory
    return newBetaMemory;
};

/**
   To reuse, or create a new, join node linking an alpha memory and betamemory
   @param parent
   @param alphaMemory
   @param tests
   @param reteNet
   @function buildOrShareJonNode
*/
var buildOrShareJoinNode = function(parent,alphaMemory,tests,reteNet){
    //convert tests if necessary:
    if(!(tests instanceof Array)){
        tests = _.pairs(tests);
    }
    
    //see if theres a join node to use already
    var allChildren = parent.children.concat(parent.unlinkedChildren);
    for(var i = 0; i < allChildren.length; i++){
        var child = allChildren[i];
        if(child.isJoinNode && child.alphaMemory.id === alphaMemory.id && ReteUtil.compareJoinTests(child.tests,tests)){
            //return it
            return child;
        }
    }
    //else: create a new join node
    //increment alphamemories reference count in the constructor
    var newJoinNode = new RDS.JoinNode(parent,alphaMemory,tests);
    //set the nearest ancestor
    newJoinNode.nearestAncestor = ReteUtil.findNearestAncestorWithAlphaMemory(parent,alphaMemory);

    //if either parent memory is empty, unlink
    if(parent.items.length === 0){
        //BETA IS EMPTY: UNLINK RIGHT
        var index = alphaMemory.children.map(d=>d.id).indexOf(newJoinNode.id),
            removed = alphaMemory.children.splice(index,1);
        alphaMemory.unlinkedChildren.unshift(removed[0]);
    }else if(alphaMemory.items.length === 0){
        //ALPHA IS EMPTY: UNLINK LEFT
        var newNodeIndex = parent.children.map(d=>d.id).indexOf(newJoinNode.id),
            removedNode = parent.children.splice(newNodeIndex,1);
        parent.unlinkedChildren.unshift(removedNode[0]);
    }
    //return new join node
    reteNet.storeNode(newJoinNode);
    
    return newJoinNode;
};

/**
   To reuse, or build a new, negative node
   @param parent
   @param alphaMemory
   @param tests
   @param reteNet
   @function buildOrShareNegativeNode
*/
var buildOrShareNegativeNode = function(parent,alphaMemory,tests,reteNet){
    if(!(tests instanceof Array)) { tests = _.pairs(tests); }
    //see if theres an existing negative node to use
    var children = _.values(parent.children);
    for(var i = 0; i < children.length; i ++){
        var child = children[i];
        if(child.isNegativeNode
           && child.alphaMemory.id === alphaMemory.id
           && ReteUtil.compareJoinTests(child.tests,tests)){
            return child;
        }
    }
    var newNegativeNode = new RDS.NegativeNode(parent,alphaMemory,tests);
    newNegativeNode.nearestAncestor = ReteUtil.findNearestAncestorWithAlphaMemory(parent,alphaMemory);
    //update with matches
    updateNewNodeWithMatchesFromAbove(newNegativeNode);
    //unlink if it has no tokens
    if(newNegativeNode.items.length === 0){
        var index = alphaMemory.children.map(d=>d.id).indexOf(newNegativeNode.id),
            removed = alphaMemory.children.splice(index,1);
        alphaMemory.unlinkedChildren.push(removed[0]);
    }
    //return new negative node

    reteNet.storeNode(newNegativeNode);
    return newNegativeNode;
};

/**
   Construction of NCCConditions
   @param parent
   @param condition
   @param rootAlpha
   @param allNodes
   @param reteNet
   @function buildOrShareNCCNodes

*/
var buildOrShareNCCNodes = function(parent,condition,rootAlpha,allNodes,reteNet){
    if(condition.tags.isNCCCondition === undefined){
        throw new Error("BuildOrShareNCCNodes only takes NCCCondition");
    }
    //build a network for the conditions
    var conditions = _.keys(condition.conditions).map(d=>allNodes[d]),
        //build the subnetwork
        bottomOfSubNetwork = buildOrShareNetworkForConditions(parent,conditions,rootAlpha,allNodes,reteNet);
    //find an existing NCCNode with partner to use
    for(var i = 0; i < parent.children.length; i++){
        var child = parent.children[i];
        if(child.isAnNCCNode && child.partner.parent.id === bottomOfSubNetwork.id){
            return child;
        }
    }
    
    //else: build NCC and Partner nodes
    var newNCC = new RDS.NCCNode(parent),
        newNCCPartner = new RDS.NCCPartnerNode(bottomOfSubNetwork,condition.conditions.length);

    newNCC.partner = newNCCPartner;
    newNCCPartner.nccNode = newNCC;
    //update NCC
    updateNewNodeWithMatchesFromAbove(newNCC);
    //update partner
    updateNewNodeWithMatchesFromAbove(newNCCPartner);

    reteNet.storeNode(newNCC);
    reteNet.storeNode(newNCCPartner);
    
    return newNCC;
};


/**
   Pulls tokens down from parent upon new creation
   @param newNode
   @function updateNewNodeWithMatchesFromAbove
*/
var updateNewNodeWithMatchesFromAbove = function(newNode){
    //essentially a 4 state switch:
    //betaMemory, joinNode, negativeNode, NCC
    "use strict";
    var parent = newNode.parent;
    if(parent.isBetaMemory){
        for(let i = 0; i < parent.items.length; i++){
            ReteActivationsAndDeletion.leftActivate(newNode,parent.items[i]);
        }
    }else if(parent.isJoinNode){
        let savedChildren = parent.children,
            items = _.values(parent.alphaMemory.items);
        parent.children = [newNode];
        for(let i = 0; i < items.length; i++){
            var item = items[i];
            ReteActivationsAndDeletion.rightActivate(parent,item.wme);
        }
        parent.children = savedChildren;
    }else if(parent.isNegativeNode){
        let items = _.values(parent.items);
        for(let i = 0; i < items.length; i++){
            let token = items[i];
            if(token.negJoinResults.length === 0){
                ReteActivationsAndDeletion.leftActivate(newNode,token);
            }
        }
    }else if(parent.isAnNCCNode){
        var items = _.values(parent.items);
        for(let i = 0; i < items.length; i++){
            let token = parent.items[i];
            if(token.nccResults.length === 0){
                ReteActivationsAndDeletion.leftActivate(newNode,token);
            }
        }
    }
};



var moduleInterface = {
    "buildOrShareNetworkForConditions" : buildOrShareNetworkForConditions,
};
module.exports =  moduleInterface;

