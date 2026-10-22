import snapshot from './catalog.snapshot.json';
export type CatalogModel={id:string;name:string;tool_call:boolean;limit?:{context?:number;output?:number};cost?:{input?:number;output?:number}};
export type CatalogProvider={id:string;name:string;npm?:string;api?:string;env:string[];models:Record<string,CatalogModel>};
export const catalog=snapshot as unknown as Record<string,CatalogProvider>;
const compatibleEndpoints:Record<string,string>={groq:'https://api.groq.com/openai/v1',xai:'https://api.x.ai/v1',mistral:'https://api.mistral.ai/v1',togetherai:'https://api.together.xyz/v1',cerebras:'https://api.cerebras.ai/v1'};
export function adapterFor(p:CatalogProvider):'anthropic'|'google'|'compatible'|null {
 if(p.id==='anthropic')return 'anthropic';
 if(p.id==='google')return 'google';
 if(p.npm==='@ai-sdk/openai-compatible'||p.id==='openrouter'||compatibleEndpoints[p.id])return 'compatible';
 return null;
}
export function endpointFor(p:CatalogProvider){return compatibleEndpoints[p.id]??p.api;}
export function credentialFor(p:CatalogProvider){return p.env?.map(name=>process.env[name]).find(Boolean);}
export function modelCatalog(){return Object.values(catalog).map(p=>({id:p.id,name:p.name,supported:!!adapterFor(p),configured:!!adapterFor(p)&&!!credentialFor(p),credentialNames:p.env,models:Object.values(p.models).map(m=>({id:m.id,name:m.name,context:m.limit?.context,inputCost:m.cost?.input,outputCost:m.cost?.output}))})).sort((a,b)=>Number(b.configured)-Number(a.configured)||a.name.localeCompare(b.name));}
