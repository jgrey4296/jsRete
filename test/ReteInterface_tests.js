//To be used with mocha --require babel-polyfill --compilers js:babel-register
//Import * as aModule from '../src/aModule';
import { ReteNet } from '../src/ReteClassInterface';
import * as RDS from '../src/ReteDataStructures';
import { Rule } from '../src/RuleCtors';
import * as chai from 'chai';
import _ from 'lodash';

let should = chai.should(),
    expect = chai.expect;

describe ("RetNet Interface:", function() {

    beforeEach(function(){
        this.reteNet = new ReteNet();
    });

    afterEach(function(){
        this.reteNet.cleanup()
        this.reteNet = null;
    });
    
    it("should exist", function() {
        should.exist(this.reteNet);
        this.reteNet.should.be.an.instanceof(ReteNet);
    });

    describe("Assertions:", function() {
        it("Should be able to assert simple facts", function(){
            let data = { testInfo: "blah" };
            this.reteNet.should.have.property('allWMEs');
            _.keys(this.reteNet.allWMEs).should.have.length(0);
            let wmeId = this.reteNet.assertWME(data);
            _.keys(this.reteNet.allWMEs).should.have.length(1);
            this.reteNet.allWMEs[wmeId].should.be.an.instanceof(RDS.WME);
            this.reteNet.allWMEs[wmeId].data.should.deep.equal(data);
        });
    });

    describe("Retraction:", function() {
        it("Should be able to retract simple facts", function(){
            let data = { testInfo: "blah" },
                wmeId = this.reteNet.assertWME(data);
            _.keys(this.reteNet.allWMEs).should.have.length(1);
            this.reteNet.retractWME(wmeId);
            _.keys(this.reteNet.allWMEs).should.have.length(0);
        });
    });

    describe("Enacted Actions history:", function() {
        it("Should store actions", function(){
            this.reteNet.enactedActions.should.have.length(0);
            this.reteNet.enactedActions.push(1);
            this.reteNet.enactedActions.push(2);
            this.reteNet.enactedActions.should.have.length(2);
        });

        it("Should be clearable", function(){
            this.reteNet.enactedActions.should.have.length(0);
            this.reteNet.enactedActions.push(1);
            this.reteNet.enactedActions.push(2);
            this.reteNet.enactedActions.should.have.length(2);
            this.reteNet.clearHistory()
            this.reteNet.enactedActions.should.have.length(0);
        });
    });

    describe("Proposed Actions:", function() {

        it("Should be able to store and clear", function(){
            this.reteNet.proposedActions[1] = 1;
            this.reteNet.proposedActions[2] = 2;
            _.keys(this.reteNet.proposedActions).should.have.length(2);
            this.reteNet.clearProposedActions()
            _.keys(this.reteNet.proposedActions).should.have.length(0);
        });
        
    });

    describe("Rules:", function() {
        it("Should be programmatic", function(){
            let aRule = new this.reteNet.Rule(),
                exampleData = { num : 5, str: "test" };
            //Chain create a rule
            aRule.newCondition("positive",{
                tests : [['num','EQ',5]],
                bindings : [['myStrBinding','str',[]],
                            ['myNumBinding','num',[]]]
            })
                .newAction("assert","testAction",{
                    values : [['actNum','${myNumBinding}'],
                              ['actStr','${myStrBinding}']],
                    arith : [['actNum','+',5]],
                    regexs : [['actStr','t','g','T']],
                    timing : [0,0,0]
                });

            _.keys(this.reteNet.actions).should.have.length(0);
            this.reteNet.rootAlpha.children.should.have.length(0);
            this.reteNet.dummyBetaMemory.children.should.have.length(0);
            this.reteNet.dummyBetaMemory.unlinkedChildren.should.have.length(0);
            
            this.reteNet.addRule(aRule);

            _.keys(this.reteNet.actions).should.have.length(1);
            this.reteNet.rootAlpha.children.should.have.length(1);
            this.reteNet.dummyBetaMemory.unlinkedChildren.should.have.length(1);
            
        });

        
        it("Should be convertable to components", function(){
            let aRule = new this.reteNet.Rule()
            aRule.should.be.an.instanceof(this.reteNet.Rule);
            
            aRule.newCondition("positive", {
                tests : [["first", "EQ", 5],
                         ["second", "EQ", 10]],
                bindings: [["blah", "first", []]]
            })
                .newAction("assert","testAction", {
                    values : [['output', '${blah}']],
                    arith: [["output", "+", 5]],
                    regexs : [],
                    timing : [0,0,0],
                    priority : 0
                });

            let components = this.reteNet.convertRulesToComponents(aRule);
            _.keys(components).should.have.length(3);
        });

        describe("Rule Testing:", function() {
            //Setup a rule to be used for this batch
            beforeEach(function(){
                this.aRule = new this.reteNet.Rule();
                this.aRule.newCondition("positive",{
                    tests : [["first","EQ",5],
                             ["second","EQ",10]],
                    bindings : [["blah","first",[]]],
                })
                    .newAction("assert","testAction",{
                        values : [["output","${blah}"]],
                        arith : [["output","+",5]],
                        regexs : [],
                        timing : [0,0,0],
                        priority : 0
                    });
                this.reteNet.addRule(this.aRule);
            });
            
            it("Should Propose an Action  when a matching wme is asserted", function(){
                let data = { "first" : 5, "second" : 10 };
                
                _.keys(this.reteNet.proposedActions).should.have.length(0);
                _.keys(this.reteNet.allWMEs).should.have.length(0);

                let wmeId = this.reteNet.assertWME(data);

                _.keys(this.reteNet.allWMEs).should.have.length(1);
                _.keys(this.reteNet.proposedActions).should.have.length(1);
                
                let theProposedAction = _.values(this.reteNet.proposedActions)[0];
                theProposedAction.should.be.an.instanceof(RDS.ProposedAction);
                theProposedAction.actionType.should.equal('assert');
                theProposedAction.payload.should.deep.equal({ "bindings": { "blah" : 5 }, "output" : 10 });
                theProposedAction.token.should.be.an.instanceof(RDS.Token);
                theProposedAction.actionStringIdentifier.should.equal("testAction")
            });

            it("Should not propose an action when a non-matching wme is asserted", function(){
                let data = { "first" : 10, "second" : 5 };
                _.keys(this.reteNet.proposedActions).should.have.length(0);
                _.keys(this.reteNet.allWMEs).should.have.length(0);
                this.reteNet.assertWME(data);
                _.keys(this.reteNet.allWMEs).should.have.length(1);
                _.keys(this.reteNet.proposedActions).should.have.length(0);
            });

            it("Should clean up proposed actions when the dependent wme is retracted", function(){
                let data = { "first": 5, "second": 10 };
                _.keys(this.reteNet.proposedActions).should.have.length(0);
                let wmeId = this.reteNet.assertWME(data);
                _.keys(this.reteNet.proposedActions).should.have.length(1);
                this.reteNet.retractWME(wmeId);
                _.keys(this.reteNet.proposedActions).should.have.length(0);
                _.keys(this.reteNet.allWMEs).should.have.length(0);
            });
            
        });

        describe("Binding modifications:", function(){

            beforeEach(function(){
                this.aRule = new this.reteNet.Rule();
                this.aRule.newCondition('positive',{
                    tests: [['first','EQ',5],
                            ['second','EQ','blah']],
                    //PAY ATTENTION TO THE 3-TUPLE
                    bindings: [['myStr','second', []],
                               ['myNum','first', []]]
                });
            });

            afterEach(function(){
                this.aRule = null;
            });

            it("Should modify strings", function(){
                this.aRule.newAction('assert','simpleStrMod',{
                    values: [['result','${myStr}']],
                    regexs: [['result','blah','g','bloo']]
                });
                this.reteNet.addRule(this.aRule);
                
                let data = { first: 5, second: 'blah'};
                this.reteNet.assertWME(data);
                _.keys(this.reteNet.proposedActions).should.have.length(1);
                let theAction = _.values(this.reteNet.proposedActions)[0];
                theAction.payload.result.should.equal('bloo');
                theAction.payload.result.should.not.equal('blah');
            });

            it("Should modify arithmetic", function(){
                this.aRule.newAction('assert','simpleArithMod',{
                    values: [['result','${myNum}']],
                    arith: [['result','+',5]]
                });
                this.reteNet.addRule(this.aRule);

                let data = { first: 5, second: 'blah' };
                this.reteNet.assertWME(data);
                _.keys(this.reteNet.proposedActions).should.have.length(1);
                let theAction = _.values(this.reteNet.proposedActions)[0];
                theAction.payload.result.should.equal(10);
                theAction.payload.result.should.not.equal(5);
            });
            
        });

        describe("Single Negative Conditions:", function() {

            beforeEach(function(){
                this.negRule = new this.reteNet.Rule();
                this.negRule.newCondition('positive',{
                    tests: [['first','EQ',5]],
                    bindings: []
                })
                    .newCondition('negative',{
                        tests: [['second','EQ',10]]
                    })
                    .newAction('assert','singleNegativeAction', {
                        values: [['result','second is not 10']]
                    });
                this.reteNet.addRule(this.negRule);
            });

            afterEach(function(){

            });

            it("Should assert if the negative condition is not met", function(){
                let data = { first: 5, second: 5 };
                this.reteNet.assertWME(data);
                _.keys(this.reteNet.proposedActions).should.have.length(1);
            });

            it("Should not assert if the negative condition is met", function(){
                let data = { first: 5, second: 10 };
                this.reteNet.assertWME(data);
                _.keys(this.reteNet.proposedActions).should.have.length(0);
            });

            it("Should not assert if the positive condition is not met, while the negative is", function(){
                let data = { first: 10, second: 10 };
                this.reteNet.assertWME(data);
                _.keys(this.reteNet.proposedActions).should.have.length(0);
            });

            it("Should not assert if the positive and negative conditions are not met", function(){
                let data = { first: 10, second: 5};
                this.reteNet.assertWME(data);
                _.keys(this.reteNet.proposedActions).should.have.length(0);
            });
            
        });

        describe("Conjunctive negation tests:", function() {

            beforeEach(function(){
                this.conjNegRule = new this.reteNet.Rule()
                this.conjNegRule.newCondition('positive',{
                    tests: [['first', 'EQ', 5]],
                    bindings: []                    
                })
                    .newCondition('negative',{
                        tests: [['second','EQ',10],
                                ['third','EQ',15]],
                        bindings: []
                    })
                    .newAction('assert','conjNegTest',{
                        values: [['result','second != 10, third != 15']]
                    });
                this.reteNet.addRule(this.conjNegRule);
            });

            it("Should Assert when neither negative condition is met", function(){
                let data = {first : 5, second: 5, third: 5 };
                this.reteNet.assertWME(data);
                _.keys(this.reteNet.proposedActions).should.have.length(1);
            });

            it("Should not assert if both negative conditions are met", function(){
                let data = {first: 5, second: 10, third: 15};
                this.reteNet.assertWME(data);
                _.keys(this.reteNet.proposedActions).should.have.length(0);
            });

            it("Should assert if only one negative condition is met", function(){
                let data = {first: 5, second: 5, third: 15};
                this.reteNet.assertWME(data);
                _.keys(this.reteNet.proposedActions).should.have.length(1);
            });

            it("Should not assert if the positive condition is not met, but the negative conditions are", function(){
                let data = { first: 10, second: 10, third: 15};
                this.reteNet.assertWME(data);
                _.keys(this.reteNet.proposedActions).should.have.length(0);
            });

            it("Should not assert if the positive and negative conditions are not met  ", function(){
                let data = { first: 10, second: 5, third: 5 };
                this.reteNet.assertWME(data);
                _.keys(this.reteNet.proposedActions).should.have.length(0);
            });
            
        });

    });

});
