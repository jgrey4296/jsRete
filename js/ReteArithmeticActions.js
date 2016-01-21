/**
   @file ReteArithmeticActions
   @purpose to define the arithmetic that an action can perform on a value
*/
if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

define(['underscore'],function(_){
    "use strict";
    var ArithmeticActions = {
        "+" : function(a,b){
            console.log("Adding:",a,b,"Result:",a+b);
            return a + b;
        },
        "-" : function(a,b){
            return a - b;
        },
        "*" : function(a,b){
            return a * b;
        },
        "/" : function(a,b){
            return a / b;
        },
    };

    return ArithmeticActions;
    
});
