import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoReducer,initialDemo} from './demo-state';
test('cannot simulate mutual approval before local approval',()=>{const state=demoReducer(initialDemo(),{type:'partner'});assert.equal(state.exportable,false);});
test('editing an approved draft invalidates both approvals and increments version',()=>{let state=demoReducer(initialDemo(),{type:'approve'});state=demoReducer(state,{type:'partner'});assert.equal(state.exportable,true);state=demoReducer(state,{type:'save',markdown:'Changed disclosure'});assert.equal(state.version,2);assert.equal(state.myApproval,false);assert.equal(state.bothApproved,false);assert.equal(state.exportable,false);});

test('loading an agent memo is idempotent and never imports approvals',()=>{let state=demoReducer(initialDemo(),{type:'load',markdown:'Agent memo'});state=demoReducer(state,{type:'load',markdown:'Agent memo'});assert.equal(state.version,1);assert.equal(state.markdown,'Agent memo');assert.equal(state.exportable,false);});
