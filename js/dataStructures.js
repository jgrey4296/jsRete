/**
   Data structures required for a rete net:
   Nodes, wmes, join results, tokens...
*/

if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

define([],function(){
    var startingId = 0;

    
    var WME = function(data){
        this.data = data;
        this.alphaMemoryItems = [];
        this.tokens = [];
        this.negJoinResults = [];
        this.id = startingId;
        startingId++;
    };

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

        this.bindings = bindings | {};

        this.id = startingID;
        startingId++;        
    }

    var AlphaMemory = function(){
        this.items = [];
        this.childNodes = [];
        this.referenceCount = 0;
        this.isMemoryNode = true;
        this.id = startingId;
        startingId++;
    }

    var ItemInAlphaMemory = function(wme,alphaMem){
        this.wme = wme;
        this.alphaMemory = alphaMem;
        this.id = startingId;
        startingId++;
    }

    var ReteNode = function(parent){
        this.type = "reteNode";
        this.children = [];
        this.parent = parent;
        this.id = startingId;
        startingId++;
    }

    var BetaMemory = function(){
        ReteNode.call(this);
        this.isMemoryNode = true;
        this.items = [];
        this.children = [];
    }

    var JoinNode = function(alphaMemory,tests,ancestor){
        ReteNode.call(this);
        this.type = "JoinNode";
        this.alphaMemory = alphaMemory;
        this.tests = tests;
        this.ancestor = ancestor;
    }

    //ie:field1 = "first",field2 = "x"
    var TestAtJoinNode = function(field1,field2){
        this.field1 = field1;//the name of the variable in wme
        this.field2 = field2;//the bound name
        this.id = startingId;
        this.id = startingId;
        startingId++;
    }
    
    var NegativeJoinResult = function(owner,wme){
        this.owner = owner;
        this.wme = wme;
        this.id = startingId;
        startingId++;
    }

    var NegativeNode = function(alphaMemory,tests,ancestor){
        ReteNode.call(this);
        this.isNegativeNode = true;
        this.items = [];
        this.alphaMemory = alphaMemory;
        this.tests = tests;
        this.ancestor = ancestor;
    };

    var NegatedConjunctiveCondition = function(partnerNode){
        ReteNode.call(this);
        this.isAnNCCNode = true;
        this.items = [];
        this.partner = partnerNode;
    };

    var NegConjuConPartnerNode = function(nccNode){
        this.isAnNCCPartnerNode = true;
        this.nccNode = nccNode;
        this.numberOfConjuncts = 0;
        this.newResultBuffer = [];
        this.id = startingId;
        this.type = "NCCPartnerNode";
        startingId++;
    };
    
    //--------------------
    var DataStructures = {


    };
    
    return DataStructures;
});
