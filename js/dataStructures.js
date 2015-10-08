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
        //Alpha memories the wme is part of
        this.alphaMemoryItems = [];
        //Tokens the wme is part of
        this.tokens = [];
        //Tokens this wme is blocking
        this.negJoinResults = [];
        this.id = startingId;
        startingId++;
    };

    //base token,
    //bindings are updated as the token progresses
    var Token = function(parentToken,wme,owningNode,bindings){
        this.isToken = true;
        this.parentToken = parentToken; //ie:owner
        this.wme = wme;
        this.owningNode = owningNode;
        this.children = []; //list of nodes
        this.negJoinResults = [];//list of NegativeJoinResults
        this.nccResults = []; //list of Token
        if(this.parentToken){
            this.parentToken.children.unshift(this);
        }
        if(this.wme && this.wme.tokens){
            this.wme.tokens.unshift(this);
        }

        //copy over bindings from parent,
        //then copy in new bindings
        this.bindings = {};

        //this may not be needed
        if(this.parentToken && this.parentToken.bindings){
            for(var i in this.parentToken.bindings){
                this.bindings[i] = this.parentToken.bindings[i];
            }            
        }
        
        for(var i in bindings){
            this.bindings[i] = bindings[i];
        }

        this.id = startingId;
        startingId++;        
    };

    //Test: (wme.)a = 5
    var ConstantTest = function(testWmeField,operator,testValue){
        this.isConstantTest = true;
        this.field = testWmeField;
        this.operator = operator;
        this.value = testValue;
        this.id = startingId;
        startingId++;
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
            var test = new ConstantTest(v[0],v[1],v[2]);
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
        this.id = startingId;
        startingId++;
    };


    //pretty much just wraps an array of conditions
    var NCCCondition = function(conditions){
        this.isNCCCondition = true;
        this.conditions = [];
        for(var i = 0; i < conditions.length; i++){
            //conditions should be in array form
            var cond = new Condition(conditions[i][0],conditions[i][1],conditions[i][2]);
            this.conditions.push(cond);
        }
        this.id = startingId;
        startingId++;
    };
    
    

    //The rule/production that stores conditions and
    //associated action
    var Rule = function(name,conditions,action){
        this.name = name;
        this.action = action;
        this.conditions = [];
        for(var i in conditions){
            //[[tests+], [bindings+], ncc?]
            var v = conditions[i];
            if(v.length > 0){
                if(v[0] !== '!'){
                    var cond = new Condition(conditions[i][0],conditions[i][1],conditions[i][2]);
                    this.conditions.push(cond);
                }else{
                    var cond = new NCCCondition(conditions[1][0]);
                    this.conditions.push(cond);
                }
            }
        }
        this.id = startingId;
        startingId++;
    };

 
    //Utility storage of wme and its alphaMemory together
    //used in alphamemory and WME
    var AlphaMemoryItem = function(wme,alphaMem){
        this.wme = wme;
        this.alphaMemory = alphaMem;
        this.id = startingId;
        startingId++;
    };
    
    //A constant test node
    //constantTest = {field:"",value:"",operator:""};
    var AlphaNode = function(parent,constantTest){
        this.id = startingId;
        this.isConstantTestNode = true;
        this.parent = parent;
        if(this.parent && this.parent.children){
            this.parent.children.unshift(this);
        }
        this.children = [];
        this.outputMemory = undefined;
        if(constantTest){
            this.testField = constantTest['field'];
            this.testValue = constantTest['value'];
            this.operator = constantTest['operator'];
        }else{
            this.passThrough = true;
        }
        startingId++;
    };

   
    //Alpha Memory node
    var AlphaMemory = function(parent){
        this.isAlphaMemory = true;
        this.items = [];
        this.parent = parent;
        //If adding to a node other than a test node,
        if(parent && parent.isConstantTestNode === undefined){
            //add to children
            this.parent.children.unshift(this);
        }else if(this.parent && this.parent.outputMemory === undefined){
            //if an alphanode, set the ouputmemory field
            this.parent.outputMemory = this;
        }else if(this.parent && this.parentOutputMemory !== undefined){
            throw new Error("trying to create an alpha memory for a node that already has one");
        }
        this.children = [];
        this.unlinkedChildren = [];
        this.referenceCount = 0;
        this.isMemoryNode = true;
        this.id = startingId;
        startingId++;
    };

    
    //Base node for the beta network
    var ReteNode = function(parent){
        this.children = [];
        this.parent = parent;
        if(this.parent && this.parent.children){
            this.parent.children.unshift(this);
        }
        this.id = startingId;
        startingId++;
    };

    //Beta Memory Stores tokens
    var BetaMemory = function(parent){
        ReteNode.call(this,parent);
        this.isBetaMemory = true;
        this.isMemoryNode = true;
        this.items = [];
        if(parent === undefined){
            this.dummy = true;
            this.items.push(new Token());
            this.items[0].owningNode = this;
        }
        this.children = [];
        this.unlinkedChildren = [];

    };

    //Join Node combines tokens with wmes
    //tests are the binding tuples from a condition
    var JoinNode = function(parent,alphaMemory,tests){
        ReteNode.call(this,parent);
        this.isJoinNode = true;
        this.alphaMemory = alphaMemory;
        if(tests){
            this.tests = tests;
        }else{
            this.tests = [];
        }
        if(this.alphaMemory && this.alphaMemory.children){
            this.alphaMemory.children.unshift(this);
            this.alphaMemory.referenceCount += 1;
        }
        this.nearestAncestor = null;
    };

    
    var ActionNode = function(parent,action,name){
        ReteNode.call(this,parent);
        this.isActionNode = true;
        this.name = name;
        this.action = action;
    };



    
    //Storage for a token blocked by a wme
    //Updates the owner token and wme as part of its construction
    var NegativeJoinResult = function(owner,wme){
        this.owner = owner;
        if(this.owner){
            this.owner.negJoinResults.unshift(this);
        }
        this.wme = wme;
        if(this.wme){
            this.wme.negJoinResults.unshift(this);
        }
        this.id = startingId;
        startingId++;
    };

    //Negative Node:The node that gates token progression
    var NegativeNode = function(parent,alphaMemory,tests){
        if(tests.length === 0){
            throw new Error("Negative Node can't handle no bindings");
        }
        ReteNode.call(this,parent);
        this.isNegativeNode = true;
        this.items = [];
        this.alphaMemory = alphaMemory;
        if(this.alphaMemory){
            this.alphaMemory.referenceCount++;
            this.alphaMemory.children.unshift(this);
        }
        this.tests = tests;
        this.nearestAncestor = null;
    };

    //NCC : gates token progression based on a subnetwork
    //SEE ALSO: NCCCondition
    //old: NegatedConjunctiveConditionNode
    var NCCNode = function(parent){
        ReteNode.call(this,parent);
        this.isAnNCCNode = true;
        this.items = [];
        this.partner = null;
    };


    //The partner of the NCC, connects to the subnetwork
    //old NegConjuConPartnerNode
    //var NCCPartner
    var NCCPartnerNode = function(parent,num){
        ReteNode.call(this,parent);
        this.isAnNCCPartnerNode = true;
        this.nccNode = null;
        this.numberOfConjuncts = num;
        this.newResultBuffer = [];
        this.id = startingId;
    };
    

    var ReteNet = function(){
        this.dummyBetaMemory = new BetaMemory();
        this.rootAlpha = new AlphaNode();
        this.actions = [];
        this.allWMEs = [];
        this.allWMEs.__isAllWMEs = true;
    };

    
    //--------------------
    //DataStructures interface
    var DataStructures = {
        "WME"              : WME,
        "Token"            : Token,
        "AlphaMemory"      : AlphaMemory,
        "AlphaMemoryItem"  : AlphaMemoryItem,
        "AlphaNode"        : AlphaNode,
        "ReteNode"         : ReteNode,
        "BetaMemory"       : BetaMemory,
        "JoinNode"         : JoinNode,
        "NegativeJoinResult":NegativeJoinResult,
        "NegativeNode"     : NegativeNode,
        "NCCNode"          : NCCNode,
        "NCCPartnerNode"   : NCCPartnerNode ,
        "Test"             : ConstantTest,
        "ConstantTest"     : ConstantTest,
        "Condition"        : Condition,
        "NCCCondition"    : NCCCondition,
        "Rule"             : Rule,
        "ActionNode"       : ActionNode,
        "ReteNet"          : ReteNet
    };
    
    return DataStructures;
});
