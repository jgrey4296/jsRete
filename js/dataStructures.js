/**
   Data structures required for a rete net:
   Nodes, wmes, join results, tokens...
*/

if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

define([],function(){
    var startingId = 0;

    //base WME structure.
    //information stored in .data
    var WME = function(data){
        this.data = data;
        this.alphaMemoryItems = [];
        this.tokens = [];
        this.negJoinResults = [];
        this.id = startingId;
        startingId++;
    };

    //base token,
    //bindings are updated as the token progresses
    var Token = function(parentToken,wme,owningNode,bindings){
        this.parentToken = parent; //ie:owner
        this.wme = wme;
        this.owningNode = owningNode;
        this.childTokens = [];
        this.negJoinResults = [];
        this.nccResults = [];

        this.parent.children.unshift(this);
        if(this.wme){
            this.wme.tokens.unshift(this);
        }

        //TODO: copy over bindings from parent,
        //then copy in new bindings
        this.bindings = bindings | {};

        this.id = startingID;
        startingId++;        
    }

    //Alpha Memory node
    var AlphaMemory = function(){
        this.items = [];
        this.childNodes = [];
        this.referenceCount = 0;
        this.isMemoryNode = true;
        this.id = startingId;
        startingId++;
    }

    //Utility storage of wme and its alphaMemory together
    //used in alphamemory and WME
    var ItemInAlphaMemory = function(wme,alphaMem){
        this.wme = wme;
        this.alphaMemory = alphaMem;
        this.id = startingId;
        startingId++;
    }
    
    //TODO:
    //A constant test node
    var AlphaNode = function(constantTest){
        this.children = [];
        this.constantTest = constantTest;
        this.id = startingId;
        startingId++;
    }

    //Base node for the beta network
    var ReteNode = function(parent){
        this.type = "reteNode";
        this.children = [];
        this.parent = parent;
        this.id = startingId;
        startingId++;
    }

    //Beta Memory Stores tokens
    var BetaMemory = function(){
        ReteNode.call(this);
        this.isMemoryNode = true;
        this.items = [];
        this.children = [];
    }

    //Join Node combines tokens with wmes
    var JoinNode = function(alphaMemory,tests,ancestor){
        ReteNode.call(this);
        this.type = "JoinNode";
        this.alphaMemory = alphaMemory;
        this.tests = tests;
        this.ancestor = ancestor;
    }

    //ie:field1 = "first",field2 = "x"
    //used to compare bindings, stored in joinNodes
    var TestAtJoinNode = function(field1,field2){
        this.field1 = field1;//the name of the variable in wme
        this.field2 = field2;//the bound name
        this.id = startingId;
        startingId++;
    }

    //Storage for a token blocked by a wme
    var NegativeJoinResult = function(owner,wme){
        this.owner = owner;
        this.wme = wme;
        this.id = startingId;
        startingId++;
    }

    //Negative Node:The node that gates token progression
    var NegativeNode = function(alphaMemory,tests,ancestor){
        ReteNode.call(this);
        this.isNegativeNode = true;
        this.items = [];
        this.alphaMemory = alphaMemory;
        this.tests = tests;
        this.ancestor = ancestor;
    };

    //NCC : gates token progression based on a subnetwork
    var NegatedConjunctiveCondition = function(partnerNode){
        ReteNode.call(this);
        this.isAnNCCNode = true;
        this.items = [];
        this.partner = partnerNode;
    };


    //The partner of the NCC, connects to the subnetwork
    var NegConjuConPartnerNode = function(nccNode){
        this.isAnNCCPartnerNode = true;
        this.nccNode = nccNode;
        this.numberOfConjuncts = 0;
        this.newResultBuffer = [];
        this.id = startingId;
        this.type = "NCCPartnerNode";
        startingId++;
    };

    //condition:
    //tests: tuples (testField,testValue,comparisonFunction?)
    //bindings: tuples (wmeVariableName,boundVariableName)
    var Condition = function(tests,bindings){
        this.constantTests = tests;
        this.bindings = bindings;
    };

    //The rule/production that stores conditions and
    //associated action
    var Rule = function(name,action,conditions){

    };
    
    //--------------------
    //DataStructures interface
    var DataStructures = {


    };
    
    return DataStructures;
});
