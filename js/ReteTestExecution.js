/**
   @module ReteTestExecution
   @requires ReteDataStructures
   @requires underscore
   @requires ReteUtilities
   @requires ReteComparisonOperators
 */
var RDS = require('./ReteDataStructures'),
    _ = require('underscore'),
    ReteUtil = require('./ReteUtilities'),
    ReteComparisonOps = require('./ReteComparisonOperators');

"use strict";
/**
   Compare a token and wme, using defined bindings from a joinNode
   @param joinNode
   @param token
   @param wme   
   @function performJoinTests
   @returns {False | Object}
*/
var performJoinTests = function(joinNode,token,wme){
    "use strict";
    //returns False if no match, dict of all updated bindings otherwise
    var newBindings = {},
        successState = true,
        varRegex = new RegExp(/^\${(\w+)}/);
    //Populate with current bindings from token
    _.keys(token.bindings).forEach(function(key){
        newBindings[key] = token.bindings[key];
    });

    try{
        //add new bindings:
        joinNode.tests.forEach(function(test){
            var newValue = null;
            //retrieve the value
            if(/^[#\$]id$/.test(test[1][0])){
                newValue = wme.id;
            }else{
                newValue = ReteUtil.retrieveWMEValueFromDotString(wme,test[1][0]);
            }
            
            //compare the value for each specified binding test
            var bindingComparisons = test[1][1];
            
            //Compare using any defined binding tests
            bindingComparisons.forEach(function(d){
                let comparator = ReteComparisonOps[d[0]],
                    varName = d[1],
                    match = varRegex.exec(varName);
                //if it fails, fail the test
                //use the value in the test, minus the $ at the beginning:
                if(match === null) { throw new Error("No bound var name"); }
                //if(!varRegex.test(varName)) { throw new Error("Non-bound var name"); }
                                
                if(!comparator(newValue,newBindings[match[1]])){
                    throw new Error("Test failed");
                }
            });
            
            if(newBindings[test[0]] === undefined){
                newBindings[test[0]] = newValue;
            }
            if(newBindings[test[0]] !== newValue){
                throw new Error("Test failed");
            }
        });
        
        if(successState){
            return newBindings;
        }else{
            throw new Error("Test failed");
        }
    }catch(e){
        return false;
    }
};


var moduleInterface = {
    "performJoinTests" : performJoinTests,
};
module.exports =  moduleInterface;
