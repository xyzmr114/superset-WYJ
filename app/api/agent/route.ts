import {agentInput,type AgentEvent} from '@/lib/agent/schema';
import {resolveModel} from '@/lib/agent/provider';
import {runAgent} from '@/lib/agent/runner';
export const runtime='nodejs';
export const maxDuration=60;
let active=0;
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Request origin does not match.'},{status:403});
 const accessCode=process.env.AGENT_ACCESS_CODE;
 if(accessCode&&request.headers.get('x-agent-access-code')!==accessCode)return Response.json({error:'Enter the room access code.'},{status:401});
 const raw=await request.text();if(raw.length>50000)return Response.json({error:'Conversation is too long. Start a new chat.'},{status:413});
 let parsed;try{parsed=agentInput.safeParse(JSON.parse(raw));}catch{return Response.json({error:'Invalid request.'},{status:400});}
 if(!parsed.success)return Response.json({error:'Check the conversation and model selection.'},{status:400});
 let model;try{model=resolveModel(parsed.data.provider,parsed.data.model);}catch(e){return Response.json({error:e instanceof Error?e.message:'Model unavailable.'},{status:503});}
 if(active>=3)return Response.json({error:'The agent is busy. Try again shortly.'},{status:429});
 active++;
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),55000);
 const signal=AbortSignal.any([request.signal,controller.signal]);
 const stream=new ReadableStream({start(output){const encoder=new TextEncoder();const emit=(event:AgentEvent)=>{if(!signal.aborted)output.enqueue(encoder.encode(JSON.stringify(event)+'\n'));};
 void runAgent(parsed.data,model,emit,signal).catch(()=>{if(!signal.aborted)emit({type:'error',message:'The model run failed. Check the selected provider, key, or quota and retry.'});}).finally(()=>{clearTimeout(timeout);active--;try{output.close();}catch{/* client disconnected */}});},cancel(){controller.abort();}});
 return new Response(stream,{headers:{'Content-Type':'application/x-ndjson','Cache-Control':'no-store','X-Accel-Buffering':'no'}});
}
