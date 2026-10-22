import test from 'node:test';
import assert from 'node:assert/strict';
import {customLabelCandidates} from './custom-labels';
import {sanitizeClassification} from './classifier-contract';
import {withLocalSuggestions} from './profile-draft';
import {classifyInBrowser,stopBrowserClassifier} from './browser-classifier';

test('custom skill and niche phrases become bounded local candidates',()=>{
 assert.deepEqual(customLabelCandidates('Skills: horse training, stable operations. Niche: equestrian matchmaking.'),{offers:['horse training','stable operations'],interests:['equestrian matchmaking']});
 assert.deepEqual(customLabelCandidates('I specialize in robotics. My niche is warehouse automation.'),{offers:['robotics'],interests:['warehouse automation']});
});
test('custom candidates reject contacts, URLs and private paragraphs',()=>{
 const candidates=customLabelCandidates('Skills: person@example.com, https://example.com, Python. Niche: '+ 'private '.repeat(20));
 assert.deepEqual(candidates,{offers:['Python'],interests:[]});
 assert.deepEqual(customLabelCandidates('I need to leave my employer quietly and have six months of runway.'),{offers:[],interests:[]});
});
test('only source-backed custom labels survive classification and populate the brief',()=>{
 const candidates=customLabelCandidates('Skills: horse training. Niche: equestrian matchmaking.');
 const result=sanitizeClassification({status:'needs_review',suggested:{offers:['horse training','invented label'],interests:['equestrian matchmaking','PRIVATE-CANARY']}},candidates);
 assert.deepEqual(result.suggested.offers,['horse training']);assert.deepEqual(result.suggested.interests,['equestrian matchmaking']);
 const brief=withLocalSuggestions({alias:'Founder',offers:[],seeks:[],interests:[],availability:'weekends',approvedBlurb:'A reviewed idea.'},result);
 assert.deepEqual(brief.offers,['horse training']);assert.deepEqual(brief.interests,['equestrian matchmaking']);assert.equal(brief.approvedBlurb,'A reviewed idea.');
});

test('browser worker results retain custom labels from this request only',async()=>{
 const g=globalThis as any,w=g.window,W=g.Worker;
 class WorkerDouble{onmessage:any;onerror:any;terminate(){}postMessage(){queueMicrotask(()=>this.onmessage({data:{type:'result',result:{status:'needs_review',suggested:{offers:['horse training','invented skill'],interests:['equestrian matchmaking','invented niche']}}}}));}}
 g.window={};g.Worker=WorkerDouble;
 try{const result=await classifyInBrowser('Skills: horse training. Niche: equestrian matchmaking.','');assert.deepEqual(result.suggested.offers,['horse training']);assert.deepEqual(result.suggested.interests,['equestrian matchmaking']);}finally{stopBrowserClassifier();if(w===undefined)delete g.window;else g.window=w;if(W===undefined)delete g.Worker;else g.Worker=W;}
});
