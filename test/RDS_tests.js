import * as RDS from '../src/ReteDataStructures';
import * as chai from 'chai';
let should = chai.should();

describe("DataStructures", function(){

    describe('ProposedAction', function(){
        it('exists', function(){
            let aProposedAction = new RDS.ProposedAction();
            should.exist(aProposedAction);
        });

    });

});
