import {randomBytes,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {createFounderRun,type AgentRuntime} from '@/lib/agent/runner';
import type {AgentEvent,AgentInput} from '@/lib/agent/schema';
type Run=ReturnType<typeof createFounderRun>;
type Grant={token:string;run:Run;expires:number;signal:AbortSignal};
const g=globalThis as unknown as {__wyjHarnessRuns?:Map<string,Grant>};
const grants=g.__wyjHarnessRuns??=new Map<string,Grant>();
export function registerHarnessRun(input:AgentInput,emit:(event:AgentEvent)=>void,signal:AbortSignal,runtime?:AgentRuntime){
  const id=crypto.randomUUID();const token=randomBytes(32).toString('hex');
  const run=createFounderRun(input,emit,signal,runtime);
  grants.set(id,{token,run,signal,expires:Date.now()+180000});
  return {id,token,run,release:()=>grants.delete(id)};
}
export function authorizeHarnessRun(id:string,authorization:string|null){
  const grant=grants.get(id);const expected='Bearer '+(grant?.token??'');
  const supplied=Buffer.from(authorization??'');const wanted=Buffer.from(expected);
  if(!grant||grant.expires<Date.now()||grant.signal.aborted||supplied.length!==wanted.length||!timingSafeEqual(supplied,wanted))return null;
  return grant;
}
export function listHarnessTools(run:Run){
  return Object.entries(run.tools).map(([name,definition])=>({name,description:definition.description,inputSchema:z.toJSONSchema(definition.inputSchema as z.ZodType,{target:'draft-7'})}));
}
export async function callHarnessTool(grant:Grant,name:string,args:unknown){
  const definitions=grant.run.tools as unknown as Record<string,{inputSchema:z.ZodType;execute:(input:unknown)=>Promise<unknown>}>;
  const definition=definitions[name];if(!definition)throw new Error('Unknown WYJ tool.');
  grant.signal.throwIfAborted();
  const input=definition.inputSchema.parse(args);
  return definition.execute(input);
}
