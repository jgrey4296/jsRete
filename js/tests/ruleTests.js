/**
   Testing Different Rules, and rule creation
 */
if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

var ds = require('../dataStructures');
var pr = require('../procedures');

exports.__template = {
    //a simple example of creating a rule
    startTest : function(test){
        //create a network of a few rules
        var reteNet = new ds.ReteNet();
        var testValue = 0;
        var aRule = new ds.Rule("simpleRule",
                                [//conditions
                                    [//c1
                                        [//tests
                                            //test1
                                            ['first','EQ',5]
                                        ],//end of tests
                                        //bindings and neg?
                                        //token.a = wme.first;
                                        [],false
                                    ]//end of c1
                                ],//end of conditions
                                //the Action
                                function(){
                                    testValue += 5;
                                });
        test.done();
    },

    
    //proposed simpler rule creation:
    simpleTest : function(test){
        var reteNet = new ds.ReteNet();
        var rule = reteNet.newRule("simpleRule");
        rule.addCondition().addTest(["first","EQ",5])
            .addTest(["second","EQ",10]);
        //.makeNegative();
        //.addBinding({"a":"first"});

        rule.addCondition().addTest(["first","EQ",10])
            .addTest(["second","EQ","BOB"])
            .addBinding({a:"second"});
        
        rule.addAction(function(){
            testValue += 5;
        });

    },
    
};
