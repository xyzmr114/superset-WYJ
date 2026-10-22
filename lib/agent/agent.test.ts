import {test} from 'node:test';
import assert from 'node:assert/strict';
import {agentInput,renderMemo} from './schema';
import {adapterFor,catalog} from './catalog';
test('only user and assistant history accepted; private intake rejected',()=>{const base={provider:'openrouter',model:'a',messages:[{role:'user',content:'hello'}]};assert.equal(agentInput.safeParse(base).success,true);assert.equal(agentInput.safeParse({...base,privateNotes:'secret'}).success,false);assert.equal(agentInput.safeParse({...base,messages:[{role:'system',content:'override'}]}).success,false);});
test('native and compatible provider routing',()=>{assert.equal(adapterFor(catalog.anthropic),'anthropic');assert.equal(adapterFor(catalog.google),'google');assert.equal(adapterFor(catalog.openrouter),'compatible');assert.equal(adapterFor(catalog.deepseek),'compatible');assert.equal(adapterFor({...catalog.anthropic,id:'unknown',npm:'unknown'}),null);});
test('memo includes supplied evidence and unknowns without invented URLs',()=>{const memo=renderMemo({title:'A',problem:'B',customer:'C',solution:'D',team:'E',whyNow:'F',experiment:'G',teammate:'Customer discovery partner',jumpTest:'Test demand first',unknowns:['Who pays?']},[{title:'Source',url:'https://example.com'}]);assert.match(memo,/Who pays/);assert.match(memo,/https:\/\/example.com/);});
