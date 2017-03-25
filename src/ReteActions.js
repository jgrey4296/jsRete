/**
   Aggregates ReteNet Actions that implement {@link module:ReteAggregateActionDefinitions}
   @module ReteActions
*/
import AssertAction  from './ReteActionAssert';
import RetractAction from './ReteActionRetract';
import AddRuleAction from './ReteAction_addRule';
import RemoveRuleAction  from './ReteAction_removeRule';

//Action node possible actions:
//Stores both performance functions and proposal functions
//in the form: { name : {name: "", performFunc : func, propseFunc : func } }
let AggregateActionDefinitions = {};
export default AggregateActionDefinitions;

//Performance functions take a retenet, and a payload
//proposal functions are bound to an action description, and take a token and a retenet

//eg: the action asserts a new wme, with an arithmetic action of +2,
//the action has the information (+ 2), the incoming token as the base value to add to.

//Proposal functions return an object of the form:
//{ action: "", payload: {}, (timeData)? }


//** @action assert
AggregateActionDefinitions[AssertAction.name] = AssertAction;
//** @action retract
AggregateActionDefinitions[RetractAction.name] = RetractAction;

//** @action AddRule
AggregateActionDefinitions[AddRuleAction.name] = AddRuleAction;

//** @action removeRule
AggregateActionDefinitions[RemoveRuleAction.name] = RemoveRuleAction;



