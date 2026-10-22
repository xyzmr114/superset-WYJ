import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicPageUrl,fileInput} from './web';
test('public page fetch excludes private destinations and URL credentials',()=>{
  assert.equal(publicPageUrl.safeParse('https://superset.com/approach').success,true);
  for(const url of ['http://127.0.0.1/api','http://2130706433/api','http://localhost/admin','https://service.local/key','https://user:password@example.com/','file:///etc/passwd'])assert.equal(publicPageUrl.safeParse(url).success,false,url);
});
test('GitHub file tools accept source paths, not traversal',()=>{
  assert.equal(fileInput.safeParse({owner:'anomalyco',repo:'opentui',path:'packages/react/README.md'}).success,true);
  assert.equal(fileInput.safeParse({owner:'anomalyco',repo:'opentui',path:'../.env.local'}).success,false);
});

test('repository reading attributes a public-page fallback when GitHub API is rate limited',async()=>{
 const {readRepository}=await import('./web');const oldFetch=globalThis.fetch,oldKey=process.env.DEEPSEEK_API_KEY;process.env.DEEPSEEK_API_KEY='unit-test';let requested='';
 globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{const url=String(input);if(url.startsWith('https://api.github.com/'))return new Response(null,{status:403});assert.equal(url,'https://api.deepseek.com/v1/tools/fetch');requested=JSON.parse(String(init?.body)).url;return Response.json({title:'Repository',content:'Public README content.'});}) as typeof fetch;
 try{const result=await readRepository({owner:'example',repo:'public-project'},AbortSignal.timeout(1000));assert.equal(requested,'https://github.com/example/public-project');assert.equal(result.readme,'Public README content.');assert.equal('metadataAvailable' in result&&result.metadataAvailable,false);assert.equal('stars' in result,false);}finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.DEEPSEEK_API_KEY;else process.env.DEEPSEEK_API_KEY=oldKey;}
});
