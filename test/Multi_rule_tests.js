//To be used with mocha --require babel-polyfill --compilers js:babel-register
//Import * as aModule from '../src/aModule';
import  ReteNet  from "../src/ReteClassInterface";
import * as RDS from "../src/ReteDataStructures";
import { Rule } from "../src/RuleCtors";
import * as chai from "chai";
import _ from "lodash";

let should = chai.should(),
    expect = chai.expect;

describe ("Multi-Rule Tests:", function() {

    beforeEach(function(){
        this.reteNet = new ReteNet();
    });

    afterEach(function(){
        this.reteNet.cleanup()
        this.reteNet = null;
    });

    describe("Assertions:", function() {

        beforeEach(function(){
            this.rule1 = new this.reteNet.Rule();
            this.rule2 = new this.reteNet.Rule();

            this.rule1.newCondition('positive',{
                tests: [['first','EQ',5]],
            })
                .newAction('assert','rule1_assertion',{
                    values: [['result','rule1']]
                });

            this.rule2.newCondition('positive',{
                tests: [['second','EQ',10]]
            })
                .newAction('assert','rule2_assertion',{
                    values: [['result','rule2']]
                });

            this.reteNet.addRule([this.rule1,this.rule2]);
        });

        afterEach(function(){

        });

        it("Should have two Rules registered", function(){
            _.keys(this.reteNet.allRules).should.have.length(2);
            _.keys(this.reteNet.actions).should.have.length(2);
        });


        it("Should fire both rules from the same passing wme", function(){
            let data = { first: 5, second: 10 };
            _.keys(this.reteNet.proposedActions).should.have.length(0);
            this.reteNet.assertWME(data);
            _.keys(this.reteNet.proposedActions).should.have.length(2);
        });

        it("Should fire both rules from different wmes", function(){
            let data1 = { first: 5 },
                data2 = { second: 10 };
            _.keys(this.reteNet.proposedActions).should.have.length(0);
            this.reteNet.assertWME(data1);
            this.reteNet.assertWME(data2);
            _.keys(this.reteNet.proposedActions).should.have.length(2);

        });
        
        it("Should fire only one rule when wme only matches that rule ", function(){
            let data = { first: 5 };
            _.keys(this.reteNet.proposedActions).should.have.length(0);
            this.reteNet.assertWME(data);
            _.keys(this.reteNet.proposedActions).should.have.length(1);
        });

        it("Should fire only one rule when data structure matches, but content doesnt", function(){
            let data = { first: 5, second: 15 };
            _.keys(this.reteNet.proposedActions).should.have.length(0);
            this.reteNet.assertWME(data);
            _.keys(this.reteNet.proposedActions).should.have.length(1);
        });

        it("Should fire only one rule when data structure type is incorrect", function(){
            let data = { first: 5, second: "blah" };
            _.keys(this.reteNet.proposedActions).should.have.length(0);
            this.reteNet.assertWME(data);
            _.keys(this.reteNet.proposedActions).should.have.length(1);
        });

        it("Should fire no rules when nothing matches ", function(){
            let data = { third: "test" };
            _.keys(this.reteNet.proposedActions).should.have.length(0);
            this.reteNet.assertWME(data);
            _.keys(this.reteNet.proposedActions).should.have.length(0);
        });
        
    });

    describe("Updates from retractions", function() {

        beforeEach(function(){
            this.rule1 = new this.reteNet.Rule();
            this.rule2 = new this.reteNet.Rule();

            this.rule1.newCondition('positive',{
                tests: [['first','EQ',5]],
            })
                .newAction('assert','rule1_assertion',{
                    values: [['result','rule1']]
                });

            this.rule2.newCondition('positive',{
                tests: [['second','EQ',10]]
            })
                .newAction('assert','rule2_assertion',{
                    values: [['result','rule2']]
                });

            this.reteNet.addRule([this.rule1,this.rule2]);
        });

        afterEach(function(){

        });

        it("Should remove one of the proposed actions when that rule is invalidated", function(){
            let data1 = { first: 5 },
                data2 = { second: 10 };
            _.keys(this.reteNet.proposedActions).should.have.length(0);
            let wmeId1 = this.reteNet.assertWME(data1),
                wmeId2 = this.reteNet.assertWME(data2);
            _.keys(this.reteNet.proposedActions).should.have.length(2);
            this.reteNet.retractWME(wmeId1);
            _.keys(this.reteNet.proposedActions).should.have.length(1);
            let theRemainingAction = _.values(this.reteNet.proposedActions)[0];
            theRemainingAction.actionStringIdentifier.should.equal('rule2_assertion');
            theRemainingAction.payload.result.should.equal('rule2');

        });
        

    });


    

});
