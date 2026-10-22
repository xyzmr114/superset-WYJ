// Only fixed same-origin model/runtime GETs leave this worker. Profile text is never fetched or logged.
const scope = globalThis;
scope.window = scope; // upstream Agent.load selects its browser provider using window presence.
let agent;
let loading;
const progress = (message) => scope.postMessage({type:'progress',message});
const modelBase = new URL('/models/laya/',scope.location.origin).href;
const originalFetch=scope.fetch.bind(scope);
scope.fetch=async(input,options)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,scope.location.href);
  if(url.origin!==scope.location.origin || url.search || url.hash || options?.body || !(['/models/laya/encoder.onnx','/models/laya/encoder.onnx.data','/models/laya/head.onnx','/models/laya/head.onnx.data','/models/laya/tokenizer.json','/models/laya/tokenizer/tokenizer.json','/models/laya/rl_agent_config.json'].includes(url.pathname) || ['/laya-runtime/ort-wasm-simd-threaded.jsep.wasm','/laya-runtime/ort-wasm-simd-threaded.jsep.mjs','/laya-runtime/ort-wasm-simd-threaded.asyncify.wasm','/laya-runtime/ort-wasm-simd-threaded.asyncify.mjs'].includes(url.pathname)) || (options?.method && options.method!=='GET')) throw new Error(`Blocked runtime asset: ${url.origin === scope.location.origin ? url.pathname.slice(0,100) : 'foreign origin'}`);
  const response=await originalFetch(input,{...options,credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok || !response.body) return response;
  const file=url.pathname.split('/').at(-1);
  if(!file.endsWith('.onnx')) return response;
  const total=Number(response.headers.get('content-length')||0);
  const reader=response.body.getReader();let done=0,last=-1;
  return new Response(new ReadableStream({async pull(controller){const part=await reader.read();if(part.done){controller.close();return;}done+=part.value.byteLength; const pct=total?Math.floor(done/total*100):0;if(pct!==last){last=pct;progress(`Downloading ${file}: ${Math.round(done/1048576)} MB${total?` / ${Math.round(total/1048576)} MB`:''}`);}controller.enqueue(part.value);},cancel(reason){return reader.cancel(reason);}}),{status:response.status,statusText:response.statusText,headers:response.headers});
};
const skills={engineering:'software engineering or writing code',sales:'sales, business development or go-to-market',product:'product management, product strategy or customer research',design:'product, UX or visual design',data:'data science, machine learning or analytics'};
const interests={'developer-tools':'tools for software developers or engineering workflows',payments:'payments, billing or fintech',healthcare:'healthcare, clinics or medical work',climate:'climate, energy or sustainability',travel:'travel, trips or booking','ai-agents':'AI agents or infrastructure for agents'};
const questions=Object.fromEntries([...Object.entries(skills).map(([label,description])=>[`offers:${label}`,{type:'noul',instructions:`The person says they themselves have experience in ${description}.`}]),...Object.entries(interests).map(([label,description])=>[`interests:${label}`,{type:'noul',instructions:`The person says they want to work on ${description}.`}])]);
async function ensureAgent(){
 if(agent)return agent;
 if(!loading)loading=(async()=>{
     progress('Loading the browser model. Your text stays on this device.');
     const ort=await import('/laya-runtime/ort.webgpu.bundle.min.mjs');
     ort.env.wasm.wasmPaths=new URL('/laya-runtime/',scope.location.origin).href; ort.env.wasm.numThreads=1; ort.env.wasm.proxy=false;
     const {Agent}=await import('/laya-runtime/laya.js');
     agent=await Agent.load(modelBase,{numThreads:1,onProgress:(_done,_total,file)=>progress(`Preparing ${file} on your device…`)});
     return agent;
   })().finally(()=>{loading=null;});
 return loading;
}
scope.onmessage=async({data})=>{
 if(data.type!=='classify'&&data.type!=='warmup')return;
 let phase='load';
 try{
   await ensureAgent();
   if(data.type==='warmup'){scope.postMessage({type:'ready'});return;}
   phase='inference';
   const suggested={offers:[],seeks:[],interests:[],availability:null};
   let index=0;
   // One narrow question per forward pass keeps browser memory bounded.
   for(const [key,question] of Object.entries(questions)){
     progress(`Classifying on your device: ${++index} / ${Object.keys(questions).length}`);
     const result=await agent.predict(data.text,{[key]:question});
     const answer=result.answers[key];
     if(answer?.type==='noul' && Number(answer.noul)>=0.7){const [field,label]=key.split(':');suggested[field].push(label);}
   }
   scope.postMessage({type:'result',result:{status:'needs_review',suggested}});
 }catch{agent=null;scope.postMessage({type:'error',phase});}
};
