if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

define(['./ReteDataStructures','underscore','./ReteUtilities','./ReteComparisonOperators'],function(RDS,_,ReteUtil,ReteComparisonOps){
    "use strict";
    /**
       @function performJoinTests
       @purpose compare a token and wme, using defined bindings from a joinNode
       @return False if no match, dict of all updated bindings otherwise
     */
    var performJoinTests = function(joinNode,token,wme){
        var newBindings = {},
            successState = true,
            varRegex = new RegExp(/^\$/);
        //Populate with current bindings from token
        _.keys(token.bindings).forEach(function(key){
            newBindings[key] = token.bindings[key];
        });


        
        try{
            //add new bindings:
            joinNode.tests.forEach(function(test){
                var newValue = null;
                //retrieve the value
                if(test[1] === "#id" || test[1] === '$id'){
                    newValue = wme.id;
                }else{
                    newValue = ReteUtil.retrieveWMEValueFromDotString(wme,test[1][0]);
                }
                
                //compare the value for each specified binding test
                var bindingComparisons = test[1][1];
                
                //Compare using any defined binding tests
                bindingComparisons.forEach(function(d){
                    var comparator = ReteComparisonOps[d[0]],
                        varName = d[1];
                    //if it fails, fail the test
                    //use the value in the test, minus the $ at the beginning:
                    if(!varRegex.test(varName)) { throw new Error("Non-bound var name"); }
                                   
                    if(!comparator(newValue,newBindings[varName.slice(1)])){
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
    return moduleInterface;
});
