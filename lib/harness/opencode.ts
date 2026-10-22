import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createOpencodeClient} from '@opencode-ai/sdk';
import {registerHarnessRun} from './bridge';
import {finishFounderRun,type AgentRuntime} from '@/lib/agent/runner';
import {catalog,credentialFor,endpointFor} from '@/lib/agent/catalog';
import type {AgentInput,AgentEvent} from '@/lib/agent/schema';

async function startServer(config:unknown,signal:AbortSignal){
  const directory=path.join(process.cwd(),'.wyj-runtime');await mkdir(directory,{recursive:true,mode:0o700});
  const binary=path.join(process.cwd(),'node_modules','.bin',process.platform==='win32'?'opencode.cmd':'opencode');
  const child=spawn(binary,['serve','--hostname=127.0.0.1','--port=0'],{
    cwd:directory,stdio:['ignore','pipe','pipe'],
    env:{...process.env,OPENCODE_CONFIG_CONTENT:JSON.stringify(config),OPENCODE_DISABLE_PROJECT_CONFIG:'true',OPENCODE_DISABLE_AUTOUPDATE:'true',OPENCODE_DISABLE_DEFAULT_PLUGINS:'true',XDG_DATA_HOME:path.join(directory,'data'),XDG_CACHE_HOME:path.join(directory,'cache'),XDG_CONFIG_HOME:path.join(directory,'config')},
  });
  const stop=()=>child.kill('SIGTERM');signal.addEventListener('abort',stop,{once:true});
  try {
    const url=await new Promise<string>((resolve,reject)=>{
      const timeout=setTimeout(()=>{stop();reject(new Error('OpenCode did not start. Run pnpm install and check pnpm exec opencode --version.'));},25000);
      let buffer='';
      child.stdout.on('data',data=>{buffer+=data.toString();const match=buffer.match(/opencode server listening on (https?:\/\/[^\s]+)/);if(match){clearTimeout(timeout);resolve(match[1]);}});
      child.on('error',()=>{clearTimeout(timeout);reject(new Error('OpenCode binary unavailable. Run pnpm install.'));});
      child.on('exit',()=>{clearTimeout(timeout);reject(new Error('OpenCode stopped before it was ready. Check the harness configuration.'));});
      child.stderr.on('data',()=>{});
    });
    return {url,close(){signal.removeEventListener('abort',stop);stop();}};
  }catch(error){signal.removeEventListener('abort',stop);stop();throw error;}
}
export async function runOpenCode(input:AgentInput,emit:(event:AgentEvent)=>void,signal:AbortSignal,origin:string,runtime?:AgentRuntime){
  const grant=registerHarnessRun(input,emit,signal,runtime);
  let server:Awaited<ReturnType<typeof startServer>>|undefined;
  try {
    emit({type:'progress',message:'Starting the OpenCode harness'});
    const provider=catalog[input.provider];const apiKey=provider?credentialFor(provider):undefined;
    if(!provider||!apiKey)throw new Error('Configure the selected model provider first.');
    const tools=Object.fromEntries(Object.keys(grant.run.tools).map(name=>['wyj_'+name,true]));
    const config={
      enabled_providers:['wyj'],model:`wyj/${input.model}`,small_model:`wyj/${input.model}`,default_agent:'wyj',share:'disabled',autoupdate:false,snapshot:false,
      permission:{'*':'deny','wyj_*':'allow'},
      provider:{wyj:{npm:'@ai-sdk/openai-compatible',name:provider.name,options:{baseURL:endpointFor(provider),apiKey},models:{[input.model]:{name:provider.models[input.model]?.name??input.model,tool_call:true,reasoning:true,limit:{context:provider.models[input.model]?.limit?.context??128000,output:16384}}}}},
      agent:{wyj:{mode:'primary',prompt:grant.run.system,steps:10,tools:{'*':false,...tools}}},
      mcp:{wyj:{type:'remote',url:`${origin}/api/harness/mcp/${grant.id}`,headers:{Authorization:'Bearer '+grant.token},oauth:false,timeout:30000}},
    };
    server=await startServer(config,signal);
    const client=createOpencodeClient({baseUrl:server.url,throwOnError:true});
    const {data:session}=await client.session.create({body:{title:'WYJ founder workspace'},signal});
    if(!session)throw new Error('OpenCode could not create a session.');
    const {data:answer}=await client.session.prompt({path:{id:session.id},body:{agent:'wyj',model:{providerID:'wyj',modelID:input.model},system:grant.run.system,tools:{'*':false,...tools},parts:[{type:'text',text:'Conversation (use the last user message as the current request):\n'+JSON.stringify(input.messages)+(input.action==='draft_memo'?'\nCreate the memo now using wyj_draft_solution_memo.':'')}]},signal});
    if(answer?.info.error)throw new Error('OpenCode could not complete this model run. Check the provider balance and model configuration.');
    const text=answer?.parts.filter(part=>part.type==='text').map(part=>part.type==='text'?part.text:'').join('\n')??'';
    finishFounderRun(grant.run.hasMemo(),text,emit);
  }finally{grant.release();server?.close();}
}
