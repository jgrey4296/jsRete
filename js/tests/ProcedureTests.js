var ds = require('../dataStructures');
var p = require('../procedures');


exports.procedureTests = {

    //compare node to test

    //get join tests from condition:


    //--------------------
    //Activation tests:
    //--------------------

    //action node activation

    
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
        test.ok(aWme.alphaMemoryItems.length === 1);
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

    //perform join tests check
    
    //join node left activation

    //join node right activation
    
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

    //alpha memory
    
    //beta memory

    //join node

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

    //findNearestAncestorWithSameAlphaMemory

    //update new node with matches from above test:

    //remove rule

    //delete node and any unused ancestors
    
};
