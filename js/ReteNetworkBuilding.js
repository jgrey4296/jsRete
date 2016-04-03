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
    "use strict";
    let currentNode = parent,
        alphaMemory;
    //for each condition
    conditions.forEach(function(condition){
        if(condition.tags.type !== 'rule' && condition.tags.type !== 'condition'){
            throw new Error("trying to add something that isnt a condition");
        }
        if(condition.tags.type === 'condition' && condition.tags.conditionType === undefined){
            throw new Error("Trying to add a condition without a conditionType");
        }
        
        //get the binding tests for join nodes
        let tests = _.pairs(condition.bindings);
        
        if(condition.tags.conditionType === 'positive'){
            //Build a positive condition:
            //currentNode = buildOrShareBetaMemoryNode(currentNode,reteNet);
            alphaMemory = buildOrShareAlphaMemory(condition,rootAlpha,allNodes,reteNet);
            currentNode = buildOrShareJoinNode(currentNode,alphaMemory,tests,reteNet);
        }else if(condition.tags.conditionType === 'negative'){
            //Build a negative condition:
            alphaMemory = buildOrShareAlphaMemory(condition,rootAlpha,allNodes,reteNet);
            currentNode = buildOrShareNegativeNode(currentNode,alphaMemory,tests,reteNet);
        }else if(condition.tags.conditionType === 'negConjCondition'){
            //Build a Negated Conjunctive Condition
            currentNode = buildOrShareNCCNodes(currentNode,condition,rootAlpha,allNodes,reteNet);
        }else if(condition.tags.type === 'rule'){
            //for using other rules as composable conditions
            let ruleConditions = _.pairs(condition.linkedNodes).filter(d=>/condition/.test(d[1])).map(d=>allNodes[d[0]);
            currentNode = buildOrShareNetworkForConditions(currentNode,ruleConditions,rootAlpha,allNodes,reteNet);
        }else{
            console.error("Problematic Condition:",condition);
            throw new Error("Unrecognised condition type");
        }
    });

    //build a final memory node if current isn't one
    return buildOrShareBetaMemoryNode(currentNode,reteNet);
};

/**
   Reuse, or create a new, constant test node, for the given test
   @param parent
   @param constantTestSped
   @param reteNet
   @function buildOrShareConstantTestNode
*/
var buildOrShareConstantTestNode = function(parent,constantTestSpec,reteNet){
    "use strict";
    let children = _.values(parent.children);
    for(var i = 0; i < children.length; i++){
        let node = children[i];
        if(ReteUtil.compareConstantNodeToTest(node,constantTestSpec)){
            return node;
        }
    }
    //No existing, create a new node:
    let newAlphaNode = new RDS.AlphaNode(parent,constantTestSpec);
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
    "use strict";
    //Rule{Conditions[]}, Condition{constantTests:[],bindings:[[]]}
    let currentNode = root,
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
    let newAlphaMemory = new RDS.AlphaMemory(currentNode);
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
    "use strict";
    //if passed in the dummy top node, OR any sort of memory node,
    //be it NCC,Negative,NCCPartner
    if(parent instanceof RDS.BetaMemory || parent instanceof RDS.NCCPartnerNode || parent instanceof RDS.NegativeNode || parent instanceof RDS.NCCNode || parent instanceof RDS.JoinNode){
        return parent;
    }
    
    //if theres an available beta memory to use,
    //return that
    let children = _.values(parent.children);
    for(var i = 0; i < children.length; i++){
        let child = children[i];
        if(child instanceof RDS.BetaMemory){
            return child;
        }
    }
    //else: create a new beta memory
    //ctor should update  parent's children
    let newBetaMemory = new RDS.BetaMemory(parent);
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
    "use strict";
    //convert tests if necessary:
    if(!(tests instanceof Array)){
        tests = _.pairs(tests);
    }
    
    //see if theres a join node to use already
    let allChildren = parent.children.concat(parent.unlinkedChildren);
    for(var i = 0; i < allChildren.length; i++){
        let child = allChildren[i];
        if(child instanceof RDS.JoinNode && child.alphaMemory && child.alphaMemory.id === alphaMemory.id && ReteUtil.compareJoinTests(child.tests,tests)){
            //return it
            return child;
        }
    }
    //else: create a new join node
    //increment alphamemories reference count in the constructor
    let newJoinNode = new RDS.JoinNode(parent,alphaMemory,tests);
    //set the nearest ancestor
    newJoinNode.nearestAncestor = ReteUtil.findNearestAncestorWithAlphaMemory(parent,alphaMemory);

    //if either parent memory is empty, unlink
    if(parent.items.length === 0){
        //BETA IS EMPTY: UNLINK RIGHT
        let index = alphaMemory.children.map(d=>d.id).indexOf(newJoinNode.id),
            removed = alphaMemory.children.splice(index,1);
        alphaMemory.unlinkedChildren.unshift(removed[0]);
    }else if(alphaMemory.items.length === 0){
        //ALPHA IS EMPTY: UNLINK LEFT
        let newNodeIndex = parent.children.map(d=>d.id).indexOf(newJoinNode.id),
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
    "use strict";
    if(!(tests instanceof Array)) { tests = _.pairs(tests); }
    //see if theres an existing negative node to use
    let children = _.values(parent.children);
    for(var i = 0; i < children.length; i ++){
        let child = children[i];
        if(child instanceof RDS.NegativeNode
           && child.alphaMemory
           && child.alphaMemory.id === alphaMemory.id
           && ReteUtil.compareJoinTests(child.tests,tests)){
            return child;
        }
    }
    let newNegativeNode = new RDS.NegativeNode(parent,alphaMemory,tests);
    newNegativeNode.nearestAncestor = ReteUtil.findNearestAncestorWithAlphaMemory(parent,alphaMemory);
    //update with matches
    updateNewNodeWithMatchesFromAbove(newNegativeNode);
    //unlink if it has no tokens
    if(newNegativeNode.items.length === 0){
        let index = alphaMemory.children.map(d=>d.id).indexOf(newNegativeNode.id),
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
    "use strict";
    if(condition.tags.conditionType !== 'negConjCondition'){
        throw new Error("BuildOrShareNCCNodes only takes NCCCondition");
    }
    //build a network for the conditions
    let conditionIdPairs = _.pairs(condition.linkedNodes).filter(d=>/condition/.test(d[1])),
        conditions = conditionIdPairs.map(d=>allNodes[d[0]]),
        //build the subnetwork
        bottomOfSubNetwork = buildOrShareNetworkForConditions(parent,conditions,rootAlpha,allNodes,reteNet);
    //find an existing NCCNode with partner to use
    for(var i = 0; i < parent.children.length; i++){
        let child = parent.children[i];
        if(child instanceof RDS.NCCNode && child.partner.parent && child.partner.parent.id === bottomOfSubNetwork.id){
            return child;
        }
    }
    
    //else: build NCC and Partner nodes
    let newNCC = new RDS.NCCNode(parent),
        newNCCPartner = new RDS.NCCPartnerNode(bottomOfSubNetwork,conditionIdPairs.length);

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
   @note Possible race conditions?
   @param newNode
   @function updateNewNodeWithMatchesFromAbove
*/
var updateNewNodeWithMatchesFromAbove = function(newNode){
    //essentially a 4 state switch:
    //betaMemory, joinNode, negativeNode, NCC
    "use strict";
    let parent = newNode.parent;
    if(parent instanceof RDS.BetaMemory){
        for(let i = 0; i < parent.items.length; i++){
            ReteActivationsAndDeletion.leftActivate(newNode,parent.items[i]);
        }
    }else if(parent instanceof RDS.JoinNode){
        let savedChildren = parent.children,
            items = _.values(parent.alphaMemory.items);
        parent.children = [newNode];
        for(let i = 0; i < items.length; i++){
            let item = items[i];
            ReteActivationsAndDeletion.rightActivate(parent,item.wme);
        }
        parent.children = savedChildren;
    }else if(parent instanceof RDS.NegativeNode){
        let items = _.values(parent.items);
        for(let i = 0; i < items.length; i++){
            let token = items[i];
            if(token.negJoinResults.length === 0){
                ReteActivationsAndDeletion.leftActivate(newNode,token);
            }
        }
    }else if(parent instanceof RDS.NCCNode){
        let items = _.values(parent.items);
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

