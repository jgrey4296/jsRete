var ds = require('../dataStructures');
var p = require('../procedures');

//***Hack turning off info messages:
console.info = function(){};


var reteNet = new ds.ReteNet();

console.log("Creating WMEs");
var wmeData = {
    first : "bob",
    second : "bill",
};

console.log("Creating conditions");
//Array of conditions
var conditions = [
    [ //Array of a single Condition
        [
            ['first','EQ','bob'],
            ['second','EQ','bob']
        ], //Array of Test Triples
        [
            ['a','first']
        ], //array of binding tuples
        false //negative or not
    ],
];

console.log("Creating Rules");
var testRule = new ds.Rule("test1",conditions,function(){
    console.log(this.bindings['a']," Fired!");
});


console.log("Adding Rule");
var actionNode = p.addRule(testRule,reteNet);
//console.log("Got an Action Node:",actionNode);


console.log("Adding WME");
var wmeId = p.addWME(wmeData,reteNet);
//console.log("Added wme: ",wmeId);
