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

test('connection notes carry an explicit profile and fit the free-account note limit',()=>{
  const action={id:crypto.randomUUID(),kind:'linkedin_connection',profileUrl:'https://www.linkedin.com/in/example/',title:'Connect',body:'Hi! Could we connect to talk about the group booking workflow?'};
  assert.equal(browserCommandSchema.safeParse({command:'prepare',action}).success,true);
  assert.equal(browserCommandSchema.safeParse({command:'prepare',action:{...action,body:'x'.repeat(201)}}).success,false);
});
