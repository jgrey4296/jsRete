if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

define(['./ReteDataStructures','underscore','./ReteUtilities'],function(RDS,_,ReteUtil){
    "use strict";
    /**
       @function performJoinTests
       @purpose compare a token and wme, using defined bindings from a joinNode
       @return False if no match, dict of all updated bindings otherwise
     */
    var performJoinTests = function(joinNode,token,wme){
        var newBindings = {};
        
        //Populate with current bindings from token
        _.keys(token.bindings).forEach(function(key){
            newBindings[key] = token.bindings[key];
        });

        var successState = true;
        
        //add new bindings:
        joinNode.tests.forEach(function(test){
            var newValue = null;
            if(test[1] === "#id"){
                newValue = wme.id;
            }else{
                newValue = ReteUtil.retrieveWMEValueFromDotString(wme,test[1]);
            }

            if(newBindings[test[0]] === undefined){
                newBindings[test[0]] = newValue;
            }
            if(newBindings[test[0]] !== newValue){
                successState = false;
            }
        });

        if(successState){
            return newBindings;
        }else{
            return false;
        }
    };

    
    var moduleInterface = {
        "performJoinTests" : performJoinTests,
    };
    return moduleInterface;
});
