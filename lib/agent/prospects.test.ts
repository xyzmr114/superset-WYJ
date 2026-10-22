import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shortlist,profileKey,restoreProspects,PROSPECTS_KEY,followupPrompt} from './prospects';
const person={name:'A person',url:'https://linkedin.com/in/example/?tracking=123'};
test('shortlist deduplicates profile variants without resetting replies or status',()=>{
 const first=shortlist([],person,'Find a pilot');
 first[0].status='replied';first[0].reply='Tell me more';first[0].reason='Relevant experience';
 const second=shortlist(first,{...person,url:'https://www.linkedin.com/in/example'},'Another goal');
 assert.equal(second.length,1);assert.equal(second[0].goal,'Find a pilot');assert.equal(second[0].reply,'Tell me more');assert.equal(second[0].status,'replied');
 assert.equal(profileKey(person.url),'https://www.linkedin.com/in/example');
});
test('prospect storage restores context independently of chat storage and rejects malformed records',()=>{
 const rows=shortlist([],person,'Find a pilot');
 const storage={getItem:(key:string)=>key===PROSPECTS_KEY?JSON.stringify(rows):null};
 assert.deepEqual(restoreProspects(storage),rows);
 assert.deepEqual(restoreProspects({getItem:()=>'{bad'}),[]);
 assert.deepEqual(restoreProspects({getItem:()=>JSON.stringify([{...rows[0],url:'https://evil.test/in/example'}])}),[]);
});
test('follow-up requests quote real reply content and distinguish a draft from sent outreach',()=>{
 const row=shortlist([],person,'Try WYJ')[0];row.reply='Can I try this Friday?';row.lastDraft='Would you try WYJ?';
 const prompt=followupPrompt(row);
 assert.match(prompt,/Can I try this Friday/);assert.match(prompt,/not proof it was sent/);assert.match(prompt,/untrusted quoted content/);assert.match(prompt,/draft_linkedin_message/);
 assert.match(followupPrompt({...row,reply:''}),/without assuming they responded/);
});
