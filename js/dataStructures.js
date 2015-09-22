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
        this.bindings = bindings || {};

        this.id = startingID;
        startingId++;        
    }

    //Alpha Memory node
    var AlphaMemory = function(parent){
        this.items = [];
        this.parent = parent;
        this.parent.outputMemory = this;
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
    var AlphaNode = function(parent,constantTest){
        this.parent = parent;
        this.parent.children.unshift(this);
        this.outputMemory = undefined;
        this.children = [];
        this.testField = constantTest[0];
        this.testValue = constantTest[1];
        this.testOperator = constantTest[2] || 'EQ';
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
    var BetaMemory = function(parent){
        ReteNode.call(this,parent);
        this.isBetaMemory = true;
        this.isMemoryNode = true;
        this.dummy = dummy;
        this.items = [];
        if(parent === undefined){
            this.dummy = parent;
            this.items.push(new Token());
        }
        this.children = [];
    }

    //Join Node combines tokens with wmes
    //tests are the binding tuples from a condition
    var JoinNode = function(parent,alphaMemory,tests){
        ReteNode.call(this,parent);
        this.type = "JoinNode";
        this.isJoinNode = true;
        this.alphaMemory = alphaMemory;
        this.tests = tests;
        this.parent.children.unshift(this);
        this.alphaMemory.children.unshift(this);
        this.alphaMemory.referenceCount += 1;
        this.nearestAncestor = null;
    }

    //ie:field1 = "first",field2 = "x"
    //used to compare bindings, stored in joinNodes
    
    var TestAtJoinNode = function(field1,field2){
        this.wmeField = field1;//the name of the variable in wme
        this.boundVar = field2;//the bound name
        //TODO : this.operator
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
    var NegativeNode = function(parent,alphaMemory,tests){
        ReteNode.call(this,parent);
        this.isNegativeNode = true;
        this.items = [];
        this.alphaMemory = alphaMemory;
        this.alphaMemory.referenceCount+;
        this.tests = tests;
        this.parent.children.unshift(this);
        this.alphaMemory.children.unshift(this);
        this.nearestAncestor = null;
    };

    //NCC : gates token progression based on a subnetwork
    var NegatedConjunctiveConditionNode = function(parent){
        ReteNode.call(this,parent);
        this.isAnNCCNode = true;
        this.items = [];
        this.partner = null;
        this.parent.children.unshift(this);
    };


    //The partner of the NCC, connects to the subnetwork
    var NegConjuConPartnerNode = function(parent,num){
        ReteNode.call(this,parent);
        this.isAnNCCPartnerNode = true;
        this.nccNode = null;
        this.numberOfConjuncts = num;
        this.newResultBuffer = [];
        this.id = startingId;
        this.type = "NCCPartnerNode";
        this.parent.children.unshift(this);

    };

    //Test: (wme.)a = 5
    var Test = function(testWmeField,operator,testValue){
        this.field = testWmeField;
        this.operator = operator;
        this.value = testValue;
    };
    
    //condition:
    //tests: triples (testField,operator,testValue)
    //bindings: tuples (wmeVar,boundVar)
    var Condition = function(tests,bindings,negative){
        if(!negative){
            this.isPositive = true;
        }else{
            this.isNegative = true;
        }
        this.constantTests = [];
        this.bindings = [];
        
        for(var i in tests){
            var v = tests[i];
            var test = new Test(v[0],v[1],v[2]);
            this.constantTests.push(test);
        }
        for(var i in bindings){
            var v = bindings[i];
            var binding = [v[0],v[1]];
            this.bindings.push(binding);
        }
        this.bindings.sort(function(a,b){
            if(a[0] < b[0]) return -1;
            if(a[0] > b[0]) return 1;
            return 0;
        });
    };

    var NCCCondition = function(conditions){
        this.isNCCCondition = true;
        this.conditions = [];
        for(var i in conditions){
            var cond = new Condition(conditions[i][0],conditions[i][1],conditions[i][2]);
            this.conditions.push(cond);
        }
    }
    
    //The rule/production that stores conditions and
    //associated action
    var Rule = function(name,conditions,action){
        this.name = name;
        this.action = action;
        this.conditions = [];
        for(var i in conditions){
            //[[tests+], [bindings+], ncc?]
            var v = conditions[i];
            if(v.length > 1){
                var cond = new Condition(conditions[i][0],conditions[i][1],conditions[i][2]);
            }else{
                //NCC conditions are just wrapped in an array
                var cond = new NCCCondition(conditions[0][0]);
            }
            this.conditions.push(cond);
        }
    };

    var ActionNode = function(parent,action,name){
        ReteNode.call(this,parent);
        this.isActionNode = true;
        this.name = name;
        this.action = action;
        this.parent.children.unshift(this);
    };

    var ReteNet = function(){
        this.dummyBetaMemory = new BetaMemory();
        this.rootAlpha = new AlphaNode();
        this.actions = [];
    };

    
    //--------------------
    //DataStructures interface
    var DataStructures = {


    };
    
    return DataStructures;
});
