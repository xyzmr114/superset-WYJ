import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hasPartnerFit} from './index';
import type {MatchingCard} from '@/lib/contracts';
const a:MatchingCard={id:'a',eventId:'test',alias:'A',offers:['engineering'],seeks:['sales','communication'],interests:['travel'],availability:'weekends',approvedBlurb:'Booking tools',version:1};
test('shared interests alone do not satisfy requested partner skills',()=>{assert.equal(hasPartnerFit(a,{...a,id:'b'}),false);assert.equal(hasPartnerFit(a,{...a,id:'b',offers:['sales']}),true);});
test('an explicitly requested soft strength counts toward partner fit',()=>{assert.equal(hasPartnerFit(a,{...a,id:'b',preferences:{techStack:[],strengths:['communication'],partnerStrengths:[],workStyles:[]}}),true);});
