import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertLegacyAgentAccess} from './legacy-agent-access';
const request=new Request('http://localhost/api/agent',{method:'POST'});
const session=async()=>({id:'founder',eventId:'room'});
test('legacy harness is disabled before reading a body or looking up sessions',async()=>{let called=false;await assert.rejects(assertLegacyAgentAccess(request,{enabled:false,session:async()=>{called=true;return session();}}),{status:410,code:'LEGACY_AGENT_DISABLED'});assert.equal(called,false);});
test('explicit legacy opt-in still denies Free and unauthenticated callers',async()=>{await assert.rejects(assertLegacyAgentAccess(request,{enabled:true,session:async()=>{throw Object.assign(new Error('Unauthorized'),{status:401});}}),{status:401});await assert.rejects(assertLegacyAgentAccess(request,{enabled:true,session,plan:async()=>({plan:'free',ideaCount:0,ideaLimit:5,billingConnected:false})}),{status:403,code:'PREMIUM_REQUIRED'});});
test('only an opted-in authenticated Premium session passes the legacy gate',async()=>{assert.equal((await assertLegacyAgentAccess(request,{enabled:true,session,plan:async()=>({plan:'premium',ideaCount:0,ideaLimit:null,billingConnected:false})})).id,'founder');});
