//To be used with mocha --require babel-polyfill --compilers js:babel-register
//Import * as aModule from '../src/aModule';
import { ReteNet } from '../src/ReteClassInterface';
import * as RDS from '../src/ReteDataStructures';
import { Rule } from '../src/RuleCtors';
import * as chai from 'chai';
import _ from 'lodash';

let should = chai.should(),
    expect = chai.expect;

describe ("RetNet Interface", function() {

    beforeEach(function(){
        this.reteNet = new ReteNet();
    });

    afterEach(function(){
        this.reteNet = null;
    });
    
    describe("existence", function() {
        it("should exist", function() {
            should.exist(this.reteNet);
            this.reteNet.should.be.an.instanceof(ReteNet);
        });
    });

    describe("assertions", function() {
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

    describe("retractions", function() {
        it("Should be able to retract simple facts", function(){
            let data = { testInfo: "blah" },
                wmeId = this.reteNet.assertWME(data);
            _.keys(this.reteNet.allWMEs).should.have.length(1);
            this.reteNet.retractWME(wmeId);
            _.keys(this.reteNet.allWMEs).should.have.length(0);
        });
    });

    describe("Enacted Actions history", function() {
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

    describe("Proposed Actions", function() {

        it("Should be able to store and clear", function(){
            this.reteNet.proposedActions[1] = 1;
            this.reteNet.proposedActions[2] = 2;
            _.keys(this.reteNet.proposedActions).should.have.length(2);
            this.reteNet.clearProposedActions()
        _.keys(this.reteNet.proposedActions).should.have.length(0);
        });
        
    });

    describe("Rules", function() {
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

        it("Should fire when a matching wme is asserted", function(){
            let aRule = new this.reteNet.Rule(),
                data = { "first" : 5, "second" : 10 },
                components;

            aRule.newCondition("positive",{
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

            let actionNode = this.reteNet.addRule(aRule)[1];
            actionNode.should.be.an.instanceof(RDS.ActionNode);
            
            _.keys(this.reteNet.proposedActions).should.have.length(0);
            _.keys(this.reteNet.allWMEs).should.have.length(0);

            let wmeId = this.reteNet.assertWME(data);

            _.keys(this.reteNet.allWMEs).should.have.length(1);
            this.reteNet.allWMEs[wmeId].should.not.be.undefined;
            this.reteNet.allWMEs[wmeId].data.should.deep.equal(data);

            _.keys(this.reteNet.proposedActions).should.have.length(1);
            
            let theProposedAction = _.values(this.reteNet.proposedActions)[0];
            theProposedAction.should.be.an.instanceof(RDS.ProposedAction);
            theProposedAction.actionType.should.equal('assert');
            theProposedAction.payload.should.deep.equal({ "bindings": { "blah" : 5 }, "output" : 10 });
            theProposedAction.token.should.be.an.instanceof(RDS.Token);
            
            
        });
        
    });
    
});
 
