var ds = require('../dataStructures');
var p = require('../procedures');
var _ = require('../libs/underscore');

exports.procedureTests = {

    //Comparisons:
    
    /** Compare a node with a constant test to an
        actual constantTest. They should be the same.
       @method compareConstantNodeToTest_passCheck
     */
    compareConstantNodeToTest_passCheck : function(test){
        var testTuple = new ds.ConstantTest('first','EQ','bob');
        var ct = new ds.ConstantTest("first","EQ","bob");
        var node = new ds.AlphaNode(null,ct);
        var ret = p.compareConstantNodeToTest(node,testTuple);
        test.ok(ret === true,ret);
        test.done();
    },

    /** Compare a node and a ConstantTest, where there is a 
        point of difference between the tests. Thus, it expects
        a value of false
       @method compareConsantNodeToTest_failCheck
     */
    compareConstantNodeToTest_failCheck : function(test){
        var testTuple = new ds.ConstantTest('first','EQ','bob');
        var ct = new ds.ConstantTest("second","EQ","bob");
        var node = new ds.AlphaNode(null,ct);
        var ret = p.compareConstantNodeToTest(node,testTuple);

        test.ok(ret === false);
        test.done();
    },

    /** join test arrays describe bindings. 
        so ["a","first"] :: bindings['a'] = wme['first']
        This test expects the tests to be the same, and so true
       @method compareSameJointestArrays
     */
    compareSameJoinTestArrays : function(test){
        var tests1 = [["a","first"],["b","second"],["c","third"]];
        var result = p.compareJoinTests(tests1,tests1);
        test.ok(result === true);
        test.done();
    },

    /**
       binding arrays 
       ['a','first'] :: bindings['a'] = wme['first']
       compared. Should decide they are different
       @method comapreDifferentJoinTestArrays
     */
    compareDifferentJoinTestArrays : function(test){
        var tests1 = [["a","first"],["b","second"],["c","third"]];
        var tests2 = [["a","first"],["b","second"],["c","fourth"]];
        var result = p.compareJoinTests(tests1,tests2);
        test.ok(result === false);
        var result2 = p.compareJoinTests(tests2,tests1);
        test.ok(result === false);
        
        test.done();
    },
    
    /**
       Compare a pair of join tests that were failing in 
       the real world
       @method compareOtherJoinTests
     */
    compareOtherJoinTests : function(test){
        var tests1 = [["a","first"],["b","second"]];
        var tests2 = [["a","ablh"],["c","hello"]];
        var result = p.compareJoinTests(tests1,tests2);
        test.ok(result === false);
        test.done();
    },
    
    //Test that a join will pass if theres nothing
    //to conflict. ie: there are no bindings anywhere
    performJointest_emptyPass_Check : function(test){
        //a joinnode, token and wme
        var joinNode = new ds.JoinNode();
        var token = new ds.Token();
        var wme = new ds.WME({first:"bob"});
        var ret = p.performJoinTests(joinNode,token,wme);
        //there should be no bindings returned
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

    //test the bindings against the new wme,
    //AND create a new binding in the returned object
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

    //perform a join test where there are two bindings,
    //with a token and a wme, one of each, of the form:
    //Original error form:
    //  Comparing Token:  { b: 'a token' } 
    //  To WME:  { a: 'a wme' } 
    //  using bindings:  [ [ 'a', 'a' ], [ 'b', 'b' ] ]
    // (*correct*:) { a:"a wme",b:"a token"}
    //FIXED ERROR: was not dealing with undefined wme values well
    performDuplicateTestFor_performJoinTest : function(test){
        var joinNode = new ds.JoinNode(null,null,
                                       [["a","a"],["b","b"]]);
        var token = new ds.Token(null,null,null,{b:"a token"});
        var wme = new ds.WME({a:"a wme"});
        var ret = p.performJoinTests(joinNode,token,wme);
        test.ok(_.keys(ret).length === 2);
        test.ok(ret['a'] === "a wme");
        test.ok(ret['b'] === "a token");        
        test.done();
    },

    
    //findNearestAncestorWithAlphaMemory:
    //try arbitrary chains of join nodes and beta memories,
    //with a variety of alpha memories in the chain,
    //check the function selects correctly.
    simpleNearestAncestorToDummyNode_check : function(test){
        var am = new ds.AlphaMemory();
        var bm = new ds.BetaMemory();
        var nearestAncestor = p.findNearestAncestorWithAlphaMemory(bm,am);
        test.ok(nearestAncestor === null);
        test.done();
    },
    
    //go till dummy -> return null
    nearestAncestorToJoinNode_check : function(test){
        var am = new ds.AlphaMemory();
        var bm = new ds.BetaMemory();
        var tests = [];
        var jn = new ds.JoinNode(bm,am,tests);
        var nearestAncestor = p.findNearestAncestorWithAlphaMemory(jn,am);
        test.ok(nearestAncestor.id === jn.id);
        test.done();
    },
    
    //get a join node in the chain
    findNearestAncestorInAChain_check : function(test){
        var am1 = new ds.AlphaMemory();
        var am2 = new ds.AlphaMemory();
        var am3 = new ds.AlphaMemory();
        var bm1 = new ds.BetaMemory();
        var jn1 = new ds.JoinNode(bm1,am1,[]);
        var bm2 = new ds.BetaMemory(jn1);
        var jn2 = new ds.JoinNode(bm2,am2,[]);
        var bm3 = new ds.BetaMemory(jn2);
        var jn3 = new ds.JoinNode(bm3,am3,[]);

        var n1 = p.findNearestAncestorWithAlphaMemory(jn3,am1);
        test.ok(n1.id === jn1.id);
        var n2 = p.findNearestAncestorWithAlphaMemory(jn3,am2);
        test.ok(n2.id === jn2.id);
        test.done();
    },

    //test negative nodes
    findNearestAncestorFromNegativeNode : function(test){
        var bm = new ds.BetaMemory();
        var am = new ds.AlphaMemory();
        var tests = [["a","b"]];
        var negNode = new ds.NegativeNode(bm,am,tests);

        var ancestor = p.findNearestAncestorWithAlphaMemory(negNode,am);

        test.ok(ancestor.id === negNode.id);
        test.done();
    },

    findNearestAncestorFromNodeWithNegNodeInChain : function(test){
        var bm = new ds.BetaMemory();
        var am = new ds.AlphaMemory();
        var tests = [["a","b"]];
        var negNode = new ds.NegativeNode(bm,am,tests);
        var am2 = new ds.AlphaMemory();
        var jn = new ds.JoinNode(negNode,am2,[]);

        var ancestor = p.findNearestAncestorWithAlphaMemory(jn,am);
        test.ok(ancestor.id === negNode.id);
        
        test.done();
    },


    findNearestAncestorFromNodeWithNegNodeInLongerChain : function(test){
        var bm = new ds.BetaMemory();
        var am = new ds.AlphaMemory();
        var tests = [["a","b"]];
        var negNode = new ds.NegativeNode(bm,am,tests);
        var am2 = new ds.AlphaMemory();
        var jn = new ds.JoinNode(negNode,am2,[]);
        var am3 = new ds.AlphaMemory();
        var postJNBM = new ds.BetaMemory(jn);
        var jn2 = new ds.JoinNode(postJNBM,am3);
        
        var am_ancestor = p.findNearestAncestorWithAlphaMemory(jn2,am);
        test.ok(am_ancestor.id === negNode.id);
        var am2_ancestor = p.findNearestAncestorWithAlphaMemory(jn2,am2);
        test.ok(am2_ancestor.id === jn.id);
        
        test.done();
    },
    
    

    findNearestAncestorWithAlphaMemory_subnetwork_test : function(test){
        var bm = new ds.BetaMemory();
        var am = new ds.AlphaMemory();
        var jn_earlier = new ds.JoinNode(bm,am);
        var bm2 = new ds.BetaMemory(jn_earlier);
        var tests = [["a","b"]];
        var joinNode = new ds.JoinNode(bm2,am);
        var postJNBM = new ds.BetaMemory(joinNode);
        var nccNode = new ds.NCCNode(bm2);
        var partner = new ds.NCCPartnerNode(postJNBM,1);
        var postNccBM = new ds.BetaMemory(nccNode);
        
        nccNode.partner = partner;
        partner.nccNode = nccNode;

        var ancestor = p.findNearestAncestorWithAlphaMemory(nccNode,am);
        test.ok(ancestor.id !== jn_earlier.id);
        test.ok(ancestor.id === joinNode.id);
        

        test.done();
    },

    
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

    //check that constantTests can be failed
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

    //check that creating a constantTest using
    //constructors works
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

    //Check that when activated, an alpha memory
    //stores the passed in wme
    alphaMemoryTestActivation : function(test){
        var am = new ds.AlphaMemory();
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

    //Now test the helper function alphaNodeActivation,
    //which will call alphaMem or constantTest
    //activation as needed

    //this should call the constant test activation
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

    //this should call the alpha memory activation
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
    //token is not created in bm activation,
    //rather tokens are constructed before node decision,
    //in leftActivate
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

    //simulate a beta memory being triggered by the components
    //to form a new token.
    //test that the components ARE bound into a new token,
    //and that the betamemory stores that new token,
    //owning it correctly.
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
    relinkAlphaThrowsErrorOnNonJoinNode : function(test){
        test.throws(function(){
            p.relinkToAlphaMemory({});
        },Error);
        test.done();
    },
    
    simpleRelinkToAlphaTest : function(test){
        var bm = new ds.BetaMemory();
        var am = new ds.AlphaMemory();
        var jn = new ds.JoinNode(bm,am,[]);
        jn.nearestAncestor = p.findNearestAncestorWithAlphaMemory(bm,am);

        //unlink alpha:
        var index = am.children.map(function(d){return d.id;}).indexOf(jn.id);
        var removed = am.children.splice(index,1);
        //index 0 of removed remember, as splice return an []
        am.unlinkedChildren.push(removed[0]);

        test.ok(am.children.length === 0);
        test.ok(am.unlinkedChildren.length === 1);
                
        p.relinkToAlphaMemory(jn);

        test.ok(am.children.length === 1);
        test.ok(am.unlinkedChildren.length === 0);
        test.done();
    },

    //TODO:test with multiple ancestors

    //TODO:test where the ancestor !== null in later half

    //TODO:test error messages if unlinkedChildren does
    //not contain the relinking node
    
    
    //relink to beta test
    relinkToBetaMemoryTest : function(test){
        var bm = new ds.BetaMemory();
        var am = new ds.AlphaMemory();
        var jn = new ds.JoinNode(bm,am,[]);

        //remove the beta memory link:
        var index = bm.children.map(function(d){return d.id;}).indexOf(bm.id);
        var removed = bm.children.splice(index,1);
        //index 0 of removed remember, as splice return an []
        bm.unlinkedChildren.push(removed[0]);
        test.ok(bm.children.length === 0);
        p.relinkToBetaMemory(jn);
        test.ok(bm.children.length === 1);
        test.ok(bm.children[0].id === jn.id);
        test.done();
    },


    //build or share join node unlink test
    buildjoinNode_unlinkAlpha_test : function(test){
        //dummy parent to force bm to unlink am in jn
        var dummyParent = new ds.BetaMemory();
        var bm = new ds.BetaMemory(dummyParent);
        var am = new ds.AlphaMemory();
        var tests = [];
        test.ok(bm.items.length === 0);
        //should unlink alpha because beta is empty
        var jn = p.buildOrShareJoinNode(bm,am,tests);
                test.ok(am.children.length === 0);
        test.ok(am.unlinkedChildren.length === 1);        
        test.done();
    },

    buildJoinNode_unlinkBeta_test : function(test){
        var bm = new ds.BetaMemory();
        var am = new ds.AlphaMemory();
        var tests = [];

        test.ok(bm.items.length === 1);
        test.ok(am.items.length === 0);
        var jn = p.buildOrShareJoinNode(bm,am,tests);
        test.ok(bm.children.length === 0);
        test.ok(bm.unlinkedChildren.length === 1);
        test.ok(am.children.length === 1);
        test.done();
    },


    joinNodeLeftActivationUnlink_test : function(test){
        var dummyParent = {
            id: "dummy",
            dummy: true,
            children : [],
        }
        var bm = new ds.BetaMemory(dummyParent);
        var am = new ds.AlphaMemory();
        var tests = [];

        var jn = p.buildOrShareJoinNode(bm,am,tests);
        //should now be unlinked on the right:
        test.ok(am.children.length === 0);

        //put a token into the beta memory:
        var newToken = new ds.Token(null,null,null,{a:"first token"});
        bm.items.unshift(newToken);
        test.ok(bm.items.length === 1);
        //when activated, the alpha memory should be relinked
        p.joinNodeLeftActivation(jn,newToken);
        
        //and the beta memory should be unlinked
        test.ok(am.children.length === 1);
        test.ok(bm.children.length === 0);
        test.ok(bm.unlinkedChildren.length === 1);

        test.done();
    },

    joinNodeRightActivationUnlink_test : function(test){
        var bm = new ds.BetaMemory();
        var am = new ds.AlphaMemory();
        var tests = [];

        var testWME = new ds.WME({a:"first wme"});
        
        var jn = p.buildOrShareJoinNode(bm,am,tests);

        //beta should be unlinked:
        test.ok(bm.children.length === 0);
        test.ok(am.children.length === 1);
        //now relink through activation:
        p.alphaMemoryActivation(am,testWME);
        test.ok(am.items.length === 1);

        //through subsequence activation,
        //beta memory should be connected now:
        test.ok(bm.children.length === 1);
        //while the alpha remains connected:
        test.ok(am.children.length === 1);
        
        test.done();
    },
    
    
 
    //NEGATIVE NODE:
    simpleNegativeNodeLeftActivationTest : function(test){
        var bm = new ds.BetaMemory();
        var am = new ds.AlphaMemory();
        var tests = [["a","a"]];

        //avoid unlinking:
        var firstWME = new ds.WME({a:"blah"});
        var secondWME = new ds.WME({a:"zooo"});
        p.alphaMemoryActivation(am,firstWME);
        p.alphaMemoryActivation(am,secondWME);
        test.ok(am.items.length === 2);
        
        var negNode = new ds.NegativeNode(bm,am,tests);
        var postNNbm = new ds.BetaMemory(negNode);
        
        //verify unlinking is avoided
        test.ok(am.children.length === 1);
        //verify postNNbm is empty:
        test.ok(postNNbm.items.length === 0);
        
        //now activate:
        p.negativeNodeLeftActivation(negNode,new ds.Token(null,null,null,{a:"blah"}));

        //check that the token didn't get through
        test.ok(negNode.items.length === 1);
        test.ok(postNNbm.items.length === 0);
        test.ok(negNode.items[0].bindings['a'] === 'blah');
        test.ok(negNode.items[0].negJoinResults[0].owner.id === negNode.items[0].id);
        test.ok(negNode.items[0].negJoinResults[0].wme.id === firstWME.id);

        p.negativeNodeLeftActivation(negNode,new ds.Token(null,null,null,{a:"aweg"}));

        //check this token DID get through
        test.ok(negNode.items.length === 2);
        test.ok(postNNbm.items.length === 1);
        test.done();
    },

    //TODO: more extensive tests
    
    //negative node right activation
    simpleNegativeNodeRightActivation : function(test){
        var bm = new ds.BetaMemory();
        var am = new ds.AlphaMemory();
        var tests = [["a","b"]];

        var negNode = new ds.NegativeNode(bm,am,tests);
        //add a token to the neg node:
        var testToken = new ds.Token(null,null,null,{a:"testToken"});
        negNode.items.unshift(testToken);
        
        var postNNbm = new ds.BetaMemory(negNode);

        var inputWME = new ds.WME({a:"blah"});
        p.negativeNodeRightActivation(negNode,inputWME);

        test.ok(postNNbm.items.length === 0);
        test.ok(negNode.items.length === 1);
        test.ok(negNode.items[0].id === testToken.id);
        test.ok(negNode.items[0].negJoinResults[0].owner.id === testToken.id);
        test.ok(negNode.items[0].negJoinResults[0].wme.id === inputWME.id);

        test.done();
    },

    simpleNegativeNodeUnlinkTest : function(test){
        var dummyParent = new ds.BetaMemory();
        var bm = new ds.BetaMemory(dummyParent);
        var am = new ds.AlphaMemory();
        var tests = [["a","b"]];

        var negNode = p.buildOrShareNegativeNode(bm,am,tests);
        
        test.ok(negNode.items.length === 0);
        test.ok(am.children.length === 0);
        test.ok(am.unlinkedChildren.length === 1);
        
        test.done();
    },
    
    
    //ncc left activation
    testNCCLeftActivation_throw_error_test : function(test){
        test.throws(function(){
            p.nccNodeLeftActivation({},new ds.Token());
        },Error);

        test.throws(function(){
            p.nccNodeLeftActivation(new ds.NegatedConjunctiveConditionNode(),{});
        },Error);
        
        test.done();
    },
    
    testNCCLeftActivation : function(test){
        var parent = new ds.BetaMemory();
        var nccNode = new ds.NCCNode(parent);
        var childNode = new ds.BetaMemory(nccNode);
        var newToken = new ds.Token();

        test.ok(childNode.items.length === 0);
        test.ok(nccNode.items.length === 0);

        p.nccNodeLeftActivation(nccNode,newToken);

        test.ok(nccNode.items.length === 1);
        test.ok(childNode.items.length === 1);
        test.done();
    },

    //nccleftactivation_with_blocking_wme    
    testNCCLeftActivation_with_blocking_wme : function(test){
        var parent = new ds.BetaMemory();
        var nccNode = new ds.NCCNode(parent);
        var childNode = new ds.BetaMemory(nccNode);
        var partner = new ds.NCCPartnerNode(parent,1);

        nccNode.partner = partner;
        partner.nccNode = nccNode;

        var blockingToken = new ds.Token();
        
        partner.newResultBuffer.push(blockingToken);

        var token = new ds.Token();

        test.ok(childNode.items.length === 0);
        
        p.nccNodeLeftActivation(nccNode,token);

        test.ok(childNode.items.length === 0);
        test.ok(token.nccResults.length === 1);
        test.ok(token.nccResults[0].id === blockingToken.id);
        test.ok(blockingToken.parentToken.id === token.id);
        
        test.done();
    },

    //TODO: test nccnode with multiple
    //results in partners newresult buffer
    test_NCCNode_with_blocking_wmes_plural : function(test){
        var parent = new ds.BetaMemory();
        var nccNode = new ds.NCCNode(parent);
        var childNode = new ds.BetaMemory(nccNode);
        var partner = new ds.NCCPartnerNode(parent,1);

        nccNode.partner = partner;
        partner.nccNode = nccNode;

        var blockingToken = new ds.Token();
        var blockingToken2 = new ds.Token(null,null,null,{a:"the other token"});
        partner.newResultBuffer.push(blockingToken);
        partner.newResultBuffer.push(blockingToken2);
        
        var token = new ds.Token();

        test.ok(childNode.items.length === 0);
        
        p.nccNodeLeftActivation(nccNode,token);

        test.ok(childNode.items.length === 0);
        test.ok(token.nccResults.length === 2);
        //blocking token 2 is the older, as i'm pushing
        test.ok(token.nccResults[1].id === blockingToken2.id);
        test.ok(token.nccResults[0].id === blockingToken.id);
        test.ok(blockingToken.parentToken.id === token.id);
        test.ok(blockingToken2.parentToken.id === token.id);
        test.done();
    },

    
    //TODO:nccpartner left actviation
    testNccPartnerNodeLeftActivation : function(test){
        //create parent
        var parent = new ds.BetaMemory();
        //create partner
        var nccNode = new ds.NCCNode(parent);
        var partner = new ds.NCCPartnerNode(parent,1);

        nccNode.partner = partner;
        partner.nccNode = nccNode;

        var parentToken = new ds.Token();
        var testWME = new ds.WME({a:"test wme"});
        var token = new ds.Token(parentToken,testWME);
        var nccNodeToken = new ds.Token(parentToken,testWME);

        //put the nccnodetoken in the nccnode
        nccNode.items.unshift(nccNodeToken);

        test.ok(nccNode.items.length === 1);
        test.ok(nccNodeToken.nccResults.length === 0);
        
        p.nccPartnerNodeLeftActivation(partner,token);

        test.ok(nccNodeToken.nccResults.length === 1);
        test.ok(nccNodeToken.nccResults[0].id === token.id);
        

        test.done();
    },

    //todo: test nccpartnernode on variable numbers
    

    //left activate general
    leftActivateTokenPassTest : function(test){
        var dummyNode = {
            __isDummy : true,
            children : [],
            id : "dummy"
        };
        var token = new ds.Token();
        var wme = new ds.WME({a:"is a wme"});
        var joinTestResults = {b:"a binding"};

        var returnedToken = p.leftActivate(dummyNode,token,wme,joinTestResults);

        test.ok(returnedToken.isToken === true);
        test.ok(returnedToken.id !== dummyNode.id);
        test.ok(returnedToken.id !== token.id);
        test.ok(returnedToken.id !== wme.id);
        test.ok(returnedToken.wme.id === wme.id);
        test.ok(returnedToken.bindings['b'] === "a binding");
        test.done();
    },

    leftActivateNoNewTokenPass : function(test){
        var dummyNode = {
            __isDummy : true,
            children : [],
            id : "dummy"
        };
        var token = new ds.Token();
        var returnedToken = p.leftActivate(dummyNode,token);
        test.ok(returnedToken.id === token.id);
        test.done();
    },

    
    leftActivateUnrecognisedNodeFail : function(test){
        var badDummyNode = {
            children : [],
            id : "dummy"
        };
        var token = new ds.Token();
        test.throws(function(){
            p.leftActivate(badDummyNode,token);
        },Error);
        test.done();
    },
    
    //left activate beta memory
    leftActivateBetaMemoryTest : function(test){
        var betaMemory = new ds.BetaMemory();
        var token = new ds.Token(null,null,null,{a:"a token"});

        test.ok(betaMemory.items.length === 1);
        
        var returnedToken = p.leftActivate(betaMemory,token);
        test.ok(returnedToken.id === token.id);
        test.ok(betaMemory.items.length === 2);
        test.done();
    },

    //left activate joinnode
    leftActivateJoinNode : function(test){
        var bm = new ds.BetaMemory();
        var am = new ds.AlphaMemory();
        var testWME = new ds.WME({a:"a wme"});
        p.alphaMemoryActivation(am,testWME);
        var jn = new ds.JoinNode(bm,am,[]);//no join tests
        var postJNbm = new ds.BetaMemory(jn);
        
        var testToken = new ds.Token();
        p.leftActivate(jn,testToken);

        test.ok(postJNbm.items.length === 1);
        test.ok(postJNbm.items[0].parentToken.id === testToken.id);
        test.ok(postJNbm.items[0].wme.id === testWME.id);
        test.done();
    },
    
    //left activate negative node
    leftActivateNegativeNodePassThrough : function(test){
        var bm = new ds.BetaMemory();
        var am = new ds.AlphaMemory();
        var testWME1 = new ds.WME({a:"first wme"});
        var testWME2 = new ds.WME({a:"second wme"});
        
        p.alphaMemoryActivation(am,testWME1);
        p.alphaMemoryActivation(am,testWME2);

        //Neg node to test token.bindings['b'] === am.data['a']
        var negNode = new ds.NegativeNode(bm,am,[["b","a"]]);
        var postNNbm = new ds.BetaMemory(negNode);

        var testToken = new ds.Token(null,null,null,{b:"a token"});
        test.ok(postNNbm.items.length === 0);
        p.leftActivate(negNode,testToken);

        //token should pass to postNNbm, as there
        //are no bindings to cause either of the
        //wmes to block the token
        test.ok(postNNbm.items.length === 1);
        test.ok(postNNbm.items[0].id === testToken.id);
        
        test.done();
    },
    
    //TODO:left activate ncc and partner
    leftActivateNccNodeTest : function(test){
        var nccNode = new ds.NCCNode();
        var testToken = new ds.Token();

        test.ok(nccNode.items.length === 0);
        
        p.leftActivate(nccNode,testToken);
        test.ok(nccNode.items.length === 1);
        test.ok(nccNode.items[0].id === testToken.id);
        
        test.done();
    },

    leftActivateNccPartnerNodeTest : function(test){
        var parent = new ds.BetaMemory();
        var nccPartner = new ds.NCCPartnerNode(parent);
        var testToken = new ds.Token();

        test.ok(nccPartner.newResultBuffer.length === 0);
                
        p.leftActivate(nccPartner,testToken);
        
        test.ok(nccPartner.newResultBuffer.length === 1);
        test.ok(nccPartner.newResultBuffer[0].id === testToken.id);
        
        test.done();
    },
    
    //right activate throw error
    rightActivateThrowErrorOnUnrecognisedNode : function(test){
        var badDummyNode = {
            id : "dummy",
            children : [],
        };

        test.throws(function(){
            p.rightActivate(badDummyNode,new ds.WME({a:"a wme"}));
        },Error);

        test.done();
    },
    
    //Right activate joinNode
    rightActivateJoinNodeTest : function(test){
        var bm = new ds.BetaMemory();
        var am = new ds.AlphaMemory();
        var tests = [["a","b"]];
        var jn = new ds.JoinNode(bm,am,tests);
        var postJNbm = new ds.BetaMemory(jn);

        var testWME = new ds.WME({a:"a wme"});

        test.ok(postJNbm.items.length === 0);
        
        //right activate:
        p.rightActivate(jn,testWME);

        test.ok(postJNbm.items.length === 1);
        test.ok(postJNbm.items[0].parentToken.id === bm.items[0].id);
        test.ok(postJNbm.items[0].wme.id === testWME.id);
        
        
        test.done();
    },
    
    //todo:right activate negative node
    rightActivateNegativeNodeTest : function(test){
        var parent = new ds.BetaMemory();
        
        var am = new ds.AlphaMemory();
        var tests = [["tokenBinding","wmeValue"]];
        var negNode = new ds.NegativeNode(parent,am,tests);
        var testToken = new ds.Token(null,null,null,{tokenBinding:"a binding"});
        var testWME = new ds.WME({"wmeValue":"a binding"});

        negNode.items.unshift(testToken);
        
        test.ok(negNode.items.length === 1);
        test.ok(negNode.items[0].negJoinResults.length === 0);
        
        p.rightActivate(negNode,testWME);

        test.ok(negNode.items.length === 1);
        test.ok(negNode.items[0].negJoinResults.length === 1);
        
        
        test.done();
    },

    

    
    
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

    //don't make a new one, reuse
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

    //reuse the correct one when there are multiple children
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

    
    //------------
    //alpha memory
    //------------

    //build an alpha network when there isnt even an conditions
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

    //build an alpha network with a single condition
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

    //reuse existing alpha nodes
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

    //check sequences of tests can be created
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


    //check that pairs of tests are in a single branch
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

    //check that different conditions don't share
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


    //Check that an alpha network will
    //branch off existing branches
    alphaNetworkBranchOffExisting_check : function(test){
        var dummyRoot = {
            id : "dummy",
            children : [],
        };
        var con1 = new ds.Condition([["first","EQ","BILL"],
                                     ["second","EQ","BOB"]],
                                    [],false);
        //Con 2 shares the first test, but not the second test
        var con2 = new ds.Condition([["first","EQ","BILL"],
                                     ["second","EQ","JILL"]],
                                    [],false);
        
        var alphaMemory1 = p.buildOrShareAlphaMemory(con1,dummyRoot);
        var alphaMemory2 = p.buildOrShareAlphaMemory(con2,dummyRoot);

        test.ok(dummyRoot.children.length === 1);
        test.ok(dummyRoot.children[0].children.length === 2);
        //added using unshift
        test.ok(alphaMemory1.parent.id === dummyRoot.children[0].children[1].id);
        test.ok(alphaMemory2.parent.id === dummyRoot.children[0].children[0].id);
        test.done();
    },

    
    //beta memory

    //build a simple beta memory
    //avoids the dummy initialisation using a parent
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

    //reuse existing beta memories
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

    //when the join tests/ bindings are different,
    //don't share a join node
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

    //set up the bm and am to avoid right and left unlinking
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
    
    //(build)negative node
    simpleBuildNegativeNodeTest : function(test){
        var bm = new ds.BetaMemory();
        var am = new ds.AlphaMemory();
        var tests = [["a",'b']];
        var negNode = p.buildOrShareNegativeNode(bm,am,tests);
        test.ok(negNode.isNegativeNode === true);
        //should not be unlinked, as there is the dummy token
        test.ok(negNode.items.length === 1);
        test.ok(negNode.items[0].id === bm.items[0].id);
        test.ok(negNode.tests.length === 1);
        test.ok(negNode.nearestAncestor === null);
        test.done();
    },
    
    //(share) negative node
    simpleShareNegativeNodeTest : function(test){
        var bm = new ds.BetaMemory();
        var am = new ds.AlphaMemory();
        var tests = [["a","b"]];
        var negNode = p.buildOrShareNegativeNode(bm,am,tests);
        var shouldBeDuplicate = p.buildOrShareNegativeNode(bm,am,tests);
        test.ok(negNode.id === shouldBeDuplicate.id);
        test.ok(negNode.nearestAncestor === null);
        test.done();
    },
 
    //Build a network for the rule:
    //if(wme.first === 5) then action
    buildNetworkForConditionsTest : function(test){
        var rootAlpha = {
            id: "rootAlpha",
            children : [],
        };
        var rootBeta = new ds.BetaMemory();
        
        //make an array of conditions
        //this test: just a single [condition]
        var condition_s = [new ds.Condition([["first","EQ",5]],
                                            [],false)];
        
        //build the network
        var finalNode = p.buildOrShareNetworkForConditions(rootBeta,condition_s,rootAlpha);

        //rootBeta + rootAlpha -> jn -> finalBetaMemory
        //rootBeta is unlinked as it has a dummy token,
        //because the root alpha is empty
        
        //top down:
        test.ok(rootAlpha.children.length === 1);
        test.ok(rootAlpha.children[0].isConstantTestNode === true);
        test.ok(rootAlpha.children[0].outputMemory !== undefined);
        test.ok(rootAlpha.children[0].outputMemory.children.length === 1);
        test.ok(rootAlpha.children[0].outputMemory.children[0].isJoinNode === true);

        //bottom up:
        test.ok(finalNode.isBetaMemory === true);
        test.ok(finalNode.parent.isJoinNode === true);
        test.done();
    },

    //clone of above, but using the ReteNet ctor
    buildNetworkForConditionsTest_from_ReteNetObject : function(test){
        var reteNet = new ds.ReteNet();
        
        //make an array of conditions
        //this test: just a single [condition]
        var condition_s = [new ds.Condition([["first","EQ",5]],
                                            [],false)];
        
        //build the network
        var finalNode = p.buildOrShareNetworkForConditions(reteNet.dummyBetaMemory,condition_s,reteNet.rootAlpha);

        //rootBeta + rootAlpha -> jn -> finalBetaMemory
        //rootBeta is unlinked as it has a dummy token,
        //because the root alpha is empty
        
        //top down:
        test.ok(reteNet.rootAlpha.children.length === 1);
        test.ok(reteNet.rootAlpha.children[0].isConstantTestNode === true);
        test.ok(reteNet.rootAlpha.children[0].outputMemory !== undefined);
        test.ok(reteNet.rootAlpha.children[0].outputMemory.children.length === 1);
        test.ok(reteNet.rootAlpha.children[0].outputMemory.children[0].isJoinNode === true);

        //bottom up:
        test.ok(finalNode.isBetaMemory === true);
        test.ok(finalNode.parent.isJoinNode === true);
        test.done();
    },

    
    //share entire network for conditions:
    shareNetworkForConditionsTest : function(test){
        var reteNet = new ds.ReteNet();
        
        //make an array of conditions
        //this test: just a single [condition]
        var condition_s = [new ds.Condition([["first","EQ",5]],
                                            [],false)];
        
        //build the network
        var finalNode = p.buildOrShareNetworkForConditions(reteNet.dummyBetaMemory,condition_s,reteNet.rootAlpha);

        //rootBeta + rootAlpha -> jn -> finalBetaMemory
        //rootBeta is unlinked as it has a dummy token,
        //because the root alpha is empty
        
        //top down:
        test.ok(reteNet.rootAlpha.children.length === 1);
        test.ok(reteNet.rootAlpha.children[0].isConstantTestNode === true);
        test.ok(reteNet.rootAlpha.children[0].outputMemory !== undefined);
        test.ok(reteNet.rootAlpha.children[0].outputMemory.children.length === 1);
        test.ok(reteNet.rootAlpha.children[0].outputMemory.children[0].isJoinNode === true);

        //bottom up:
        test.ok(finalNode.isBetaMemory === true);
        test.ok(finalNode.parent.isJoinNode === true);

        //now try it again
        var condition2_s = [new ds.Condition([["first","EQ",5]],
                                             [],false)];
        //check its not the same:
        test.ok(condition2_s[0].id !== condition_s[0].id);

        //build it:
        var anotherFinalNode = p.buildOrShareNetworkForConditions(reteNet.dummyBetaMemory,condition2_s,reteNet.rootAlpha);

        test.ok(anotherFinalNode.id === finalNode.id);
        
        
        test.done();
    },

    //simple add Rule test
    simpleAddRuleTest : function(test){
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
                                        [],false
                                    ]//end of c1
                                ],//end of conditions
                                //the Action
                                function(){
                                    testValue += 5;
                                });

        //call the rules action. tv === 5
        test.ok(testValue === 0);
        aRule.action();
        test.ok(testValue === 5);
        var returnedActionNode = p.addRule(aRule,reteNet);
        test.ok(returnedActionNode.isActionNode === true);
        //call the returned action node, tv === 10
        p.activateActionNode(returnedActionNode,new ds.Token());
        test.done();
    },

    
    //build a negative network node
    buildNetworkWithNegativeCondition_test : function(test){
        var reteNet = new ds.ReteNet();
        
        //make an array of conditions
        //this test: just a single [condition]
        var condition_s = [new ds.Condition([["first","EQ",5]],
                                            [["a","first"]],true),
                           new ds.Condition([["second","EQ",10]],
                                            [["b","second"]],true)];
        
        //build the network
        var finalNode = p.buildOrShareNetworkForConditions(reteNet.dummyBetaMemory,condition_s,reteNet.rootAlpha);

        //rootBeta + rootAlpha -> jn -> finalBetaMemory
        //rootBeta is unlinked as it has a dummy token,
        //because the root alpha is empty
        
        //top down:
        test.ok(reteNet.rootAlpha.children.length === 2);
        test.ok(reteNet.rootAlpha.children[0].isConstantTestNode === true);
        test.ok(reteNet.rootAlpha.children[0].outputMemory !== undefined);
        test.ok(reteNet.rootAlpha.children[0].outputMemory.children.length === 1);
        test.ok(reteNet.rootAlpha.children[0].outputMemory.children[0].isNegativeNode === true);
        //console.log(reteNet.rootAlpha.children[0].outputMemory.children[0].children[0]);
        //oldest node check
        test.ok(reteNet.rootAlpha.children[0].outputMemory.children[0].children[0].isBetaMemory === true);
        //newest node  check
        test.ok(reteNet.rootAlpha.children[1].outputMemory.children[0].children[0].isNegativeNode === true);
        
        //bottom up:
        test.ok(finalNode.isBetaMemory === true);
        test.ok(finalNode.parent.isNegativeNode === true);
        //the negative node connecting to the output memory node should be the
        //output of the second condition, which is the newest so i=0,
        //and it should be a negative node  connecting c1 to output
        //nodes won't be unlinked, because negative nodes dont get unlinked
        test.ok(reteNet.dummyBetaMemory.children[0].isNegativeNode === true);
        test.ok(reteNet.dummyBetaMemory.children[0].children.length === 1);
        test.ok(reteNet.dummyBetaMemory.children[0].children[0].isNegativeNode === true);
        test.ok(reteNet.dummyBetaMemory.children[0].children[0].id === finalNode.parent.id);
        test.done();

    },


    //todo:(build)nccnode
    buildNCCNodeTest : function(test){
        var reteNet = new ds.ReteNet();
        
        //make an array of conditions
        //this test: just a single [condition]
        var condition_s = [new ds.Condition([["first","EQ",5]],
                                            [["a","first"]],false),
                           //for NCCConditions, wrap in an array the arguments you'd pass to multiple conditions
                           new ds.NCCCondition(
                               [//conditions in subnetwork,in matrix form
                                   [[["second","EQ",10]],[["b","second"]],false]
                               ]//end of conditions in subnetwork
                           )//end of ncccondition
                          ];//end of conditions array
        
        //build the network
        var finalNode = p.buildOrShareNetworkForConditions(reteNet.dummyBetaMemory,condition_s,reteNet.rootAlpha);

        //now test the network
        test.ok(finalNode.isBetaMemory === true);
        test.ok(finalNode.parent.isAnNCCNode === true);
        test.ok(finalNode.parent.partner.isAnNCCPartnerNode === true);
        test.ok(finalNode.parent.parent.parent.id === reteNet.dummyBetaMemory.id);

        test.done();
    },
    
    //todo:(share) nccnode
    shareNCCNodeTest : function(test){
        // test.ok(false);
        test.done();
    },


    
    //--------------------
    //WME functions:
    //--------------------
    
    //addWME test
    addWME_thatFiresRule_Test : function(test){
        //build a simple network
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
                                        [],false
                                    ]//end of c1
                                ],//end of conditions
                                //the Action
                                function(){
                                    testValue += 5;
                                });

        //call the rules action. tv === 5
        test.ok(testValue === 0);
        aRule.action();
        test.ok(testValue === 5);
        var returnedActionNode = p.addRule(aRule,reteNet);
        test.ok(returnedActionNode.isActionNode === true);
        //call the returned action node, tv === 10
        p.activateActionNode(returnedActionNode,new ds.Token());
        //assert a wme
        var createdWMEid = p.addWME({first:5,second:"the first wme"},reteNet);

        //check up the network
        test.ok(returnedActionNode.parent.isBetaMemory === true);
        test.ok(returnedActionNode.parent.items.length === 1);
        test.ok(returnedActionNode.parent.items[0].wme.id === createdWMEid);

        //check the output action was fired
        //tv should === 15 now, after 3 firings
        test.ok(testValue === 15);
        
        test.done();
    },

    addWME_thatDoesNotFireRule_Test : function(test){
        //build a simple network
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
                                        [],false
                                    ]//end of c1
                                ],//end of conditions
                                //the Action
                                function(){
                                    testValue += 5;
                                });

        //call the rules action. tv === 5
        test.ok(testValue === 0);
        aRule.action();
        test.ok(testValue === 5);
        var returnedActionNode = p.addRule(aRule,reteNet);
        test.ok(returnedActionNode.isActionNode === true);
        //call the returned action node, tv === 10
        p.activateActionNode(returnedActionNode,new ds.Token());
        //assert a wme
        //first = 0, not 5, so doesnt satisfy rule
        var createdWMEid = p.addWME({first:0,second:"the second wme"},reteNet);

        //check up the network
        test.ok(returnedActionNode.parent.isBetaMemory === true);
        test.ok(returnedActionNode.parent.items.length === 0);

        //check the output action was NOT fired
        //tv should === 10, because only two firings.
        test.ok(testValue === 10);
                
        test.done();
    },

    //REMOVE WME AND TOKEN HELPER FUNCTION TESTS:

    testRemoveAlphaMemoryItemsForWME : function(test){
        var am1 = new ds.AlphaMemory();
        var am2 = new ds.AlphaMemory();
        var am3 = new ds.AlphaMemory();
        //create a wme
        var awme = new ds.WME({a:"first wme"});

        //put some various alphamemoryitems in it
        p.alphaMemoryActivation(am1,awme);
        p.alphaMemoryActivation(am2,awme);
        p.alphaMemoryActivation(am3,awme);

        test.ok(awme.alphaMemoryItems.length === 3);
        
        //call
        p.removeAlphaMemoryItemsForWME(awme);
                
        //check that the alphamemory has no items for the wme anymore
        test.ok(awme.alphaMemoryItems.length === 0);
        test.ok(am1.items.length === 0);
        test.ok(am2.items.length === 0);
        test.ok(am3.items.length === 0);
        test.done();
    },

    testActivateIfNegatedJRIsUnblocked : function(test){
        var jn = new ds.JoinNode();
        var bm = new ds.BetaMemory(jn);//used to verify
        var token = new ds.Token(null,null,jn);
        var wme = new ds.WME({a:"test wme"});
                //create a JR
        var njr = new ds.NegativeJoinResult(token,wme);

        //check the connections:
        test.ok(jn.children.length === 1);
        test.ok(bm.parent !== undefined);
        
        //try blocking and unblocking it
        test.ok(bm.items.length === 0);
        p.activateIfNegatedJRIsUnblocked(njr);
        test.ok(bm.items.length === 0);

        token.negJoinResults.shift();//unblock
        test.ok(njr.owner.negJoinResults.length === 0);
        p.activateIfNegatedJRIsUnblocked(njr);
        test.ok(bm.items.length === 1,bm.items.length);
        test.done();
    },


    testDeleteAllNegJoinResultsForWME : function(test){
        var jnRootOwner = new ds.JoinNode();
        var bm = new ds.BetaMemory(jnRootOwner);
        //create a wme
        var aToken = new ds.Token(null,null,jnRootOwner);
        var aToken2 = new ds.Token(null,null,jnRootOwner);
        var awme = new ds.WME({a:"test wme"});
        //add some negative join results in
        var njr1 = new ds.NegativeJoinResult(aToken,awme);
        var njr2 = new ds.NegativeJoinResult(aToken2,awme);

        test.ok(bm.items.length === 0);
        test.ok(awme.negJoinResults.length === 2);
        
        //call
        p.deleteAllNegJoinResultsForWME(awme);
        
        //check the owning token's negJoinResults is filtered correctly
        test.ok(awme.negJoinResults.length === 0);
        test.ok(bm.items.length === 2);
        test.done();
    },

    testUnlinkAlphaMemory : function(test){
        var bm = new ds.BetaMemory();
        //create an alphamemory
        var am = new ds.AlphaMemory();
        //link it:
        var jn1 = new ds.JoinNode(bm,am);
        var jn2 = new ds.JoinNode(bm,am);
        var jn3 = new ds.JoinNode(bm,am);

        test.ok(am.children.length === 3);
        test.ok(bm.children.length === 3);

        p.unlinkAlphaMemory(am);

        test.ok(bm.children.length === 0);
        //call
        //check it is unlinked
        test.done();
    },

    testUnlinkAlphaMemoryAlt : function(test){
        var bm = new ds.BetaMemory();
        //create an alphamemory
        var am = new ds.AlphaMemory();
        p.alphaMemoryActivation(am,new ds.WME({a:"a wme"}));
        test.ok(am.items.length === 1);
        //link it:
        var jn1 = new ds.JoinNode(bm,am);
        var jn2 = new ds.JoinNode(bm,am);
        var jn3 = new ds.JoinNode(bm,am);

        test.ok(am.children.length === 3);
        test.ok(bm.children.length === 3);

        p.unlinkAlphaMemory(am);

        test.ok(am.children.length === 3);
        test.ok(bm.children.length === 3);
        
        test.done();
    },
    

    testremoveTokenFromNode : function(test){
        var bm = new ds.BetaMemory();
        //create a token
        var token = new ds.Token(null,null,bm);
        //add it to a node
        p.betaMemoryActivation(bm,token);

        test.ok(token.owningNode.id === bm.id);
        test.ok(bm.items.length === 2);
        //call
        p.removeTokenFromNode(token);

        //check node no longer has the token
        test.ok(bm.items.length === 1);
        test.done();
    },

    testRemoveTokenFromWME : function(test){
        //create a token, connect it to a WME
        var awme = new ds.WME({a:"a wme"});
        var token = new ds.Token(null,awme);

        test.ok(token.wme.id === awme.id);
        test.ok(awme.tokens.length === 1);
        test.ok(awme.tokens[0].id === token.id);
        //call
        p.removeTokenFromWME(token);

        //check wme no longer linked to token
        test.ok(awme.tokens.length === 0);
        test.done();
    },

    testRemoveTokenFromParentToken : function(test){
        //create a token,
        var token = new ds.Token();
        //create a child token
        var cToken = new ds.Token(token);
        test.ok(cToken.parentToken.id === token.id);
        test.ok(token.children.length === 1);
        test.ok(token.children[0].id === cToken.id);
        //call
        p.removeTokenFromParentToken(cToken);
                
        //check parent is no longer linked to child
        test.ok(token.children.length === 0);
        
        test.done();
    },

    testIfEmptyBetaMemoryUnlinkSkip : function(test){
        //create something that is not a beta memory
        var am = new ds.AlphaMemory();
        var ret = p.ifEmptyBetaMemoryUnlink(am);

        test.ok(ret === false);
        test.done();
    },
    
    testIfEmptyBetaMemoryUnlink  : function(test){
        //create a betamemory, link it
        var bm = new ds.BetaMemory();
        var bm2 = new ds.BetaMemory(bm);
        var am = new ds.AlphaMemory();
        var jn = new ds.JoinNode(bm2,am,[]);
        //call
        test.ok(am.children.length === 1);
        p.ifEmptyBetaMemoryUnlink(bm2);
        //check corresponding alpha memory is unlinked
        test.ok(am.children.length === 0);
                
        test.done();
    },

    testIfEmptyNegNodeUnlink : function(test){
        var bm = new ds.BetaMemory();
        var am = new ds.AlphaMemory();
        //create negative node
        var nn = new ds.NegativeNode(bm,am,["a","b"]);

        test.ok(nn.items.length === 0);
        test.ok(am.children.length === 1);
        test.ok(bm.children.length === 1);
        
        //call
        p.ifEmptyNegNodeUnlink(nn);
        //check alphamemory is no longer linked

        test.ok(am.children.length === 0);
        test.ok(bm.children.length === 1);
        
        test.done();
    },

    testRemoveNegJoinResultsForToken : function(test){
        var awme = new ds.WME({a:"first"});
        var wme2 = new ds.WME({a:"second"});
        var wme3 = new ds.WME({a:"third"});
        //create a token
        var token = new ds.Token();
        //create some negative join results
        var njr1 = new ds.NegativeJoinResult(token,awme);
        var njr2 = new ds.NegativeJoinResult(token,wme2);
        var njr3 = new ds.NegativeJoinResult(token,wme3);

        //check they have been added to the token and wmes:
        test.ok(token.negJoinResults.length === 3);
        test.ok(awme.negJoinResults.length === 1);
        test.ok(wme2.negJoinResults.length === 1);
        test.ok(wme3.negJoinResults.length === 1);
        
        //call
        p.removeNegJoinResultsForToken(token);
        
        //check all negJoinResults have been cleared

        test.ok(token.negJoinResults.length === 0);
        test.ok(awme.negJoinResults.length === 0);
        test.ok(wme2.negJoinResults.length === 0);
        test.ok(wme3.negJoinResults.length === 0);

        
        test.done();
    },

    cleanupNCCOwnedToken_skip_Test : function(test){
        var bm = new ds.BetaMemory();
        //create a token
        var token = new ds.Token();

        token.owningNode = bm;

        var ret = p.cleanupNCCResultsInToken(token);

        test.ok(ret === false);

        test.done();
    },

    cleanupNCCResultsInToken_proper_test : function(test){
        var testWME1 = new ds.WME({a:"first wme"});
        var testWME2 = new ds.WME({a:"second wme"});
        var bm = new ds.BetaMemory();
        var nccNode = new ds.NCCNode(bm);
        var token = new ds.Token();
        token.owningNode = nccNode;
        var blockingToken = new ds.Token(null,testWME1);
        var blockingToken2 = new ds.Token(null,testWME2);
        token.nccResults.push(blockingToken);
        token.nccResults.push(blockingToken2);

        test.ok(token.nccResults.length === 2);
        test.ok(testWME1.tokens.length === 1);
        test.ok(testWME2.tokens.length === 1);
                
        var ret = p.cleanupNCCResultsInToken(token);

        test.ok(ret === true);
        test.ok(token.nccResults.length === 0);
        test.ok(testWME1.tokens.length === 0);
        test.ok(testWME2.tokens.length === 0);
        
        
        test.done();
    },

    //todo: expand to test token has owningnode, which is an nccpartner
    //and a parent token
    cleanupNCCPartnerOwnedToken_skip_test : function(test){
        var token = new ds.Token();
        var ret = p.cleanupNCCPartnerOwnedToken(token);
        test.ok(ret === false);
        test.done();
    },
    
    cleanupNCCPartnerOwnedTokenTest : function(test){
        var bm = new ds.BetaMemory();
        //create a parent token
        var parToken = new ds.Token();
        //create an nccResult token
        var testToken = new ds.Token(parToken);
        //linked to a partnerNode
        var partner = new ds.NCCPartnerNode(bm);
        testToken.owningNode = partner;
        parToken.nccResults.push(testToken);

        test.ok(parToken.nccResults.length === 1);
        
        var ret = p.cleanupNCCPartnerOwnedToken(testToken);

        test.ok(ret === true);
        test.ok(parToken.nccResults.length === 0);

        test.done();
    },

    testIfNCCPartnerNodeActivateIfAppropriate_skip : function(test){
        var parent = new ds.BetaMemory();
        //create a token
        var parentToken = new ds.Token();
        var token = new ds.Token(parentToken);
        //linked to an nccpartnernode
        var nccNode = new ds.NCCNode(parent);
        var partner = new ds.NCCPartnerNode(parent,1);
        nccNode.partner = partner;
        partner.nccNode = nccNode;
        token.owningNode = partner;
        token.parentToken.nccResults.push(token);
        //call
        var ret = p.ifNCCPartnerNodeActivateIfAppropriate(token);
        //check children are activated appropriately
        test.ok(ret === false);
        test.done();
    },


    testIfNCCPartnerNodeActivateIfAppropriate : function(test){
        var parent = new ds.BetaMemory();
        //create a token
        var parentToken = new ds.Token();
        var token = new ds.Token(parentToken);
        //linked to an nccpartnernode
        var nccNode = new ds.NCCNode(parent);
        var partner = new ds.NCCPartnerNode(parent,1);
        nccNode.partner = partner;
        partner.nccNode = nccNode;
        token.owningNode = partner;
        //call
        var ret = p.ifNCCPartnerNodeActivateIfAppropriate(token);
        //check children are activated appropriately
        test.ok(ret === true);
        test.done();
    },
    
    testDeleteTokenAndDescendents : function(test){
        var awme = new ds.WME({a:"a wme"});
        var aNode = new ds.BetaMemory();
        //create chain of tokens
        var t0 = new ds.Token();
        var t1 = new ds.Token(t0,awme,aNode);
        p.betaMemoryActivation(aNode,t1);
        var t2 = new ds.Token(t1);
        var t2b = new ds.Token(t1);
        var t3 = new ds.Token(t2);

        test.ok(t1.children.length === 2);
        test.ok(t1.owningNode.id === aNode.id);
        test.ok(t0.children.length === 1);
        test.ok(awme.tokens.length === 1);
        test.ok(t1.parentToken.id === t0.id);
        test.ok(aNode.items.length === 2);
        
        //call
        //delete t1. t2-3 should go,
        //t0 should not have any children
        p.deleteTokenAndDescendents(t1);
        //check deleted
        test.ok(t0.children.length === 0);
        test.ok(t1.children.length === 0);
        test.ok(awme.tokens.length === 0);
        test.ok(aNode.items.length === 1);
        
        test.done();
    },

    testDeleteDescendentsOfToken : function(test){
        var awme = new ds.WME({a:"a wme"});
        var aNode = new ds.BetaMemory();
        //create chain of tokens
        var t0 = new ds.Token();
        var t1 = new ds.Token(t0,awme,aNode);
        p.betaMemoryActivation(aNode,t1);
        var t2 = new ds.Token(t1);
        var t2b = new ds.Token(t1);
        var t3 = new ds.Token(t2);

        test.ok(t1.children.length === 2);
        test.ok(t1.owningNode.id === aNode.id);
        test.ok(t0.children.length === 1);
        test.ok(awme.tokens.length === 1);
        test.ok(t1.parentToken.id === t0.id);
        test.ok(aNode.items.length === 2);
        
        //call
        //delete t1. t2-3 should go,
        //t0 should not have any children
        p.deleteDescendentsOfToken(t1);
        //check deleted
        test.ok(t0.children.length === 1);
        test.ok(t1.children.length === 0);
        test.ok(awme.tokens.length === 1);
        test.ok(aNode.items.length === 2);
        
        test.done();
    },

    testDeleteAllTokensForWME : function(test){
        //create a wme
        var aWME = new ds.WME({a:"wme"});
        //link it with some tokens
        var t1 = new ds.Token(null,aWME);
        var t2 = new ds.Token(null,aWME);
        var t3 = new ds.Token(null,aWME);

        test.ok(aWME.tokens.length === 3);
        //call
        p.deleteAllTokensForWME(aWME);
        //check all tokens are unlinked from wme
        test.ok(aWME.tokens.length === 0);
        
        test.done();
    },

    
    //END WME AND TOKEN REMOVAL HELPER FUNCTION TESTS
    
    //remove wme test
    removeWMETest : function(test){
        //build network
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
                                        [],false
                                    ]//end of c1
                                ],//end of conditions
                                //the Action
                                function(){
                                    testValue += 5;
                                });
        var returnedTerminalNode = p.addRule(aRule,reteNet);
        test.ok(returnedTerminalNode.isActionNode === true);
        

        
        //assert a wme
        var wmeId = p.addWME({first:5,second:"aTestWme"},reteNet);
        
        //check the output fired
        //1 activation, so 5
        test.ok(testValue === 5);
        test.ok(returnedTerminalNode.parent.items[0].wme.id === wmeId);
        //remove the wme
        p.removeWME(reteNet.allWMEs[wmeId]);
        
        //check the network updated appropriately

        //test.ok(reteNet.allWMEs[wmeId] === undefined);
        test.ok(reteNet.allWMEs[wmeId].alphaMemoryItems.length === 0,reteNet.allWMEs[wmeId].alphaMemoryItems.length);
        test.ok(reteNet.allWMEs[wmeId].tokens.length === 0);
        test.ok(reteNet.allWMEs[wmeId].negJoinResults.length === 0);
        test.ok(returnedTerminalNode.parent.items.length === 0);
        test.done();
    },
    //--------------------
    //Other:
    //--------------------

    //update new node with matches from above test:

    //Test uNNWMFA on a parent that is a beta memory.
    //use a beta memory to store the results
    //of the left activate to verify
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

        //+1 for dummy === 5
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

    //test on a network where the parent
    //of the jn has multiple jn's. only the one you care about
    //should be updated
    joinNodeUpdateNewNodeWithMatches : function(test){
        //priors
        var bm = new ds.BetaMemory();
        var am = new ds.AlphaMemory();
        var tests = [["a","first"]];

        //am and bm population:
        p.alphaMemoryActivation(am,new ds.WME({first:"a wme"}));
        p.alphaMemoryActivation(am,new ds.WME({first:"second wme"}));
        p.betaMemoryActivation(bm,new ds.Token(null,null,null,{second:"a token"}));
        p.betaMemoryActivation(bm,new ds.Token(null,null,null,{second:"b token"}));
        
        //check they are there:
        test.ok(am.items.length === 2);
        test.ok(bm.items.length === 3);
                                       
        //the node to pull from
        var jn = new ds.JoinNode(bm,am,tests);

        //node to update        
        var postjnBM = new ds.BetaMemory(jn);
        //nodes that should not be updated
        var additionalBM = new ds.BetaMemory(jn);
        var additionalBM2 = new ds.BetaMemory(jn);

        //The actual function being tested:
        p.updateNewNodeWithMatchesFromAbove(postjnBM);

        //verify:
        //Full combination as no join tests to limit
        test.ok(postjnBM.items.length === (am.items.length * bm.items.length),postjnBM.items.length);
        test.ok(additionalBM.items.length === 0);
        test.ok(additionalBM2.items.length === 0);

        //test bindings in wmes in reverse order
        //wme newest,[token] -> wme oldest,[token]
        //by going in this direction, newest to oldest,
        //doesnt this push into the next memory
        //oldest to newest?
        //first wmes:
        test.ok(postjnBM.items[0].bindings['a'] === "a wme");
        test.ok(postjnBM.items[0].bindings['second'] === undefined);

        test.ok(postjnBM.items[1].bindings['a'] === "a wme");
        test.ok(postjnBM.items[1].bindings['second'] === "a token");

        test.ok(postjnBM.items[2].bindings['a'] === "a wme");
        test.ok(postjnBM.items[2].bindings['second'] === "b token");
        //second wmes:
        test.ok(postjnBM.items[3].bindings['a'] === "second wme");
        test.ok(postjnBM.items[3].bindings['second'] === undefined);
        
        test.ok(postjnBM.items[4].bindings['a'] === "second wme");
        test.ok(postjnBM.items[4].bindings['second'] === "a token");
                
        test.ok(postjnBM.items[5].bindings['a'] === "second wme");
        test.ok(postjnBM.items[5].bindings['second'] === "b token");
        test.done();
    },
    
    negativeNodeUpdateNewNodeWithMatches : function(test){
        var negativeNode = new ds.NegativeNode(null,null,[["a","b"]]);

        //put some join results in the negative node:
        negativeNode.items.unshift(new ds.Token(null,null,null,{
            a : "first token"}));
        negativeNode.items.unshift(new ds.Token(null,null,null,{
            a : "second token"}));
        negativeNode.items.unshift(new ds.Token(null,null,null,{
            a : "third token"}));

        //the descendent to update:
        var postNNBM = new ds.BetaMemory(negativeNode);

        p.updateNewNodeWithMatchesFromAbove(postNNBM);
        
        test.ok(postNNBM.items.length === 3);
        test.ok(postNNBM.items[0].bindings['a'] === "first token");
        test.ok(postNNBM.items[1].bindings['a'] === "second token");
        test.ok(postNNBM.items[2].bindings['a'] === "third token");

        
        test.done();
    },

    //TODO:test unnwmfa on an nccnode...
    testUNNWMFA_on_nccNode : function(test){
        var bm = new ds.BetaMemory();
        //create an nccNode
        var nccNode = new ds.NCCNode(bm);
        var postNCCbm = new ds.BetaMemory(nccNode);
        //store a couple of tokens
        var t0 = new ds.Token();
        var t1 = new ds.Token();
        var t2 = new ds.Token();
        nccNode.items =[t0,t1,t2];
        
        //block some of them
        var blockToken = new ds.Token();
        t1.nccResults.push(blockToken);

        test.ok(nccNode.items.length === 3);
        
        //call the update
        p.updateNewNodeWithMatchesFromAbove(postNCCbm);
        
        //check that only the unblocked tokens were activated
        test.ok(postNCCbm.items.length === 2);
        test.ok(postNCCbm.items[0].id === t2.id);
        test.ok(postNCCbm.items[1].id === t0.id);
        test.done();
    },
    

    //--------------------
    //delete node and any unused ancestors tests:
    //--------------------
    
    //nccnode with partner test
    //beta memory / partner node token deletion
    //join node /negative node alpha memory cleanup
    //alpha memory cleanup
    //join node cleanup
    
    deleteNodeAndAncestorsTest : function(test){
        //create a pair of nodes
        var bm = new ds.BetaMemory();
        var bm2 = new ds.BetaMemory(bm);
        //add some tokens to it:
        var t0 = new ds.Token(null,null,bm2);
        var t1 = new ds.Token(null,null,bm2);
        p.betaMemoryActivation(bm2,t0);
        p.betaMemoryActivation(bm2,t1);

        test.ok(bm.children.length === 1);
        test.ok(bm2.items.length === 2);
        test.ok(t0.owningNode.id === bm2.id);
        test.ok(t1.owningNode.id === bm2.id);
        
        //delete it
        p.deleteNodeAndAnyUnusedAncestors(bm2);

        //check:
        test.ok(bm2.items.length === 0);
        test.ok(bm.children.length === 0);
        test.done();
    },


    
    //remove rule
    removeRuleTest : function(test){
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
                                        [],false
                                    ]//end of c1
                                ],//end of conditions
                                //the Action
                                function(){
                                    testValue += 5;
                                });

        var aSecondRule = new ds.Rule("secondRule",
                                        [//conditions
                                            [//c1
                                                [//tests
                                                    //test1
                                                    ['first','EQ',10]
                                                ],//end tests
                                                [],false
                                            ]
                                        ],
                                        function(){
                                            testValue += 100;
                                        });
        
        var returnedActionNode = p.addRule(aRule,reteNet);
        var secondActionNode = p.addRule(aSecondRule,reteNet);
        test.ok(returnedActionNode.isActionNode === true);
        test.ok(secondActionNode.isActionNode === true);

        //assert a wme
        var wmeId1 = p.addWME({first:5,second:"the first wme"},reteNet);
        test.ok(testValue === 5);
        //assert a second wme
        var wmeId2 = p.addWME({first:10,second:"the second wme"},reteNet);
        test.ok(testValue === 105);

        test.ok(wmeId1 !== wmeId2);
        test.ok(returnedActionNode.parent.children.length === 1);
        test.ok(secondActionNode.parent.children.length === 1);
        
        //delete one rule
        p.removeRule(returnedActionNode);

        test.ok(returnedActionNode.parent.children.length === 0);
        test.ok(secondActionNode.parent.children.length === 1);

        //check surviving rules:
        var wmeId3 = p.addWME({first:5,second:"third wme"},reteNet);
        //The rule shouldnt fire:
        test.ok(testValue !== 110);
        //but this one should:
        var wmeId4 = p.addWME({first:10,second:"fourth wme"},reteNet);
        test.ok(testValue === 205);
        test.done();
    },


    
};
