/**
   Defines Arithmetic Actions that the retenet can perform
   @module
*/
var _ = require('underscore');
"use strict";

module.exports = {
    /** Add two values */
    "+" : function(a,b){
        return a + b;
    },
    /** Subtract two values */
    "-" : function(a,b){
        return a - b;
    },
    /** Multiply two values */
    "*" : function(a,b){
        return a * b;
    },
    /** Divide two values */
    "/" : function(a,b){
        return a / b;
    },
};




