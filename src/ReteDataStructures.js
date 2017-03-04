/**
   Defines the data structures required for the Net
   @module ReteDataStructures
   @requires lodash
*/
import _ from 'lodash';

let nextId = 0;


/**
   Describes a queued, but not yet performed, action
   @param reteNet
   @param type
   @param payload
   @param token
   @param proposeTime
   @param timingObj
   @param priority
   @param tags
   @class ProposedAction
   queue/invalidate time absolute,
   assertTime/retractTime relative to when action is enacted
*/
let ProposedAction = function(reteNet,type,payload,token,proposeTime,timingObj,priority,tags){
    this.id = nextId++;
    this.type = "ProposedAction";
    this.reteNet = reteNet;
    this.actionType = type;//ie: "assert","retract","perform"...
    this.payload = payload; //ie" : {a:3,b:4}...
    this.token = token; //Source Token that spawned this action
    this.timing = {
        proposeTime : proposeTime,//when PA is created
        invalidateTime : proposeTime+ (timingObj ? timingObj.invalidateOffset : 0), //when it becomes invalid
        performOffset : timingObj ? timingObj.performOffset : 0, //PerformTime+pO is when it happens
        unperformOffset : timingObj ? timingObj.unperformOffset : 0 //PerformTime+uPO when to remove
    };
    this.priority = priority || 0;
    this.tags = tags || {};
    //todo: possibly include metrics for selection of actions?
    //todo: check for circular reference cleanup
    //update Token:
    if (this.token && this.token.proposedActions){
        this.token.proposedActions.push(this);
    }
};


/**
   Stores facts in the rete net
   @param data
   @param assertTime
   @class WME
*/
let WME = function(data,assertTime){
    this.id = nextId++;
    this.type = "WME";
    this.data = data;
    //The lifetime of the wme. Asserted at time lifeTime[0],
    //retracted at time lifeTime[1]:
    if (assertTime === undefined) { assertTime = 0; }
    this.lifeTime = [assertTime];
    //Alpha memories the wme is part of
    this.alphaMemoryItems = [];
    //Tokens the wme is part of
    this.tokens = [];
    //Tokens this wme is blocking
    this.negJoinResults = [];
};

/**
   Represents intermediate results in the beta network
   @param parentToken
   @param wme
   @param owningNode
   @param bindings
   @class Token
*/
let Token = function(parentToken,wme,owningNode,bindings){
    this.id = nextId++;
    this.type = "Token";
    //bindings are updated as the token progresses
    this.parentToken = parentToken; //ie:owner
    this.wme = wme;
    this.owningNode = owningNode;
    this.children = []; //list of tokens
    this.negJoinResults = [];//list of blocking NegativeJoinResults
    this.nccResults = []; //list of blocking Tokens
    this.proposedActions = []; //current proposed actions
    
    if (this.parentToken){
        this.parentToken.children.unshift(this);
    }
    if (this.wme && this.wme.tokens){
        this.wme.tokens.unshift(this);
    }

    //copy over bindings from parent,
    //then copy in new bindings
    this.bindings = {};

    if (this.parentToken && this.parentToken.bindings){
        _.keys(this.parentToken.bindings).forEach(function(d){
            this.bindings[d] = this.parentToken.bindings[d];
        },this);
    }
    _.keys(bindings).forEach(function(d){
        this.bindings[d] = bindings[d];
    },this);

};

//------------------------------

/**
   A Pairing of a wme with an alpha memory it resides in
   @param wme
   @param alphaMem
   @class AlphaMemoryItem
*/
//Utility storage of wme and its alphaMemory together
//used in alphamemory and WME
let AlphaMemoryItem = function(wme,alphaMem){
    this.id = nextId++;
    this.type = "AlphaMemoryItem";
    this.wme = wme;
    this.alphaMemory = alphaMem;
};


/**
   A node to perform constant tests on newly asserted WMEs
   constantTest = {field: string, value: string ,operator: string};
   @param parent
   @param constantTestSpec
   @class AlphaNode
*/

let AlphaNode = function(parent,constantTestSpec){
    this.id = nextId++;
    this.type = "AlphaNode";
    this.parent = parent;
    if (this.parent && this.parent.children){
        this.parent.children.unshift(this);
    }
    this.children = [];
    this.outputMemory = undefined;
    if (constantTestSpec){
        this.testField = constantTestSpec.field;
        this.testValue = constantTestSpec.value;
        this.operator = constantTestSpec.operator;
    } else {
        this.passThrough = true;
    }
};

/**
   To store wmes that have passed through constant tests
   @param parent
   @class AlphaMemory
*/
let AlphaMemory = function(parent){
    this.id = nextId++;
    this.type = "AlphaMemory";
    this.items = [];
    this.parent = parent;
    //If adding to a node other than a test node,
    if (this.parent && !(this.parent instanceof AlphaNode)){
        //add to children
        //this.parent.children.unshift(this);
        throw new Error("Adding alpha memory as child of not a test");
    } else if (this.parent && this.parent instanceof AlphaNode && this.parent.outputMemory === undefined){
        //if an alphanode, set the ouputmemory field
        this.parent.outputMemory = this;
    } else {
        throw new Error("trying to create an alpha memory for a node that already has one");
    }
    this.children = [];
    this.unlinkedChildren = [];
    this.referenceCount = 0;
};

/**
   Provides a base definition of a node in the rete network
   @class ReteNode

*/
//Base node for the beta network
let ReteNode = function(parent){
    this.id = nextId++;
    this.type = "ReteNode";
    this.children = [];
    this.unlinkedChildren = [];
    this.parent = parent;
    if (this.parent && this.parent.children){
        this.parent.children.unshift(this);
    }
};

/**
   A Node to store tokens in the rete network
   @param parent
   @class BetaMemory
   @augments ReteNode
*/
let BetaMemory = function(parent){
    ReteNode.call(this,parent);
    this.type = "BetaMemory";
    this.items = [];
    if (parent === undefined){
        this.dummy = true;
        this.items.push(new Token());
        this.items[0].owningNode = this;
    }
};

/**
   To combine tokens and wmes, according to binding tests
   @class JoinNode
   @augments ReteNode
*/
let JoinNode = function(parent,alphaMemory,tests){
    //Join Node combines tokens with wmes
    //tests are the binding tuples from a condition
    ReteNode.call(this,parent);
    this.type = "JoinNode";
    this.alphaMemory = alphaMemory;
    if (tests){
        this.tests = tests;
    } else {
        this.tests = [];
    }
    if (this.alphaMemory && this.alphaMemory.children){
        this.alphaMemory.children.unshift(this);
        this.alphaMemory.referenceCount += 1;
    }
    this.nearestAncestor = null;
    this.items = [];
};

/**
   A Node which, when activated, will cause the effects a rule describes
   @param parent
   @param actionDescriptions
   @param boundActions
   @param ruleName
   @param reteNet
   @augments ReteNode
   @class ActionNode
*/
let ActionNode = function(parent,actionDescriptions,boundActions,ruleName,reteNet){
    //Container object for a general graphnode action description
    ReteNode.call(this,parent);
    this.type = "ActionNode";
    this.name = ruleName;
    this.actionDescriptions = actionDescriptions;
    this.boundActions = boundActions;
    //reference to retenet, to allow storage of results of firing:
    this.reteNet = reteNet;
};


/**
   To Store the combination of a token and a wme that blocks it from progressing through the network
   @param owner the token
   @param wme the wme
   @class NegativeJoinResult
*/
let NegativeJoinResult = function(owner,wme){
    //Storage for a token blocked by a wme
    //Updates the owner token and wme as part of its construction
    this.id = nextId++;
    this.type = "Negative Join Result";
    this.owner = owner;
    if (this.owner){
        this.owner.negJoinResults.unshift(this);
    }
    this.wme = wme;
    if (this.wme){
        this.wme.negJoinResults.unshift(this);
    }
};


/**
   A Node that tests for the abscence of particular wmes
   @param parent
   @param alphaMemory
   @param tests
   @class NegativeNode
   @augments ReteNode
*/
let NegativeNode = function(parent,alphaMemory,tests){
    ReteNode.call(this,parent);
    this.type = "Negative Node";
    this.items = [];
    this.alphaMemory = alphaMemory;
    if (this.alphaMemory){
        this.alphaMemory.referenceCount++;
        this.alphaMemory.children.unshift(this);
    }
    this.tests = tests || [];
    this.nearestAncestor = null;
};

/**
   The generalisation of the negative node to multiple conditions, forms the leaf of a subnetwork
   @param parent
   @class NCCNode
   @augments ReteNode
   @see {@link NCCondition}
*/
let NCCNode = function(parent){
    //NCC : gates token progression based on a subnetwork
    //don't pass parent in so you can PUSH instead of SHIFT
    ReteNode.call(this);
    this.type = "NCCNode";
    this.parent = parent;
    if (this.parent && this.parent.children){
        this.parent.children.push(this);
    }
    /**
       @type {Array.<RDS.Token>}
     */
    this.items = [];
    this.partner = null;
};


/**
   To store potential partial matches in the subnetwork for a NCCNode.
   @param parent
   @param num
   @class NCCPartnerNode
*/
let NCCPartnerNode = function(parent,num){
    //get the parent if parent is a beta memory to stop redundant node usage
    ReteNode.call(this,parent);
    this.type = "NCCPartnerNode";
    this.nccNode = null;
    this.numberOfConjuncts = num;
    this.newResultBuffer = [];
    this.id = nextId;
};



//--------------------
export {
    WME,
    Token,
    AlphaMemory,
    AlphaMemoryItem,
    AlphaNode,
    ReteNode,
    BetaMemory,
    JoinNode,
    NegativeJoinResult,
    NegativeNode,
    NCCNode,
    NCCPartnerNode,
    ActionNode,
    ProposedAction
};


