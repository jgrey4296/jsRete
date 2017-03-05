import * as RDS from '../src/ReteDataStructures';
import * as chai from 'chai';
let should = chai.should(),
    expect = chai.expect;

describe("Basic DataStructures ", function(){

    describe('ProposedAction', function(){
        it('exists', function(){
            let aProposedAction = new RDS.ProposedAction();
            expect(aProposedAction).to.exist;
        });
    });

    describe("WME", function() {
        it('exists', function(){
            let aWME = new RDS.WME();
            expect(aWME).to.exist;
        });
    });

    describe("Token", function(){
        it('exists', function(){
            let aToken = new RDS.Token();
            expect(aToken).to.exist;
        });
    });

    describe("AlphaMemoryItem", function(){
        it("exists", function(){
            let aMemItem = new RDS.AlphaMemoryItem();
            expect(aMemItem).to.exist;
        });
    });
        
    describe("AlphaNode", function() {
        it("exists", function(){
            let aNode = new RDS.AlphaNode();
            expect(aNode).to.exist;
        });
    });

    describe("AlphaMemory", function() {

        it("exists", function(){
            expect(()=>{ new RDS.AlphaMemory() }).to.throw(Error);
        });
    });

    describe("ReteNode", function() {

        it("exists", function(){
            let aNode = new RDS.ReteNode();
            expect(aNode).to.exist;
        });
    });

    describe("BetaMemory", function() {
        it("exists", function(){
            let aBeta = new RDS.BetaMemory();
            expect(aBeta).to.exist;
        });
    });

    describe("JoinNode", function() {
        it("exists", function(){
            let aNode = new RDS.JoinNode();
            expect(aNode).to.exist;
        });
    });

    describe("ActionNode", function() {

        it("exists", function(){
            let aNode = new RDS.ActionNode();
            expect(aNode).to.exist;
        });
    });

    describe("NegativeJoinResult", function() {
        it("exists", function(){
            let aResult = new RDS.NegativeJoinResult();
            expect(aResult).to.exist;
        });
    });

    describe("NegativeNode", function() {
        it("exists", function(){
            let aNegativeNode = new RDS.NegativeNode();
            expect(aNegativeNode).to.exist;
        });
    });

    describe("NCCNode", function() {
        it("exists", function(){
            let anNCCNode = new RDS.NCCNode();
            expect(anNCCNode).to.exist;
        });
    });

    describe("NCCPartnerNode", function() {
        it("exists", function(){
            let anNCCPartner = new RDS.NCCPartnerNode();
            expect(anNCCPartner).to.exist;
        });
    });
});
