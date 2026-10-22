import {z} from 'zod';
import type {TrialPlan,TrialView} from '@/lib/contracts';
import {HttpError} from './http';
import {getMyMatch} from './matches';
import {mutuallyApproved} from './intro-consent';

const text=z.string().trim().min(1).max(500);
export const trialPlanSchema=z.object({goal:text,deliverable:text,myContribution:text,theirContribution:text,deadline:z.string().refine(value=>Number.isFinite(Date.parse(value)),'Choose a deadline.')}).strict();
export const trialAction=z.discriminatedUnion('action',[
 z.object({action:z.literal('propose'),plan:trialPlanSchema,version:z.number().int().nonnegative().optional()}).strict(),
 z.object({action:z.literal('approve'),version:z.number().int().positive()}).strict(),
 z.object({action:z.literal('feedback'),version:z.number().int().positive(),decision:z.enum(['continue','pass'])}).strict(),
]);
type SavedTrial={version:number;goal:string;deliverable:string;aContribution:string;bContribution:string;deadline:string;approvals:Set<string>;feedback:Record<string,'continue'|'pass'>};
const globalTrials=globalThis as typeof globalThis&{__wyjTrials?:Map<string,SavedTrial>};
const trials=globalTrials.__wyjTrials??=new Map<string,SavedTrial>();
function authorized(matchId:string,me:string){const match=getMyMatch(matchId,me);if(!mutuallyApproved(match))throw new HttpError(409,'INTRO_REQUIRED','Both founders must approve their introduction first.');return match;}
export function getTrial(matchId:string,me:string):TrialView|null{
 const match=authorized(matchId,me);const trial=trials.get(matchId);if(!trial)return null;
 const other=match.a===me?match.b:match.a;
 const plan:TrialPlan={goal:trial.goal,deliverable:trial.deliverable,myContribution:me===match.a?trial.aContribution:trial.bContribution,theirContribution:me===match.a?trial.bContribution:trial.aContribution,deadline:trial.deadline};
 return {version:trial.version,plan,myApproval:trial.approvals.has(me),theirApproval:trial.approvals.has(other),status:trial.feedback[me]==='continue'&&trial.feedback[other]==='continue'?'complete':trial.approvals.has(me)&&trial.approvals.has(other)?'active':'proposed',...(trial.feedback[me]?{myFeedback:trial.feedback[me]}:{}),bothWantContinue:trial.feedback[me]==='continue'&&trial.feedback[other]==='continue'};
}
export function changeTrial(matchId:string,me:string,input:z.infer<typeof trialAction>):TrialView{
 const match=authorized(matchId,me);let trial=trials.get(matchId);
 if(input.action==='propose'){
  if(trial?.approvals.has(match.a)&&trial.approvals.has(match.b))throw new HttpError(409,'TRIAL_ACTIVE','Both founders approved this version. Its plan is now fixed.');
  if((input.version??0)!==(trial?.version??0))throw new HttpError(409,'STALE_VERSION','The trial changed. Review the latest plan before saving.');
  if(Date.parse(input.plan.deadline)<=Date.now())throw new HttpError(400,'PAST_DEADLINE','Choose a future deadline.');
  const p=input.plan;trial={version:(trial?.version??0)+1,goal:p.goal,deliverable:p.deliverable,aContribution:me===match.a?p.myContribution:p.theirContribution,bContribution:me===match.a?p.theirContribution:p.myContribution,deadline:new Date(p.deadline).toISOString(),approvals:new Set(),feedback:{}};trials.set(matchId,trial);
 }else{
  if(!trial)throw new HttpError(409,'NO_TRIAL','Propose a trial first.');
  if(input.version!==trial.version)throw new HttpError(409,'STALE_VERSION','The trial changed. Review the latest plan first.');
  if(input.action==='approve'){
   if(Date.parse(trial.deadline)<=Date.now()&&!trial.approvals.has(me))throw new HttpError(409,'PAST_DEADLINE','This proposal has expired. Agree on a new deadline.');
   trial.approvals.add(me);
  }else{
   if(!trial.approvals.has(match.a)||!trial.approvals.has(match.b))throw new HttpError(409,'NOT_ACTIVE','Both founders must approve this plan before feedback.');
   if(trial.feedback[me]&&trial.feedback[me]!==input.decision)throw new HttpError(409,'FEEDBACK_FIXED','Your private decision has already been saved.');
   trial.feedback[me]=input.decision;
  }
 }
 return getTrial(matchId,me)!;
}
