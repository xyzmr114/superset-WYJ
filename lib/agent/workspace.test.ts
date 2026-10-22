import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CHAT_KEY,DRAFT_KEY,restoreConversation,restoreWorkingDraft,saveWorkingDraft,openWorkingDraft} from './workspace';
function storage(){const values=new Map<string,string>();return {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}};}

test('conversation survives navigation without importing other private fields',()=>{
  const tab=storage();
  tab.setItem(CHAT_KEY,JSON.stringify({messages:[{role:'user',content:'An idea'}],input:'Next thought',memo:'# Draft',sources:[],accessCode:'not part of saved conversation',privateNotes:'separate intake'}));
  const restored=restoreConversation(tab);
  assert.equal(restored.messages[0].content,'An idea');assert.equal(restored.input,'Next thought');assert.equal(restored.memo,'# Draft');
  assert.equal('accessCode' in restored,false);assert.equal('privateNotes' in restored,false);
});
test('edited memo survives refresh and reopening from the same conversation',()=>{
  const tab=storage();
  openWorkingDraft(tab,'# Generated draft');
  saveWorkingDraft(tab,'# My edited draft');
  assert.equal(restoreWorkingDraft(tab)?.markdown,'# My edited draft');
  assert.equal(openWorkingDraft(tab,'# Generated draft').markdown,'# My edited draft');
  assert.equal(restoreWorkingDraft(tab)?.revision,2);
  assert.equal(openWorkingDraft(tab,'# New generated idea').markdown,'# New generated idea');
});
test('corrupt or missing tab state opens an empty workspace',()=>{
  const tab=storage();tab.setItem(CHAT_KEY,'not json');tab.setItem(DRAFT_KEY,'{}');
  assert.deepEqual(restoreConversation(tab).messages,[]);assert.equal(restoreWorkingDraft(tab),null);
});

test('goal and profile research survive navigation with older conversations still supported',()=>{
  const tab=storage();
  tab.setItem(CHAT_KEY,JSON.stringify({messages:[],input:'',memo:'',sources:[],goal:'Find a collaborator',activity:['Reading a LinkedIn profile'],people:[{name:'Abhinav',url:'https://www.linkedin.com/in/abhinav/',text:'Public profile evidence'}]}));
  const result=restoreConversation(tab);
  assert.equal(result.goal,'Find a collaborator');
  assert.equal(result.people[0].text,'Public profile evidence');
  assert.equal(result.activity.length,1);
  tab.setItem(CHAT_KEY,JSON.stringify({messages:[],input:'',memo:'',sources:[]}));
  assert.deepEqual(restoreConversation(tab).people,[]);
});
