
var ArithmeticActions = require('./ReteArithmeticActions'),
    _ = require('underscore'),
    ReteUtil = require('./ReteUtilities'),
    RDS = require('./ReteDataStructures');

"use strict";

var RetractAction = {
    //this should be RETRACT
    "name" : "retract",
    propose : null,
    perform : null
};


RetractAction.propose = function(token,reteNet){
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

    //Propose the list of all wmes to retract 
    var proposedAction = new RDS.ProposedAction(reteNet,"retract", toRetract, token,
                                                reteNet.currentTime,
                                                this.timing);

    return proposedAction;
};

RetractAction.perform = function(proposedAction,reteNet){
    if(proposedAction.actionType !== 'retract') { throw new Error("Expected retract"); }
    if(proposedAction.payload instanceof Array){
        var retractedWMEs = proposedAction.payload.map(d=>reteNet.retractWME(d));
    }else{
        var retractedWME = reteNet.retractWME(proposedAction.payload);
    }
    //do anything with the retracted wme(s)?
};


module.exports = RetractAction;
