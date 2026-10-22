import {test} from 'node:test';
import assert from 'node:assert/strict';
import {linkedinProfile,browserCommandSchema,isLoopback} from './contracts';

test('LinkedIn tools accept only real HTTPS profile paths',()=>{
  assert.equal(linkedinProfile.safeParse('https://www.linkedin.com/in/hostel-operator/').success,true);
  for(const url of ['https://linkedin.com.evil.test/in/person','https://www.linkedin.com@evil.test/in/person','http://linkedin.com/in/person','https://www.linkedin.com/messaging/','javascript:alert(1)'])assert.equal(linkedinProfile.safeParse(url).success,false,url);
});
test('browser commands cannot carry arbitrary navigation, credentials, or scripts',()=>{
  assert.equal(browserCommandSchema.safeParse({command:'connect',cookies:'secret'}).success,false);
  assert.equal(browserCommandSchema.safeParse({command:'evaluate',script:'fetch secret'}).success,false);
  assert.equal(browserCommandSchema.safeParse({command:'submit',action:{id:crypto.randomUUID(),kind:'linkedin_post',title:'A test',body:'A reviewed draft'}}).success,true);
  assert.equal(isLoopback('localhost'),true);assert.equal(isLoopback('wyj.example'),false);
});
