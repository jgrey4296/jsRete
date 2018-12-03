/**
   @module ReteTestExecution
   @requires ReteDataStructures
   @requires lodash
   @requires ReteUtilities
   @requires ReteComparisonOperators
*/
import _ from 'lodash';
import * as ReteUtil from './ReteUtilities';
import ReteComparisonOps from './ReteComparisonOperators';

/**
   Compare a token and wme, using defined bindings from a joinNode
   @param joinNode
   @param token
   @param wme
   @function performJoinTests
   @returns {False | Object}
*/
let performJoinTests = function(joinNode,token,wme){
    
    //returns False if no match, dict of all updated bindings otherwise
    let newBindings = {},
        successState = true,
        varRegex = new RegExp(/^\${(\w+)}/);
    //Populate with current bindings from token
    _.keys(token.bindings).forEach((key) => {
        newBindings[key] = token.bindings[key];
    });

    try {
        //add new bindings:
        joinNode.tests.forEach((test) => {
            let newValue = null;
            //retrieve the value
            if (/^[#$]id$/.test(test[1][0])){
                newValue = wme.id;
            } else {
                newValue = ReteUtil.retrieveWMEValueFromDotString(wme,test[1][0]);
            }
            
            //compare the value for each specified binding test
            let bindingComparisons = test[1][1];
            
            //Compare using any defined binding tests
            bindingComparisons.forEach((d) => {
                let comparator = ReteComparisonOps[d[0]],
                    varName = d[1],
                    match = varRegex.exec(varName);
                //if it fails, fail the test
                //use the value in the test, minus the $ at the beginning:
                if (match === null) { throw new Error("No bound let name"); }
                //if (!varRegex.test(varName)) { throw new Error("Non-bound let name"); }
                                
                if (!comparator(newValue,newBindings[match[1]])){
                    throw new Error("Test failed");
                }
            });
            
            if (newBindings[test[0]] === undefined){
                newBindings[test[0]] = newValue;
            }
            if (newBindings[test[0]] !== newValue){
                throw new Error("Test failed");
            }
        });
        
        if (successState){
            return newBindings;
        }
        throw new Error("Test failed");
    } catch (e) {
        return false;
    }
};

export default performJoinTests;

