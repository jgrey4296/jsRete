/**
   @file ReteArithmeticActions
   @purpose to define the arithmetic that an action can perform on a value
*/
var _ = require('underscore');

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

module.exports = ArithmeticActions;
    

