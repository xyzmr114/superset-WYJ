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
