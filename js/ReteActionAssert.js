
var ArithmeticActions = require('./ReteArithmeticActions'),
    _ = require('underscore'),
    ReteUtil = require('./ReteUtilities'),
    RDS = require('./ReteDataStructures');

"use strict";

var AssertAction = {
    "name" : "assert",
    proposeFunc : null,
    performFunc : null
};

//Propose the action
AssertAction.proposeFunc = function(token,reteNet){
    //create the data object:
    //initialise from the action's 'values' object
    var newWMEData = _.reduce(_.keys(this.values),function(memo,key){
        var v = this.values[key];
        //if the value starts with # or $, look it up in the token list
        memo[key] = v.match(/^[\$#]/) === null ? v : token.bindings[v.slice(1)];
        return memo;
    },{bindings: {} },this);

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
    
    //DONT create the wme, just store the data for it
    //To be returned to activateActionNode
    var proposedAction = new RDS.ProposedAction(reteNet,"assert", complexFormData, token,
                                                reteNet.currentTime,
                                                this.timing);

    return proposedAction;        
};

//Perform the action
AssertAction.performFunc = function(reteNet,proposedAction){
    //check the type matches
    if(proposedAction.actionType !== 'assert') { throw new Error("Expected Assert"); }
    //Perform the action:
    var newWMEID = reteNet.assertWME(proposedAction.payload,proposedAction.retractTime);

    //schedule the retraction:
    if(proposedAction.timing.unperformOffset > 0){
        //schedule a retract, with no invalidate time (its not being proposed)
        //and the perform time being the original actions unperformoffset
        reteNet.addToSchedule(new RDS.ProposedAction(reteNet,"retract",newWMEId,null,reteNet.currentTime,{
            invalidateOffset : null,
            performOffset : proposedAction.timing.unperformOffset,
            unperformOffset : null
        }));
    }
};


module.exports = AssertAction;