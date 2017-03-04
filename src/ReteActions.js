/**
   Aggregates ReteNet Actions that implement {@link module:ReteActionInterface}
   @module ReteActions
*/
import _ from 'lodash';
import * as ArithmeticActions from './ReteArithmeticActions';
import * as ReteUtil from './ReteUtilities';
import * as RDS from './ReteDataStructures';
import * as AssertAction from './ReteActionAssert';
import * as RetractAction from './ReteActionRetract';
import * as AddRuleAction from './ReteAction_AddRule';
import * as RemoveRuleAction from './ReteAction_removeRule';



//Action node possible actions:
//Stores both performance functions and proposal functions
//in the form: { name : {name: "", performFunc : func, propseFunc : func } }
let ActionInterface = {};

//Performance functions take a retenet, and a payload
//proposal functions are bound to an action description, and take a token and a retenet

//eg: the action asserts a new wme, with an arithmetic action of +2,
//the action has the information (+ 2), the incoming token as the base value to add to.

//Proposal functions return an object of the form:
//{ action: "", payload: {}, (timeData)? }


//** @action assert
ActionInterface[AssertAction.name] = AssertAction;
//** @action retract
ActionInterface[RetractAction.name] = RetractAction;

//** @action AddRule
ActionInterface[AddRuleAction.name] = AddRuleAction;

//** @action removeRule
ActionInterface[RemoveRuleAction.name] = RemoveRuleAction;

export { ActionInterface };

