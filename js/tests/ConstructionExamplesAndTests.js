/**
   Constructor examples and checks that they are appropriate
 */
var ds = require('../dataStructures');

exports.ConstructorExamples = {

    //--------------------
    //WMEs and Tokens
    //--------------------
    
    //Lets Look at the basic unit of memory: the WME
    BasicWMEExample : function(test){
        //Create a simple wme with some information in it
        var aWme = new ds.WME({
            first: "bob",
            second:"bill",
            somethingElse: "likes",
        });
        //A WME is essentially a wrapper on a dict of your info.
        test.ok(aWme.data.first === "bob");
        test.ok(aWme.data.second === "bill");
        test.ok(aWme.data.somethingElse === "likes");
        
        test.ok(aWme.alphaMemoryItems.length === 0);
        test.ok(aWme.tokens.length === 0);
        test.ok(aWme.negJoinResults.length === 0);
        
        test.done();
    },

    //If you can create a WME, you can create a token:
    BasicTokenExample : function(test){
        //Create a wme, and some arbitrary binding,
        //and wrap it in a token
        var aWme = new ds.WME({first:"bob"});
        test.ok(aWme.tokens.length === 0);

        //aToken(parentToken,wme,owningNode,bindings)
        var aToken = new ds.Token(null,aWme,null,{"a":"bob"});

        test.ok(aToken.parentToken === null);
        test.ok(aToken.owningNode === null);
        test.ok(aToken.wme !== null);
        test.ok(aToken.wme.id === aWme.id);
        test.ok(aToken.wme.data.first === "bob");
        test.ok(aToken.bindings['a'] === 'bob');

        //Check that the wme gets updated by the constructor
        //to have it in it's token list:
        test.ok(aWme.tokens.length === 1);
        test.ok(aWme.tokens[0].id === aToken.id);
        test.done();
    },

    //If you can make wmes, and tokens, you can chain them:
    ChainedTokenExample : function(test){
        var wme1 = new ds.WME({first:"bob"});
        var bindingForWme1 = {"a":"bob"};
        
        var wme2 = new ds.WME({first:"bill"});
        var bindingForWme2 = {"b":"bill"};

        test.ok(wme1.id !== wme2.id);
        test.ok(wme1.tokens.length === 0);
        test.ok(wme2.tokens.length === 0);
                
        var token1 = new ds.Token(null,wme1,null,bindingForWme1);
        test.ok(wme1.tokens.length === 1);
        test.ok(wme1.tokens[0].id === token1.id);
        test.ok(wme2.tokens.length === 0);

        test.ok(token1.id !== wme1.id);
        test.ok(token1.id !== wme2.id);
        test.ok(token1.wme.data.first === "bob");
        test.ok(token1.bindings.a === "bob");
        test.ok(token1.children.length === 0);
        
        //Notice the first argument this time:
        var token2 = new ds.Token(token1,wme2,null,bindingForWme2);
        //wme1 is unchanged:
        test.ok(wme1.tokens.length === 1);
        test.ok(wme1.tokens[0].id === token1.id);
        //wme2 is changed:
        test.ok(wme2.tokens.length === 1);
        test.ok(wme2.tokens[0].id === token2.id);
        test.ok(token2.parentToken !== null);
        test.ok(token2.parentToken.id === token1.id);
        test.ok(token2.wme.id === wme2.id);
        //Second token has its bindings,
        //AND the preceding bindings
        console.log(token2.bindings);
        test.ok(token2.bindings['a'] === "bob");
        test.ok(token2.bindings['b'] === "bill");

        //token1 updated to have t2 as child  by ctor 
        test.ok(token1.children.length === 1);
        test.ok(token1.children[0].id === token2.id);
        test.done();
    },
    
    //--------------------
    //Constant Tests -> conditions -> rules
    //--------------------
    
    ConstantTestExample : function(test){
        //A Test for: wme["first"] === 5
        var aTest = new ds.ConstantTest("first","EQ",5);
        test.ok(aTest.field === "first");
        test.ok(aTest.operator === "EQ");
        test.ok(aTest.value === 5);
        test.done();
    },
    //At this point-> look in ProcedureTests for
    //application of a test to a wme
    
    
    //If you can make a test, you can make a condition:
    ConditionSingleTestExample : function(test){
        //Create a condition of just one test,
        //wme['first'] === 5. no bindings, and not negative
        var aCondition = new ds.Condition(
            [['first','EQ',5]],
            [],
            false);
        test.ok(aCondition.isPositive === true);
        test.ok(aCondition.constantTests.length === 1);
        test.ok(aCondition.bindings.length === 0);
        var theTest = aCondition.constantTests[0];
        test.ok(theTest.field === "first");
        test.ok(theTest.operator === "EQ");
        test.ok(theTest.value === 5);
        test.done();
    },

    ConditionMultipleTestExample : function(test){
        //Create a condition of two tests:
        //wme['first'] === 5 && wme['second'] === "hello"
        var aCondition = new ds.Condition(
            [['first','EQ',5],['second','EQ','hello']],
            [],false);

        test.ok(aCondition.isPositive === true);
        test.ok(aCondition.constantTests.length === 2);
        test.ok(aCondition.bindings.length === 0);
        var test1 = aCondition.constantTests[0];
        var test2 = aCondition.constantTests[1];

        test.ok(test1.field === "first");
        test.ok(test1.operator === "EQ");
        test.ok(test1.value === 5);
        test.ok(test2.field === "second");
        test.ok(test2.operator === "EQ");
        test.ok(test2.value === "hello");

        test.done();
    },

    ConditionWithBindingExample : function(test){
        //Create a condition of no tests,
        //but with the binding: a <- wme['first']
        var aCondition = new ds.Condition(
            [],
            [['a','first']],false);

        test.ok(aCondition.constantTests.length === 0);
        test.ok(aCondition.bindings.length === 1);
        test.ok(aCondition.bindings[0][0] === 'a');
        test.ok(aCondition.bindings[0][1] === 'first');
        test.done();
    },

    ConditionWithSortedBindings : function(test){
        //Create a condition with multiple bindings,
        //and check they get sorted by boundVariableName
        var aCondition = new ds.Condition(
            [],
            [['z','first'],['a','second'],['b','third']],false
        );

        test.ok(aCondition.bindings.length === 3);
        test.ok(aCondition.bindings[0][0] === 'a');
        test.ok(aCondition.bindings[1][0] === 'b');
        test.ok(aCondition.bindings[2][0] === 'z');
        test.done();
    },
    
    NegativeConditionExample : function(test){
        //Create a Condition with a simple test,
        //but negate it, so check: !wme['first'] === 5
        var aCondition = new ds.Condition(
            [['first','EQ',5]],
            [],true);

        test.ok(aCondition.isNegative === true);
        test.done();
    },
    //With some confidence in conditions, lets make a simple
    //rule called 'simpleRule', that does:
    //if(wme['first'] === 5) THEN { say hello }
    simpleRuleExample : function(test){
        //Rules take arrays of tuples for conditions:
        var aRule = new ds.Rule("simpleRule",
                                [//conditions
                                    [//c1
                                        [//tests
                                            //test1
                                            ['first','EQ',5]
                                        ],//end of tests
                                        //bindings and neg?
                                        [],false
                                    ]//end of c1
                                ],//end of conditions
                                //the Action
                                function(){
                                    console.log("Hello");
                                });

        test.ok(aRule.name === "simpleRule")
        test.ok(aRule.conditions.length === 1);
        test.ok(aRule.conditions[0].constantTests.length === 1);
        test.ok(aRule.conditions[0].bindings.length === 0);
        test.ok(aRule.conditions[0].isPositive === true);
        test.ok(aRule.action !== undefined);
        test.done();
    },


    //--------------------
    //Node Structure Tests
    //(ie: AlphaNode/Memory, BetaMemory, JoinNode...
    //--------------------

    alphaNodeNoParentNoTestCtorTest : function(test){
        var an = new ds.AlphaNode();
        test.ok(an.id !== undefined);
        test.ok(an.isConstantTestNode === true);
        test.ok(an.passThrough === true);
        test.ok(an.parent === undefined);
        test.ok(an.children.length === 0);
        test.ok(an.testField === undefined);
        test.ok(an.testValue === undefined);
        test.ok(an.operator === undefined);
        test.done();
    },

    //This time with a test:
    alphaNodeNoParentCtorTest : function(test){
        var ct = new ds.ConstantTest("first","EQ","bob");
        var an = new ds.AlphaNode(null,ct);
        test.ok(an.id !== undefined);
        test.ok(an.parent === null);
        test.ok(an.children.length === 0);
        test.ok(an.testField === "first");
        test.ok(an.testValue === "bob");
        test.ok(an.operator === "EQ");
        test.ok(an.passThrough === undefined);
        test.done();
    },

    //At this point, try out a constantTestNodeActivation
    //in the procedures tests

    alphaNodeWithParentAndTestCtorTest : function(test){
        var dummyParent = {
            children : [],
            id : "dummyParentNode"
        };
        var ct = new ds.ConstantTest("first","EQ","bob");
        var an = new ds.AlphaNode(dummyParent,ct);

        test.ok(an.parent !== undefined);
        test.ok(an.parent.id === dummyParent.id);
        test.ok(dummyParent.children.length === 1);
        test.ok(dummyParent.children[0].id === an.id);
        test.ok(an.passThrough === undefined);        
        test.done();
    },

    //and the alpha node connects to the... alphamemory
    alphaMemoryCtorTest : function(test){
        var ct = new ds.ConstantTest("first","EQ","bob");
        var an = new ds.AlphaNode(null,ct);
        var am = new ds.AlphaMemory(an);

        test.ok(am.isAlphaMemory === true);
        test.ok(am.items.length === 0);
        test.ok(am.parent.id === an.id);
        test.ok(an.children.length === 1);
        test.ok(an.children[0].id === am.id);
        test.ok(am.referenceCount === 0);
        test.ok(am.isMemoryNode === true);
        test.done();
    },

    //Now you can test alphaMemory activation in
    //procedure tests...

    //Skip ReteNode, its an abstract object to
    //build betaMemories, joins, neg, and ncc nodes from

    //Test BetaMemory Construction:

    betaMemoryDummyCtorTest : function(test){
        //make the dummy beta memory that every rete net has
        var bm = new ds.BetaMemory();
        test.ok(bm.isBetaMemory === true);
        test.ok(bm.isMemoryNode === true);
        test.ok(bm.dummy === true);
        test.ok(bm.items.length === 1);
        test.ok(bm.items[0].owningNode.id === bm.id);
        test.done();
    },
    
    betaMemoryNonDummyCtorTest : function(test){
        var dummyParent = {
            children : [],
            
        };
        var bm = new ds.BetaMemory(dummyParent);
        test.ok(bm.isBetaMemory === true);
        test.ok(bm.isMemoryNode === true);
        test.ok(bm.items.length === 0);
        test.ok(dummyParent.children.length === 1);
        test.ok(dummyParent.children[0].id === bm.id);
        test.ok(bm.dummy === undefined);
        test.done();
    },

    //TODO: include join nodes when they are working to


    //Now, with alphamemories, and beta memories,
    //the initial join node can be made:
    //WITH NO BINDINGS
    simplestJoinNodeCtorTest : function(test){
        var dummyBeta = new ds.BetaMemory();
        var ct = new ds.ConstantTest("first","EQ","bob");
        var an = new ds.AlphaNode(null,ct);
        var am = new ds.AlphaMemory(an);
        var jn = new ds.JoinNode(dummyBeta,am,undefined);

        test.ok(jn.parent.id === dummyBeta.id);
        test.ok(jn.alphaMemory.id === am.id);

        test.ok(dummyBeta.children.length === 1);
        test.ok(dummyBeta.children[0].id === jn.id);
        test.ok(am.children.length === 1);
        test.ok(am.children[0].id === jn.id);
        test.ok(am.referenceCount === 1);
        test.ok(jn.nearestAncestor === null);
        test.done();
    },

    joinNodeBindingsTest : function(test){
        var dummyBeta = new ds.BetaMemory();
        var ct = new ds.ConstantTest("first","EQ","bob");
        var an = new ds.AlphaNode(null,ct);
        var am = new ds.AlphaMemory();
        var bindings = [
            ["a","first"],
            ["b","second"]
        ];
        var jn = new ds.JoinNode(dummyBeta,am,bindings);

        test.ok(jn.parent.id === dummyBeta.id);
        test.ok(jn.alphaMemory.id === am.id);

        test.ok(dummyBeta.children.length === 1);
        test.ok(dummyBeta.children[0].id === jn.id);
        test.ok(am.children.length === 1);
        test.ok(am.children[0].id === jn.id);
        test.ok(am.referenceCount === 1);
        test.ok(jn.nearestAncestor === null);

        test.ok(jn.tests.length === 2);
        test.ok(jn.tests[0][0] === "a");
        test.ok(jn.tests[0][1] === "first");
        test.ok(jn.tests[1][0] === "b");
        test.ok(jn.tests[1][1] === "second");        
        test.done();
    },

    //A Join node lets use do a simple test
    //of right and left activation in procedures.

    //Action node test:
    simpleActionNodeTest : function(test){
        var testValue = 0;
        var dummyParent = {
            id : "dummy",
            children : [],
        };
        var action = new ds.ActionNode(dummyParent,
                                       function(){
                                           testValue = 5;
                                       },"simpleAction");

        test.ok(action.isActionNode === true);
        test.ok(action.name === 'simpleAction');
        test.ok(action !== undefined);
        test.ok(action.parent.id === dummyParent.id);

        test.ok(testValue === 0);
        action.action();
        test.ok(testValue === 5);
        
        test.done();
    },

    //--------------------
    //Core stuff has now been constructed,
    //time to deal with negated conditions:
    //--------------------

    
    //nccCondition

    //negative join result


    //negative node

    //nccnode

    //nccpartner node


    //--------------------
    //Rete Net main object
    //--------------------
};
