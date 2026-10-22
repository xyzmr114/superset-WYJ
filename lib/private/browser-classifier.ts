import { sanitizeClassification, unavailableClassification, type LocalClassification } from './classifier-contract';

export const BROWSER_MODEL_URL = '/models/laya/';
export const BROWSER_RUNTIME_URL = '/laya-runtime/worker.mjs';
let active: Worker | null = null;
let modelReady = false;
type WarmTask={promise:Promise<boolean>;resolve:(ready:boolean)=>void;listeners:Set<(message:string)=>void>};
let warming:WarmTask|null=null;
let classification:{resolve:(result:LocalClassification)=>void;progress?:(message:string)=>void;cleanup:()=>void}|null=null;
const stopped=()=>({...unavailableClassification('not_running'),message:'Browser classification stopped. Your text was not sent to a server. You can fill in the brief yourself.'});
function finishWarm(ready:boolean){const task=warming;warming=null;task?.resolve(ready);}
function finishClassification(result:LocalClassification){const task=classification;classification=null;task?.cleanup();task?.resolve(result);}

/** Cancels every pending task and releases model memory; cached files contain only public weights. */
export function stopBrowserClassifier(): void {
 active?.terminate();active=null;modelReady=false;finishWarm(false);finishClassification(stopped());
}
function worker(){
 if(active)return active;
 const current=new Worker(BROWSER_RUNTIME_URL,{type:'module',name:'wyj-private-laya'});active=current;
 current.onmessage=({data}:MessageEvent)=>{
  if(active!==current)return;
  if(data?.type==='progress'&&typeof data.message==='string'){for(const listener of warming?.listeners??[])listener(data.message);classification?.progress?.(data.message);}
  if(data?.type==='ready'){modelReady=true;finishWarm(true);}
  if(data?.type==='result'){modelReady=true;finishWarm(true);finishClassification(sanitizeClassification(data.result));}
  if(data?.type==='error')fail();
 };
 const fail=()=>{if(active!==current)return;current.terminate();active=null;modelReady=false;finishWarm(false);finishClassification({...unavailableClassification('not_running'),message:'The browser model could not run on this device. Nothing was sent for remote inference. Fill in your brief yourself or try a shorter profile on a desktop browser.'});};
 current.onerror=fail;return current;
}

/** Downloads and initializes public model weights without accepting or posting any profile text. */
export async function warmBrowserClassifier(onProgress?:(message:string)=>void,signal?:AbortSignal):Promise<boolean>{
 if(typeof window==='undefined'||typeof Worker==='undefined'||signal?.aborted)return false;
 if(modelReady)return true;
 if(!warming){
  let resolve!:(ready:boolean)=>void;const promise=new Promise<boolean>(done=>{resolve=done;});
  warming={promise,resolve,listeners:new Set()};
  try{worker().postMessage({type:'warmup'});}catch{stopBrowserClassifier();}
 }
 const task=warming;if(!task)return false;
 return new Promise(resolve=>{
  let settled=false;
  const finish=(ready:boolean)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',cancel);if(onProgress)task.listeners.delete(onProgress);resolve(ready);};
  const cancel=()=>finish(false);
  if(onProgress)task.listeners.add(onProgress);
  signal?.addEventListener('abort',cancel,{once:true});task.promise.then(finish);
 });
}

/** No network request contains this input: text crosses only the browser's own worker boundary. */
export function browserClassifierText(profile: string, idea: string): string | null {
 if(profile.length+idea.length>12000)return null;
 return [profile.trim()&&`Profile: ${profile.trim()}`,idea.trim()&&`Idea: ${idea.trim()}`].filter(Boolean).join('\n');
}
export async function classifyInBrowser(profile:string,idea:string,onProgress?:(message:string)=>void,signal?:AbortSignal):Promise<LocalClassification>{
 if(typeof window==='undefined'||typeof Worker==='undefined')return unavailableClassification('not_browser');
 const text=browserClassifierText(profile,idea);
 if(text===null)return unavailableClassification('invalid_response');
 if(!text)return unavailableClassification('empty_input');
 if(signal?.aborted)return unavailableClassification('not_running');
 if(classification)stopBrowserClassifier();
 return new Promise(resolve=>{
  const cancel=()=>stopBrowserClassifier();
  const task={resolve,progress:onProgress,cleanup:()=>signal?.removeEventListener('abort',cancel)};
  classification=task;signal?.addEventListener('abort',cancel,{once:true});
  const send=()=>{if(classification!==task)return;try{worker().postMessage({type:'classify',text});}catch{stopBrowserClassifier();}};
  // Share initialization; never replace warmup handlers or start a second model load.
  if(warming)warming.promise.then(ready=>{if(classification!==task)return;if(ready)send();else finishClassification(stopped());});else send();
 });
}
