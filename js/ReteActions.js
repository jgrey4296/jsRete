/**
   @file ReteActions
   @purpose Defines action proposals
*/
var ArithmeticActions = require('./ReteArithmeticActions'),
    _ = require('underscore'),
    ReteUtil = require('./ReteUtilities'),
    RDS = require('./ReteDataStructures'),
    AssertAction = require('./ReteActionAssert'),
    RetractAction = require('./ReteActionRetract'),
    AddRuleAction = require('./ReteAction_AddRule'),
    RemoveRuleAction = require('./ReteAction_removeRule');

"use strict";

//Action node possible actions:
//Stores both performance functions and proposal functions
//in the form: { name : {name: "", performFunc : func, propseFunc : func } }
var ActionInterface = {};

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


module.exports = ActionInterface;

