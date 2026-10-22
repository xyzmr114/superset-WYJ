import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyMessages} from './replies';
import {shortlist,pendingAutoReply,nextReplyCheck,replyCheckChanges,followupPrompt,restoreProspects} from './prospects';
const target='https://www.linkedin.com/in/recipient';
const make=()=>({...shortlist([],{name:'Recipient',url:target},'Find a pilot')[0],status:'connected' as const});
test('incoming, outgoing and unknown senders remain distinct; deceptive domains never verify',()=>{
 const rows=classifyMessages(target,[{body:'Can I try it?',senderUrl:target,eventId:'1'},{body:'Here is the link',senderUrl:'https://www.linkedin.com/in/me',eventId:'2'},{body:'Unknown',senderUrl:'https://evillinkedin.com/in/me'},{body:'No sender'}]);
 assert.deepEqual(rows.map(r=>r.direction),['incoming','outgoing','unknown','unknown']);
});
test('message identity survives more history loading and profile tracking URL variants',()=>{
 const message={body:'Yes, send the link',senderUrl:target,time:'10:42 AM'};
 const initial=classifyMessages(target,[message])[0];
 const later=classifyMessages(target+'/?tracking=1',[{body:'Older history'},message])[1];
 assert.equal(initial.id,later.id);
 assert.notEqual(initial.id,classifyMessages(target,[{...message,eventId:'different-event'}])[0].id);
});
test('automatic draft occurs once per incoming message and failed drafts back off',()=>{
 const p={...make(),reply:'Send a link',pendingReplyId:'message-1'};
 assert.equal(pendingAutoReply(p,100),true);
 assert.equal(pendingAutoReply({...p,draftedReplyId:'message-1'},100),false);
 assert.equal(pendingAutoReply({...p,draftedReplyId:'message-1',pendingReplyId:'message-2'},100),true);
 assert.equal(pendingAutoReply({...p,draftRetryAt:1000},999),false);
 assert.equal(pendingAutoReply({...p,draftRetryAt:1000},1000),true);
 assert.equal(pendingAutoReply({...p,pendingReplyId:''},100),false);
 assert.equal(pendingAutoReply({...p,status:'closed'},100),false);
});
test('monitor checks the oldest due contact and skips closed, uncontacted and backed-off contacts',()=>{
 const connected=make();const invited={...make(),url:'https://www.linkedin.com/in/other',status:'invited' as const,checkedAt:10};
 assert.equal(nextReplyCheck([{...connected,status:'closed'},{...connected,status:'shortlisted'},{...connected,nextCheckAt:101},invited],100)?.url,invited.url);
 assert.equal(nextReplyCheck([invited,connected],100)?.url,connected.url);
});
test('deduplication and backoff state persist with a prospect and older records migrate',()=>{
 const p={...make(),pendingReplyId:'m1',draftedReplyId:'m1',draftRetryAt:300};
 const restored=restoreProspects({getItem:()=>JSON.stringify([p])});
 assert.equal(pendingAutoReply(restored[0],500),false);
 const {pendingReplyId,draftedReplyId,draftRetryAt,checkedAt,nextCheckAt,syncError,...old}=p;
 const migrated=restoreProspects({getItem:()=>JSON.stringify([old])})[0];
 assert.equal(migrated.pendingReplyId,'');assert.equal(migrated.nextCheckAt,0);
});

test('poll lifecycle queues an incoming reply once, then stops when the latest event is outgoing',()=>{
 let p={...make(),...replyCheckChanges({latestIncoming:{id:'first',body:'Send me a link'}},100)};
 assert.equal(p.status,'replied');assert.equal(p.reply,'Send me a link');assert.equal(pendingAutoReply(p,100),true);
 p={...p,draftedReplyId:'first'};
 p={...p,...replyCheckChanges({latestIncoming:{id:'first',body:'Send me a link'}},1000)};
 assert.equal(pendingAutoReply(p,1000),false);
 p={...p,...replyCheckChanges({latestIncoming:{id:'second',body:'Does Tuesday work?'}},2000)};
 assert.equal(pendingAutoReply(p,2000),true);
 p={...p,...replyCheckChanges({latestIncoming:null,note:'Latest event is outgoing'},3000)};
 assert.equal(pendingAutoReply(p,3000),false);
});
test('large saved contexts fit the agent request limit',()=>{
 const p={...make(),goal:'g'.repeat(4000),reason:'r'.repeat(2000),reply:'x'.repeat(12000),lastDraft:'d'.repeat(3000)};
 assert.ok(followupPrompt(p).length<12000);
 assert.ok(followupPrompt({...p,reply:'\u0000'.repeat(12000)}).length<12000);
});
