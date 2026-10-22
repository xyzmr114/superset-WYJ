import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHarnessRun,authorizeHarnessRun,listHarnessTools,callHarnessTool} from './bridge';
import type {AgentEvent} from '@/lib/agent/schema';
const input={provider:'deepseek',model:'deepseek-flash',messages:[{role:'user' as const,content:'Help with outreach'}]};

test('MCP grants are bound to one run and revoked on completion or abort',()=>{
  const controller=new AbortController();const a=registerHarnessRun(input,()=>{},controller.signal);const b=registerHarnessRun(input,()=>{},new AbortController().signal);
  assert.ok(authorizeHarnessRun(a.id,'Bearer '+a.token));assert.equal(authorizeHarnessRun(a.id,'Bearer '+b.token),null);
  assert.equal(authorizeHarnessRun(a.id,null),null);controller.abort();assert.equal(authorizeHarnessRun(a.id,'Bearer '+a.token),null);
  b.release();assert.equal(authorizeHarnessRun(b.id,'Bearer '+b.token),null);a.release();
});
test('OpenCode MCP exposes application tools and returns editable action cards without sending',async()=>{
  const events:AgentEvent[]=[];const run=registerHarnessRun(input,event=>events.push(event),new AbortController().signal);
  const names=listHarnessTools(run.run).map(tool=>tool.name);
  assert.ok(names.includes('search_linkedin_people'));assert.ok(names.includes('draft_linkedin_post'));assert.ok(names.includes('search_web'));assert.ok(names.includes('fetch_web_page'));assert.ok(names.includes('read_github_file'));assert.ok(names.includes('draft_linkedin_connection'));
  assert.equal(names.some(name=>/submit|send_message|publish|bash|cookie|password/.test(name)),false);
  const grant=authorizeHarnessRun(run.id,'Bearer '+run.token)!;
  await callHarnessTool(grant,'draft_linkedin_message',{profileUrl:'https://www.linkedin.com/in/example/',title:'Ask about booking groups',body:'Could I ask how group bookings work at your hostel?'});
  const event=events.find(event=>event.type==='action');assert.ok(event?.type==='action'&&event.action.kind==='linkedin_message');
  assert.match(event.action.body,/group bookings/);
  await assert.rejects(()=>callHarnessTool(grant,'draft_linkedin_message',{profileUrl:'https://evil.test/',title:'Hi',body:'Hello'}));
  await assert.rejects(()=>callHarnessTool(grant,'bash',{command:'cat .env.local'}),/Unknown/);run.release();
});
