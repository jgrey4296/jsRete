/**
   Defines Arithmetic Actions that the retenet can perform
   @module
*/

/** Add two values */
let plus = function(a,b){
    return a + b;
},
    /** Subtract two values */
    minus = function(a,b){
        return a - b;
    },
    /** Multiply two values */
    mult = function(a,b){
        return a * b;
    },
    /** Divide two values */
    div = function(a,b){
        return a / b;
    };

let ArithmeticOperators = {
    '+' : plus,
    '-' : minus,
    '*' : mult,
    '/' : div
};

export default ArithmeticOperators;
