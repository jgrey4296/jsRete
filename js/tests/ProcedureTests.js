var ds = require('../dataStructures');
var p = require('../procedures');
var _ = require('../libs/underscore');

exports.procedureTests = {

    //Comparisons:
    
    //compare node to test
    compareConstantNodeToTest_passCheck : function(test){
        var testTuple = new ds.ConstantTest('first','EQ','bob');
        var ct = new ds.ConstantTest("first","EQ","bob");
        var node = new ds.AlphaNode(null,ct);
        var ret = p.compareConstantNodeToTest(node,testTuple);
        test.ok(ret === true,ret);
        test.done();
    },

    compareConstantNodeToTest_failCheck : function(test){
        var testTuple = new ds.ConstantTest('first','EQ','bob');
        var ct = new ds.ConstantTest("second","EQ","bob");
        var node = new ds.AlphaNode(null,ct);
        var ret = p.compareConstantNodeToTest(node,testTuple);

        test.ok(ret === false);
        test.done();
    },

    //Compare Join Test Arrays:
    compareSameJoinTestArrays : function(test){
        var tests1 = [["a","first"],["b","second"],["c","third"]];
        var result = p.compareJoinTests(tests1,tests1);
        test.ok(result === true);
        test.done();
    },

    compareDifferentJoinTestArrays : function(test){
        var tests1 = [["a","first"],["b","second"],["c","third"]];
        var tests2 = [["a","first"],["b","second"],["c","fourth"]];
        var result = p.compareJoinTests(tests1,tests2);
        test.ok(result === false);
        var result2 = p.compareJoinTests(tests2,tests1);
        test.ok(result === false);
        
        test.done();
    },
    
    compareOtherJoinTests : function(test){
        var tests1 = [["a","first"],["b","second"]];
        var tests2 = [["a","ablh"],["c","hello"]];
        var result = p.compareJoinTests(tests1,tests2);
        test.ok(result === false);
        test.done();
    },
    
    //perform join test check.
    //Check: 1) bindings undefined,
    //2) bindings incorrect
    //3) bindings correct

    //Test that a join will pass if theres nothing
    //to conflict. ie: there are no bindings anywhere
    performJointest_emptyPass_Check : function(test){
        //a joinnode, token and wme
        var joinNode = new ds.JoinNode();
        var token = new ds.Token();
        var wme = new ds.WME({first:"bob"});

        var ret = p.performJoinTests(joinNode,token,wme);

        test.ok(_.keys(ret).length === 0);
        
        test.done();
    },

    //Check join test will pass if the token has bindings:
    performJoinTest_tokenBinding_pass : function(test){
        var joinNode = new ds.JoinNode();
        var token = new ds.Token(null,null,null,{a:"bob"});
        var wme = new ds.WME({first:"bob"});

        var ret = p.performJoinTests(joinNode,token,wme);

        test.ok(_.keys(ret).length === 1);
        test.ok(ret['a'] === "bob");
        
        test.done();
    },

    //check join test will fail on incompatible binding:
    performJoinTest_failOnExistingBinding : function(test){
        var joinNode = new ds.JoinNode(null,null,[
            ["a","first"]
        ]);
        var token = new ds.Token(null,null,null,{a:"bill"});
        var wme = new ds.WME({first:"bob"});

        var ret = p.performJoinTests(joinNode,token,wme);

        test.ok(ret === false);
        
        test.done();
    },

    performJoinTest_pass : function(test){
        var joinNode = new ds.JoinNode(null,null,[
            ["a","first"]
        ]);
        var token = new ds.Token(null,null,null,{a:"bill"});
        var wme = new ds.WME({first:"bill"});

        var ret = p.performJoinTests(joinNode,token,wme);

        test.ok(_.keys(ret).length === 1);
        test.ok(ret['a'] === 'bill');
        
        test.done();
    },

    
    performJoinTest_pass_withNewBindings : function(test){
        var joinNode = new ds.JoinNode(null,null,[
            ["b","first"]
        ]);
        var token = new ds.Token(null,null,null,{a:"bill"});
        var wme = new ds.WME({first:"bob"});

        var ret = p.performJoinTests(joinNode,token,wme);

        test.ok(_.keys(ret).length === 2);
        test.ok(ret['a'] === 'bill');
        test.ok(ret['b'] === 'bob');
        
        test.done();
    },



    //findNearestAncestorWithSameAlphaMemory
    

    //--------------------
    //Activation tests:
    //--------------------

    //action node activation
    actionNodeTestActivation : function(test){
        var testString = "hello";
        var an = new ds.ActionNode(null,function(){
            testString = "blah";
        },"simpleAction");

        test.ok(testString === "hello");
        p.activateActionNode(an);
        test.ok(testString === "blah");
        test.done();
    },
    
    //using a dummy, rather than actual, alpha node,
    //see if the procedure returns correctly
    constantTestNodeActivationPassTest : function(test){
        var dummyAlphaNode = {
            testField : "first",
            testValue : "bill",
            operator : "EQ",
            children: [],
        };

        var aWme = new ds.WME({first:"bill",second:"bob"});

        var ret = p.constantTestNodeActivation(dummyAlphaNode,aWme);
        test.ok(ret === true);
        test.done();        
    },

    constantTestNodeActivationFailTest : function(test){
        var dummyAlphaNode = {
            testField : "first",
            testValue : "bob",
            operator : "EQ",
            children: [],
        };

        var aWme = new ds.WME({first:"bill",second:"bob"});

        var ret = p.constantTestNodeActivation(dummyAlphaNode,aWme);
        test.ok(ret === false);
        test.done();                

    },

    constantTestNodeFromCtorActivationTest : function(test){
        var ct = new ds.ConstantTest("first","EQ","bob");
        var an = new ds.AlphaNode(null,ct);
        var am = new ds.AlphaMemory(an);
        var aWme = new ds.WME({first:'bob'});
        var ret = p.constantTestNodeActivation(an,aWme);
        test.ok(ret === true);
        test.done();
    },

    //TODO: test each operator in ../comparisonOperators
    
    alphaMemoryTestActivation : function(test){
        var ct = new ds.ConstantTest("first","EQ","bob");
        var an = new ds.AlphaNode(null,ct);
        var am = new ds.AlphaMemory(an);
        var aWme = new ds.WME({first:'bob'});
        test.ok(am.items.length === 0);
        test.ok(aWme.alphaMemoryItems.length === 0);
        
        p.alphaMemoryActivation(am,aWme);

        test.ok(am.items.length === 1);
        test.ok(am.items[0].wme.id === aWme.id);
        test.ok(am.items[0].alphaMemory.id === am.id);

        test.ok(aWme.alphaMemoryItems.length === 1);
        test.ok(aWme.alphaMemoryItems[0].wme.id === aWme.id);
        test.ok(aWme.alphaMemoryItems[0].alphaMemory.id === am.id);
  
        test.done();
    },

    //Now test the utility function alphaNodeActivation,
    //which will call alphaMem or constantTest activation as needed
    alphaNodeActivationTest_forConstantTest : function(test){
        var ct = new ds.ConstantTest("first","EQ","bob");
        var an = new ds.AlphaNode(null,ct);
        var am = new ds.AlphaMemory(an);
        var aWme = new ds.WME({first:'bob'});

        test.ok(aWme.alphaMemoryItems.length === 0);
        
        var ret = p.alphaNodeActivation(an,aWme);
        test.ok(ret === true);
        test.ok(aWme.alphaMemoryItems.length === 1,aWme.alphaMemoryItems.length);
        test.done();
    },

    alphaNodeActivationTest_forAlphaMemory : function(test){
        var ct = new ds.ConstantTest("first","EQ","bob");
        var an = new ds.AlphaNode(null,ct);
        var am = new ds.AlphaMemory(an);
        var aWme = new ds.WME({first:'bob'});

        test.ok(aWme.alphaMemoryItems.length === 0);
        
        var ret = p.alphaNodeActivation(am,aWme);
        test.ok(ret === undefined);
        test.ok(aWme.alphaMemoryItems.length === 1);
        test.done();
    },

    //Beta Memory left activation
    //very basic, non-dummy beta memory activation
    //with no children.
    //token is no assigned to be wonded by the bm from
    //its activation, that happens in leftActivate
    childless_betaMemoryActivationTest : function(test){
        var dummyParent = {
            id : "dummy",
            children : [],
        };
        var aToken = new ds.Token();
        var bm = new ds.BetaMemory(dummyParent);

        test.ok(bm.isBetaMemory === true);
        test.ok(bm.items.length === 0);        
        p.betaMemoryActivation(bm,aToken);

        test.ok(bm.items.length === 1);
        test.ok(bm.items[0].id === aToken.id);
        test.done();
    },

    //create a bm linked to a bm.
    //activate the top bm, check that the bottom one
    //also stores a token
    childful_betaMemoryActivationTest : function(test){
        var bm1 = new ds.BetaMemory();
        var bm2 = new ds.BetaMemory(bm1);
        var aToken = new ds.Token();

        //bm1 starts with a dummy token
        test.ok(bm1.items.length === 1);
        test.ok(bm2.items.length === 0);

        p.betaMemoryActivation(bm1,aToken);

        test.ok(bm1.items.length === 2);
        test.ok(bm1.items[0].id === aToken.id);
        test.ok(bm2.items.length === 1);
        test.ok(bm2.items[0].id === aToken.id);
        test.done();
    },

    leftActivateBetaMemory_TokenCreation_Test : function(test){
        var bm = new ds.BetaMemory();
        var origToken = new ds.Token();
        var origWME = new ds.WME({first:"blah"});
        var joinTestResults = {"a":"blah"};

        //dummy token already in there
        test.ok(bm.items.length === 1);
        
        p.leftActivate(bm,origToken,origWME,joinTestResults);

        test.ok(bm.items.length === 2);
        //new token is UNSHIFTED NOT PUSHED
        test.ok(bm.items[0].isToken === true);
        test.ok(bm.items[0].id !== origToken.id);
        test.ok(bm.items[0].id !== bm.items[1].id);
        test.ok(bm.items[0].parentToken.id === origToken.id);
        test.ok(bm.items[0].owningNode.id === bm.id);
        test.ok(bm.items[0].wme.id === origWME.id);
        test.ok(bm.items[0].bindings['a'] === 'blah');
        test.done();
    },
    
    
    //join node left activation
    //activating a non-unlinked join node and checking
    //that it puts a new token into its child beta memory
    joinNodeLeftActivationTest_bypassing_unlinking : function(test){
        var am = new ds.AlphaMemory();
        var bm = new ds.BetaMemory();
        var tests = [["a","first"]];
        var testWME = new ds.WME({first:"blah"});

        test.ok(bm.children.length === 0);
        test.ok(am.children.length === 0);

        p.alphaMemoryActivation(am,testWME);
        
        var jn = new ds.JoinNode(bm,am,tests);

        //using constructor, without building,
        //so no unlinking
        test.ok(jn.parent.children.length === 1);
        test.ok(jn.alphaMemory.children.length === 1);
        
        //connect a beta memory to jn output
        //to verify results
        var bmPostJN = new ds.BetaMemory(jn);

        //create a token
        var token = new ds.Token();

        //check prior:
        test.ok(bmPostJN.items.length === 0);

        test.ok(bm.items.length === 1);
        test.ok(am.items.length === 1);
        
        //and activate the jn with it:
        p.joinNodeLeftActivation(jn,token);

        //Verify:
        test.ok(bmPostJN.items.length === 1,bmPostJN.items.length);
        test.ok(bmPostJN.items[0].isToken === true);
        test.ok(bmPostJN.items[0].owningNode.id === bmPostJN.id);
        test.ok(bmPostJN.items[0].parentToken.id === token.id);

        test.ok(token.children.length === 1);
        test.ok(token.children[0].id === bmPostJN.items[0].id);
                
        test.done();
    },

    //join node right activation
    //simple jnra, without worrying about unlinking:
    joinNodeRightActivation_bypassing_unlinking : function(test){
        var bm = new ds.BetaMemory();
        var am = new ds.AlphaMemory();
        var tests = [["a","first"]];
        var testWME = new ds.WME({first:"blah"});
        p.alphaMemoryActivation(am,testWME);

        test.ok(bm.items.length === 1); //for dummy
        test.ok(am.items.length === 1); //for testWME
                
        var jn = new ds.JoinNode(bm,am,tests);

        var bmPostJN = new ds.BetaMemory(jn);

        test.ok(bmPostJN.parent.id === jn.id);

        //Activate from the right:
        var newWME = new ds.WME({first:"blooo"});
        p.joinNodeRightActivation(jn,newWME);

        test.ok(bmPostJN.items.length === 1);
        test.ok(bmPostJN.items[0].id !== bm.items[0].id);
        test.ok(bmPostJN.items[0].owningNode.id === bmPostJN.id);
        test.ok(bmPostJN.items[0].parentToken.id === bm.items[0].id);
        test.ok(bmPostJN.items[0].bindings['a'] === newWME.data.first);
        test.ok(bmPostJN.items[0].wme.id === newWME.id);

        test.ok(bm.items[0].children.length === 1);
        test.ok(bm.items[0].children[0].id === bmPostJN.items[0].id);

        test.done();
    },


    
    //relink to alpha test

    //relink to beta test

    //negative node left activation

    //negative node right activation

    //ncc left activation

    //nccpartner left actviation

    //left activate general

    //right activate general

    
    //--------------------
    //buildOrShareTests:
    //--------------------

    //constant test
    //given a parent and a testTuple, create
    //an appropriate alpha node and return it
    buildConstantTestNode_check : function(test){
        var dummyParent = {
            id : 'dummy',
            children :[],
        };
        var ct = new ds.ConstantTest("first","EQ","bob");
        var newCTNode = p.buildOrShareConstantTestNode(dummyParent,ct);

        test.ok(newCTNode.isConstantTestNode === true);
        test.ok(newCTNode.parent.id === dummyParent.id);
        test.ok(newCTNode.parent.children.length === 1);
        test.ok(newCTNode.parent.children[0].id === newCTNode.id);
        test.ok(newCTNode.children.length === 0);

        test.ok(newCTNode.testField === ct['field']);
        test.ok(newCTNode.testValue === ct['value']);
        test.ok(newCTNode.operator === ct['operator']);
        test.ok(newCTNode.passThrough === undefined);
        test.done();
    },

    shareConstantTestNode_check : function(test){
        var dummyParent = {
            id : "dummy",
            children : [],
        };
        var ct = new ds.ConstantTest("first","EQ","bob");
        //This is what the previous test produces:
        var ctNode = p.buildOrShareConstantTestNode(dummyParent,ct);
        //So now call again and see if a new node is built
        //or the same node is returned:
        var shouldBeDuplicate = p.buildOrShareConstantTestNode(dummyParent,ct);

        test.ok(ctNode.id === shouldBeDuplicate.id);

        //one more time to be sure:
        var aThird = p.buildOrShareConstantTestNode(dummyParent,ct);
        test.ok(ctNode.id === aThird.id);
        test.ok(shouldBeDuplicate.id === aThird.id);
        
        test.done();
    },

    shareCTNodeWhenThereAreMultipleChildren_check : function(test){
        var dummyParent ={
            id : "dummy",
            children : [],
        };

        var ct1 = new ds.ConstantTest("first","EQ","BOB");
        var ct2 = new ds.ConstantTest("second","EQ","JILL");
        var ct3 = new ds.ConstantTest("third","EQ","JAM");

        var ctNode1 = p.buildOrShareConstantTestNode(dummyParent,ct1);
        var ctNode2 = p.buildOrShareConstantTestNode(dummyParent,ct2);
        var ctNode3 = p.buildOrShareConstantTestNode(dummyParent,ct3);

        var possibleDuplicate = p.buildOrShareConstantTestNode(dummyParent,ct2);

        test.ok(ctNode1.id !== ctNode2.id);
        test.ok(ctNode2.id !== ctNode3.id);
        test.ok(ctNode3.id !== ctNode1.id);
        test.ok(possibleDuplicate.id === ctNode2.id);
        
        test.done();
    },

    
    //alpha memory

    buildZeroConditionAlphaMemory : function(test){
        var dummyRoot = {
            id : "dummy",
            children : [],
        };
        var condition = new ds.Condition(
            [],[],false);

        var newAlphaMemory = p.buildOrShareAlphaMemory(condition,dummyRoot);

        test.ok(newAlphaMemory.isAlphaMemory === true);
        test.ok(dummyRoot.children.length === 1);
        test.ok(dummyRoot.children[0].id === newAlphaMemory.id);
        test.done();
    },

    build_alphaMemory_withSimpleCondition : function(test){
        var dummyRoot = {
            id : "dummy",
            children : [],
        };
        var simpleCondition = new ds.Condition(
            [["first","EQ","BOB"]],
            [],false);

        var newAlphaMemory = p.buildOrShareAlphaMemory(simpleCondition,dummyRoot);

        test.ok(newAlphaMemory.isAlphaMemory === true);
        test.ok(dummyRoot.children.length === 1);
        test.ok(dummyRoot.children[0].id !== newAlphaMemory.id);
        test.ok(newAlphaMemory.parent.id !== dummyRoot.id);

        test.ok(newAlphaMemory.parent.isConstantTestNode === true);
        
        test.done();
    },

    simpleCondition_shareAlphaNode_check : function(test){
        var dummyRoot = {
            id : "dummy",
            children : [],
        };
        var condition = new ds.Condition([
            ["first","EQ","bob"],
        ],[],false);

        var newAlphaMemory = p.buildOrShareAlphaMemory(condition,dummyRoot);
        var shouldBeDuplicate = p.buildOrShareAlphaMemory(condition,dummyRoot);

        test.ok(newAlphaMemory.id === shouldBeDuplicate.id);
        test.ok(dummyRoot.children.length === 1);
        test.done();
    },

    pairOfTests_buildAlphaNode_check : function(test){
        var dummyRoot = {
            id : "dummy",
            children : [],
        };
        var condition = new ds.Condition([
            ["first","EQ","bob"],
            ["second","EQ","bill"]],
                                         [],false);

        var newAlphaMemory = p.buildOrShareAlphaMemory(condition,dummyRoot);

        test.ok(newAlphaMemory.isAlphaMemory);
        test.ok(dummyRoot.children.length === 1);
        test.ok(dummyRoot.children[0].children.length === 1);
        test.ok(dummyRoot.children[0].children[0].outputMemory.id === newAlphaMemory.id);
        test.ok(newAlphaMemory.parent.id === dummyRoot.children[0].children[0].id);
        
        test.done();
    },


    pairOfTests_shareAlphaMemory_check : function(test){
        var dummyRoot = {
            id : "dummy",
            children : [],
        };
        var condition = new ds.Condition([
            ["first","EQ","bob"],
            ["second","EQ","bill"]],
                                         [],false);

        var newAlphaMemory = p.buildOrShareAlphaMemory(condition,dummyRoot);

        var shouldBeDuplicate = p.buildOrShareAlphaMemory(condition,dummyRoot);

        test.ok(newAlphaMemory.id === shouldBeDuplicate.id);
        test.ok(dummyRoot.children.length === 1);
        test.ok(dummyRoot.children[0].children.length === 1);
        
        test.done();
    },

    differentConditions_BuildAlphaMemoryCheck : function(test){
        var dummyRoot = {
            id : "dummy",
            children : [],
        };
        var con1 = new ds.Condition([["first","EQ","BILL"]],[],false);
        var con2 = new ds.Condition([["first","EQ","BOB"]],[],false);

        var alphaMemory1 = p.buildOrShareAlphaMemory(con1,dummyRoot);
        var alphaMemory2 = p.buildOrShareAlphaMemory(con2,dummyRoot);

        test.ok(dummyRoot.children.length === 2);
        test.ok(alphaMemory1.id !== alphaMemory2.id);
        test.ok(alphaMemory1.parent.id !== alphaMemory2.parent.id);
        test.done();
    },

    //beta memory

    build_betaMemoryTest : function(test){
        var dummyParent = {
            id : 'dummy',
            children : [],
        };

        var bm = p.buildOrShareBetaMemoryNode(dummyParent);

        test.ok(bm.isBetaMemory === true);
        test.ok(bm.parent.id === dummyParent.id);
        test.ok(dummyParent.children.length === 1);
        test.ok(dummyParent.children[0].id === bm.id);
        
        test.done();
    },

    share_betaMemory : function(test){
        var dummyParent = {
            id : 'dummy',
            children : [],
        };

        var bm = p.buildOrShareBetaMemoryNode(dummyParent);
        //build a second one on the same parent:
        var shouldBeDuplicate = p.buildOrShareBetaMemoryNode(dummyParent);

        test.ok(bm.isBetaMemory === true);
        test.ok(shouldBeDuplicate.isBetaMemory === true);
        test.ok(bm.id === shouldBeDuplicate.id);
        test.ok(bm.parent.id === dummyParent.id);
        test.ok(dummyParent.children.length === 1);
        test.ok(dummyParent.children[0].id === bm.id);
        test.ok
        test.done();
    },

    //With a beta memory, and an alpha memory,
    //and some tests, you can make a simple join node:
    initialFromDummyBetaParent_BuildJoinNodeCheck : function(test){
        //the dummy beta parent
        var bm = new ds.BetaMemory();
        //the alpha memory
        var am = new ds.AlphaMemory();
        //the tests:
        var tests = [["a","first"],["b","second"],["c","third"]];

        //the Join Node:
        var jn = p.buildOrShareJoinNode(bm,am,tests);
        
        test.ok(jn.isJoinNode === true);
        test.ok(jn.parent.id === bm.id);
        test.ok(jn.alphaMemory.id === am.id);
        test.ok(jn.tests.length === 3);
        test.ok(jn.tests[0][0] === tests[0][0]);
        test.ok(jn.tests[0][1] === tests[0][1]);
        test.ok(jn.tests[1][0] === tests[1][0]);
        test.ok(jn.tests[1][1] === tests[1][1]);
        test.ok(jn.tests[2][0] === tests[2][0]);
        test.ok(jn.tests[2][1] === tests[2][1]);

        //nearest ancestor should be null as parent is dummy
        test.ok(jn.nearestAncestor === null);

        //parent memory children should NOT have updated
        //BECAUSE OF left UNLINKING
        test.ok(jn.parent.children.length === 0);
        //but alphamemory children should have updated
        test.ok(jn.alphaMemory.children.length === 1);
        test.ok(jn.alphaMemory.children[0].id === jn.id);
        
        //NOT: test.ok(jn.alphaMemory.children[0].id === jn.id);
        test.done();
    },

    //now SHARE a join node:
    share_join_node_check : function(test){
        var bm = new ds.BetaMemory();
        var am = new ds.AlphaMemory();
        var tests = [["a","first"],["b","second"],["c","third"]];
        var jn = p.buildOrShareJoinNode(bm,am,tests);
        var shouldBeDuplicate = p.buildOrShareJoinNode(bm,am,tests);
        test.ok(jn.id === shouldBeDuplicate.id);
        test.ok(jn.parent.id === bm.id);
        test.ok(shouldBeDuplicate.alphaMemory.id === am.id);
        test.done();
    },

    do_NOT_share_join_node : function(test){
        var am = new ds.AlphaMemory();
        var bm = new ds.BetaMemory();
        var tests1 = [["a","first"],["b","second"]];
        var tests2 = [["a","ablh"],["c","hello"]];
        var jn1 = p.buildOrShareJoinNode(bm,am,tests1);
        var jn2 = p.buildOrShareJoinNode(bm,am,tests2);

        test.ok(jn1.id !== jn2.id);
        test.done();
    },

    force_no_unlinking_build_JoinNode_test : function(test){
        var am = new ds.AlphaMemory();//currently empty
        var bm = new ds.BetaMemory();//has dummy token
        var tests = [["a","first"]];
        var testWME = new ds.WME({first:"blah"});
        p.alphaMemoryActivation(am,testWME);
        test.ok(am.items.length === 1);//now am isnt empty
        //create join node, shouldnt get unlinked:
        var jn = p.buildOrShareJoinNode(bm,am,tests);

        test.ok(jn.parent.children.length === 1);
        test.ok(jn.parent.children[0].id === jn.id);
        test.ok(jn.alphaMemory.children.length === 1);
        test.ok(jn.alphaMemory.children[0].id === jn.id);
        test.done();
    },

    
    //force test of left unlinking
    //force test of right unlinking

    //test nearestAncestor
    
    //negative node

    //nccnode

    //network for conditions:
    
    //--------------------
    //WME functions:
    //--------------------
    
    //addWME test

    //remove wme test

    //deleteTokenAndDescendents

    //delete descendents of token

    //--------------------
    //Other:
    //--------------------

    //update new node with matches from above test:

    //Test uNNWMFA on a parent that is a beta memory.
    //use a beta memory to store the results of the left activate
    //to verify
    betaNode_updateNewNodeWithMatchesFromAbove : function(test){
        var bm1 = new ds.BetaMemory();
        var t1 = new ds.Token();
        var t2 = new ds.Token();
        var t3 = new ds.Token();
        var t4 = new ds.Token();

        p.leftActivate(bm1,t1);
        p.leftActivate(bm1,t2);
        p.leftActivate(bm1,t3);
        p.leftActivate(bm1,t4);

        //+1 for dummy
        test.ok(bm1.items.length === 5);
        var bm2 = new ds.BetaMemory(bm1);
        test.ok(bm2.items.length === 0);
        test.ok(bm1.children.length === 1);
        test.ok(bm1.children[0].id === bm2.id);
        test.ok(bm2.parent.id === bm1.id);

        p.updateNewNodeWithMatchesFromAbove(bm2);

        test.ok(bm2.items.length === 5);
        //they are added in reverse order
        test.ok(bm2.items[0].id === bm1.items[4].id);
        test.ok(bm2.items[1].id === bm1.items[3].id);
        test.ok(bm2.items[2].id === bm1.items[2].id);
        test.ok(bm2.items[3].id === bm1.items[1].id);
        test.ok(bm2.items[4].id === bm1.items[0].id);
        test.done();
    },
    
    //remove rule

    //delete node and any unused ancestors
    
};
