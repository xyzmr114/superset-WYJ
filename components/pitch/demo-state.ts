import type {PitchView} from '@/lib/contracts';
export const DEMO_MARKDOWN = `# Developer Workflow Discovery — Joint Pitch

> Example working draft.

## Problem hypothesis
Small developer teams may lose time transferring context between customer reports and engineering work. This needs customer validation.

## Proposed product
A focused assistant that helps a team turn one recurring customer workflow into a clear engineering handoff.

## Target customer
Small developer-tool companies. The first buyer and budget are not yet validated.

## Team complementarity
Builder brings backend engineering; Signal brings product and sales experience.

## Public evidence
Add a source and explain what it supports. Customer demand is still untested.

## First 48-hour experiment
Interview five prospective users. Ask for a recent example, the current workaround, frequency, and cost. Continue only if a repeated problem emerges.

## Why explore this with super{set}?
Our hypothesis is that a specific workflow problem and complementary founding team fit its company-building approach.
Reference: https://superset.com/portfolio

## Open questions
- Who experiences this problem often enough to pay?
- What do existing tools already solve?
- What commitment can each founder make?
`;
export function initialDemo():PitchView {return {id:'demo-pitch',matchId:'demo-match',version:1,markdown:DEMO_MARKDOWN,proposedIdentityFields:{},myApproval:false,bothApproved:false,exportable:false};}
export type DemoAction={type:'save';markdown:string}|{type:'approve'}|{type:'partner'}|{type:'reset'};
export function demoReducer(state:PitchView,action:DemoAction):PitchView {
 switch(action.type){
 case 'reset':return initialDemo();
 case 'save':return {...state,markdown:action.markdown,version:state.version+1,myApproval:false,bothApproved:false,exportable:false};
 case 'approve':return {...state,myApproval:true};
 case 'partner':return state.myApproval?{...state,bothApproved:true,exportable:true}:state;
 }
}
