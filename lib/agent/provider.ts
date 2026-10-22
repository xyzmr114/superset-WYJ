import {createOpenAICompatible} from '@ai-sdk/openai-compatible';
import {createAnthropic} from '@ai-sdk/anthropic';
import {createGoogleGenerativeAI} from '@ai-sdk/google';
import {catalog,adapterFor,credentialFor,endpointFor} from './catalog';
export function resolveModel(providerId:string,modelId:string){
 const provider=catalog[providerId];
 if(!provider||!provider.models[modelId]?.tool_call)throw new Error('Choose a tool-capable model from the catalog.');
 const adapter=adapterFor(provider);if(!adapter)throw new Error('This provider needs an additional adapter.');
 const apiKey=credentialFor(provider);if(!apiKey)throw new Error(`Set ${provider.env.join(' or ')} in .env.local, then restart the app.`);
 if(adapter==='anthropic')return createAnthropic({apiKey})(modelId);
 if(adapter==='google')return createGoogleGenerativeAI({apiKey})(modelId);
 const baseURL=endpointFor(provider);if(!baseURL||!baseURL.startsWith('https://'))throw new Error('Provider endpoint is not configured.');
 return createOpenAICompatible({name:provider.id,apiKey,baseURL}).chatModel(modelId);
}
