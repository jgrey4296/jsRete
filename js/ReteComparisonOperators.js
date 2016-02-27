/**
   @file ReteComparisonOperators
   @purpose To define the possible operators available for constant test nodes
*/

//Define an object of comparisons able to
//be used in constant tests
"use strict";
//See general utils file for converting to string
//TODO: These can be changed to their actual representations, similar to reteArithActions
var ConstantTestOperators = {
    "EQ" : function(a,b){
        return a===b;
    },
    "LT" : function(a,b){
        return a < b;
    },
    "GT" : function(a,b){
        return a > b;
    },
    "LTE" : function(a,b){
        return a <= b;
    },
    "GTE": function(a,b){
        return a >= b;
    },
    "NE" : function(a,b){
        return a !== b;
    },
    "MATCH" : function(a,b){
        var regex = new RegExp(b);
        return regex.test(a);
    }
};

ConstantTestOperators['==='] = ConstantTestOperators.EQ;
ConstantTestOperators['<'] = ConstantTestOperators.LT;
ConstantTestOperators['>'] = ConstantTestOperators.GT;
ConstantTestOperators['<='] = ConstantTestOperators.LTE;
ConstantTestOperators['>='] = ConstantTestOperators.GTE;
ConstantTestOperators['!=='] = ConstantTestOperators.NE;
ConstantTestOperators['~='] = ConstantTestOperators.MATCH;


module.exports = ConstantTestOperators;
