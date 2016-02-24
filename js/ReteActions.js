/**
   @file ReteActions
   @purpose Defines action proposals
*/
var ArithmeticActions = require('./ReteArithmeticActions'),
    _ = require('underscore'),
    ReteUtil = require('./ReteUtilities'),
    RDS = require('./ReteDataStructures');

"use strict";
if(ArithmeticActions === undefined){
    throw new Error("Arithmetic Actions missing");
}

//Action node possible actions:
var actions = {};

//each function returns an object of the form:
//{ action: "", payload: {}, (assertionTime,retractionTime)? }
//Rete Interface.incrementTime uses the action to modify the
//state of the retenet, and so must have an implemented condition for each
//function defined here

//NOTE: these will be called after being bound to an action description,
//so 'this' refers to the information stored in an action/the action object itself,
//while the token information will be passed in

//eg: the action asserts a new wme, with an arithmetic action of +2,
//the action has the information (+ 2), the incoming token as the base value to add to.


//not in place, returns a wme to be dealt with elsewhere
//** @action assert
actions.assert = function(token,reteNet){
    //console.log("Asserting with action:",[this,token,reteNet]);
    
    //create the data object:
    //initialise from the action's 'values' object
    var newWMEData = _.reduce(_.keys(this.values),function(memo,key){
        var v = this.values[key];
        //if the value starts with # or $, look it up in the token list
        memo[key] = v.match(/^[\$#]/) === null ? v : token.bindings[v.slice(1)];
        return memo;
    },{},this);

    //If there are no 'values', create them:
    if(newWMEData.values === undefined){
        newWMEData.bindings = {};
    }
    
    //Then copy in the bindings:
    var newDataPlusBindings = _.reduce(_.keys(token.bindings),function(memo,key){
        memo.bindings[key] = token.bindings[key];            
        return memo;
    },newWMEData);
    
    //perform arithmetic:
    _.keys(this.arithmeticActions).forEach(function(key){
        var newVal = Number(newDataPlusBindings[key]);
        if(isNaN(newVal)) { throw new Error("Arithmetic value should be convertable to a number"); }
        //look up the function:
        //because the representation form is: a : ["+", 5]
        var action = ArithmeticActions[this.arithmeticActions[key][0]];
        newDataPlusBindings[key] = action(newVal,Number(this.arithmeticActions[key][1]));
    },this);

    //todo: allow for importing of other vars as the replacement values?
    _.keys(this.regexActions).forEach(function(key){
        var pair = this.regexActions[key],
            regex = new RegExp(pair[0],pair[1]),
            replaceValue = pair[2].match(/\$/) ? newDataPlusBindings[pair[2].slice(1)] : pair[2];
        newDataPlusBindings[key] = newDataPlusBindings[key].replace(regex,replaceValue);
    },this);
    
    //Expand out to object structure
    //ie: {values.a:5, tags.type: rule} -> {values:{a:5},tags:{type:rule}}
    var complexFormData = ReteUtil.objDescToObject(newWMEData);
    console.log("new wme data:",complexFormData);        

    //DONT create the wme, just store the data for it
    //To be returned to activateActionNode
    var retractTime = this.timing.retract === 0 ? 0 : reteNet.currentTime+this.timing.retract;
    var proposedAction = new RDS.ProposedAction(reteNet,"assert", complexFormData, token,
                                                reteNet.currentTime,
                                                reteNet.currentTime+this.timing.invalidate,
                                                reteNet.currentTime+this.timing.assert,
                                                retractTime;
                                                );
    return proposedAction;        
};


//** @action retract
actions.retract = function(token,reteNet){
    //get all wmes the token touches:
    var wmes = [];
    var currToken = token;
    while(currToken && currToken.wme !== undefined){
        wmes.push(currToken.wme);
        currToken = currToken.parentToken;
    }

    //get the wme ids to remove:
    var wmeIDs = _.values(token.bindings);

    //filter the wmeList by the wmeIDs:
    var toRetract = _.filter(wmes,function(wme){
        return _.contains(wmeIDs,wme.id);
    });

    var retractTime = this.timing.retract === 0 ? 0 : reteNet.currentTime+this.timing.retract;
    //return the list of all retracted wmes:
    var proposedAction = new RDS.ProposedAction(reteNet,"retract", toRetract, token,
                                                reteNet.currentTime,
                                                reteNet.currentTime+this.timing.invalidate,
                                                reteNet.currentTime+this.timing.assert,
                                                retractTime);
    return proposedAction;
};

//What other actions might i want?
//aggregate
//modify

//propose action...
//note: an actual proposed action will set action.tag.character to the char.id of
//who is to do it

//performance would be taking the data provided, and an id of a grammar node,
//combining the two, and tracing

module.exports = actions;

