import {identifyingDetails} from './brief';
export const LOCAL_IDEA_MODEL = 'Bonsai 1.7B · on-device';
export type LocalIdeaImprovement = { text: string; model: string };
export type LocalIdeaProgress = (message: string) => void;
let worker: Worker | null = null;
let nextId = 1;
const tasks = new Map<number, { resolve:(value:unknown)=>void; reject:(reason:Error)=>void; progress?:LocalIdeaProgress; cleanup:()=>void }>();

/** Releases GPU memory and rejects pending work. Does not send anything to a server. */
export function stopLocalIdeaAgent(message='Local idea assistance stopped. Your idea stayed on this device.'): void {
  worker?.terminate(); worker=null;
  for (const task of tasks.values()) { task.cleanup(); task.reject(new Error(message)); }
  tasks.clear();
}

export function validateLocalIdea(idea:string):string {
  const text=idea.trim();
  if(text.length<8) throw new Error('Write a little more about your idea first.');
  if(text.length>4000) throw new Error('Keep the idea under 4,000 characters for this browser model.');
  return text;
}

function request(type:'warm'|'generate'|'name', idea:string|undefined, onProgress?:LocalIdeaProgress, signal?:AbortSignal):Promise<unknown> {
  if(typeof window==='undefined' || typeof Worker==='undefined') return Promise.reject(new Error('Local idea assistance runs only in your browser.'));
  if(signal?.aborted) return Promise.reject(new Error('Local idea assistance stopped.'));
  return new Promise((resolve,reject)=>{
    const id=nextId++;
    const cancel=()=>stopLocalIdeaAgent();
    const timeout=setTimeout(()=>stopLocalIdeaAgent('Local model loading or generation timed out. Retry when your connection and GPU are available. Your idea stayed on this device.'),180000);
    const cleanup=()=>{clearTimeout(timeout);signal?.removeEventListener('abort',cancel);};
    tasks.set(id,{resolve,reject,progress:onProgress,cleanup});
    signal?.addEventListener('abort',cancel,{once:true});
    try {
      if(!worker){
        worker=new Worker('/bonsai-runtime/worker.mjs',{type:'module',name:'wyj-local-idea-agent'});
        worker.onmessage=({data}:MessageEvent)=>{
          const task=tasks.get(data?.id); if(!task)return;
          if(data.type==='progress'&&typeof data.message==='string'){task.progress?.(data.message);return;}
          if(data.type==='ready'||data.type==='result'){task.cleanup();tasks.delete(data.id);task.resolve(data.type==='ready'?undefined:{text:String(data.text??''),model:LOCAL_IDEA_MODEL});}
          if(data.type==='error'){task.cleanup();tasks.delete(data.id);task.reject(new Error(data.code==='NO_WEBGPU'?'This browser does not expose WebGPU. Try recent Chrome or Edge for local idea assistance.':data.code==='ASSET_BLOCKED'?'Model downloads are blocked by the hosting service. Its storage or transfer allowance needs restoring. Your idea stayed on this device.':data.code==='ASSET_UNAVAILABLE'?'The model download is unavailable. Retry later; your idea stayed on this device.':'The local idea model could not run. Your idea was not sent to a server.'));}
        };
        worker.onerror=()=>{stopLocalIdeaAgent();};
      }
      // Warmup carries no input. Generation passes only this explicitly selected idea.
      worker.postMessage(type==='warm'?{id,type}:{id,type,idea});
    } catch { const task=tasks.get(id);task?.cleanup();tasks.delete(id);reject(new Error('The local idea model could not start.')); }
  });
}

/** Begin public model loading while the user fills the form. Never receives private text. */
export async function warmLocalIdeaAgent(onProgress?:LocalIdeaProgress,signal?:AbortSignal):Promise<void> {
  await request('warm',undefined,onProgress,signal);
}

/** Free local generation. The returned draft is never automatically published or applied. */
export async function improveIdeaLocally(idea:string,onProgress?:LocalIdeaProgress,signal?:AbortSignal):Promise<LocalIdeaImprovement> {
  return await request('generate',validateLocalIdea(idea),onProgress,signal) as LocalIdeaImprovement;
}

/** Playful project alias from the idea only, generated on this device. */
export async function nameProjectLocally(idea:string,onProgress?:LocalIdeaProgress,signal?:AbortSignal):Promise<LocalIdeaImprovement>{
 const result=await request('name',validateLocalIdea(idea),onProgress,signal) as LocalIdeaImprovement;
 if(identifyingDetails(result.text)||!/^[\p{L}\p{N}][\p{L}\p{N} '’!&-]{1,39}$/u.test(result.text)||result.text.split(/\s+/).length>4)throw new Error('That name did not quite land. Give it another spin.');
 return result;
}
