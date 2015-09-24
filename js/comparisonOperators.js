if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

//Define an object of comparisons able to
//be used in constant tests
define([],function(){

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
        }
    };

    return ConstantTestOperators;

});
