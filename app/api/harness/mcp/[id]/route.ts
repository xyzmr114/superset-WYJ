import {authorizeHarnessRun,listHarnessTools,callHarnessTool} from '@/lib/harness/bridge';
import {isLoopback} from '@/lib/browser/contracts';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!isLoopback(new URL(request.url).hostname))return new Response(null,{status:403});
  const grant=authorizeHarnessRun(id,request.headers.get('authorization'));
  if(!grant)return new Response(null,{status:401});
  const raw=await request.text();if(raw.length>40000)return new Response(null,{status:413});
  let message;try{message=JSON.parse(raw);}catch{return new Response(null,{status:400});}
  if(!message||typeof message.method!=='string')return new Response(null,{status:400});
  if(message.id===undefined)return new Response(null,{status:202});
  const reply=(result:unknown)=>Response.json({jsonrpc:'2.0',id:message.id,result},{headers:{'Cache-Control':'no-store'}});
  if(message.method==='initialize')return reply({protocolVersion:message.params?.protocolVersion??'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'wyj-founder-tools',version:'1.0.0'}});
  if(message.method==='ping')return reply({});
  if(message.method==='tools/list')return reply({tools:listHarnessTools(grant.run)});
  if(message.method==='tools/call'){
    try {const result=await callHarnessTool(grant,message.params?.name,message.params?.arguments??{});return reply({content:[{type:'text',text:JSON.stringify(result)}]});}
    catch(error){return reply({isError:true,content:[{type:'text',text:error instanceof Error?error.message:'Tool failed.'}]});}
  }
  return Response.json({jsonrpc:'2.0',id:message.id,error:{code:-32601,message:'Method not found.'}});
}
export function GET(){return new Response(null,{status:405});}
export function DELETE(){return new Response(null,{status:204});}
