var ds = require('../dataStructures');
var p = require('../procedures');

var reteNet = new ds.ReteNet();

var wmeData = {
    first : "bob"
};

//Array of conditions
var conditions = [
    [ //Array of a single Condition
        [
            ['first','EQ','bob']
        ], //Array of Test Triples
        [
            ['a','first']
        ], //array of binding tuples
        false //negative or not
    ],
];

var testRule = new ds.Rule("test1",conditions,function(){
    console.log(this.bindings['a']," Fired!");
});

var actionNode = p.addRule(testRule,reteNet);
//console.log("Got an Action Node:",actionNode);

var wmeId = p.addWME(wmeData,reteNet);
//console.log("Added wme: ",wmeId);
