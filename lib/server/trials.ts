import {z} from 'zod';
import type {TrialPlan,TrialView} from '@/lib/contracts';
import {HttpError} from './http';
import {getMyMatch} from './matches';
import {mutuallyApproved} from './intro-consent';
import {q} from './store';

const text=z.string().trim().min(1).max(500);
export const trialPlanSchema=z.object({goal:text,deliverable:text,myContribution:text,theirContribution:text,deadline:z.string().refine(value=>Number.isFinite(Date.parse(value)),'Choose a deadline.')}).strict();
export const trialAction=z.discriminatedUnion('action',[
 z.object({action:z.literal('propose'),plan:trialPlanSchema,version:z.number().int().nonnegative().optional()}).strict(),
 z.object({action:z.literal('approve'),version:z.number().int().positive()}).strict(),
 z.object({action:z.literal('feedback'),version:z.number().int().positive(),decision:z.enum(['continue','pass'])}).strict(),
]);
type SavedTrial={version:number;goal:string;deliverable:string;a_contribution:string;b_contribution:string;deadline:string|Date;a_approved:boolean;b_approved:boolean;a_feedback:'continue'|'pass'|null;b_feedback:'continue'|'pass'|null};
type Action=z.infer<typeof trialAction>;
async function authorized(matchId:string,me:string){const match=await getMyMatch(matchId,me);if(!mutuallyApproved(match))throw new HttpError(409,'INTRO_REQUIRED','Both founders must approve their introduction first.');return match;}
const readTrial=async(matchId:string):Promise<SavedTrial|undefined>=>(await q('select * from trials where match_id=$1',[matchId]))[0];
function view(trial:SavedTrial,side:'a'|'b'):TrialView{
 const other=side==='a'?'b':'a';
 const bothWantContinue=trial.a_feedback==='continue'&&trial.b_feedback==='continue';
 return {version:trial.version,plan:{goal:trial.goal,deliverable:trial.deliverable,myContribution:trial[`${side}_contribution`],theirContribution:trial[`${other}_contribution`],deadline:new Date(trial.deadline).toISOString()},myApproval:trial[`${side}_approved`],theirApproval:trial[`${other}_approved`],status:bothWantContinue?'complete':trial.a_approved&&trial.b_approved?'active':'proposed',...(trial[`${side}_feedback`]?{myFeedback:trial[`${side}_feedback`]!}:{}),bothWantContinue};
}
function validate(trial:SavedTrial|undefined,side:'a'|'b',input:Action){
 if(input.action==='propose'){
  if(trial?.a_approved&&trial.b_approved)throw new HttpError(409,'TRIAL_ACTIVE','Both founders approved this version. Its plan is now fixed.');
  if((input.version??0)!==(trial?.version??0))throw new HttpError(409,'STALE_VERSION','The trial changed. Review the latest plan before saving.');
  if(Date.parse(input.plan.deadline)<=Date.now())throw new HttpError(400,'PAST_DEADLINE','Choose a future deadline.');
 }else{
  if(!trial)throw new HttpError(409,'NO_TRIAL','Propose a trial first.');
  if(input.version!==trial.version)throw new HttpError(409,'STALE_VERSION','The trial changed. Review the latest plan first.');
  if(input.action==='approve'){
   if(new Date(trial.deadline).getTime()<=Date.now()&&!trial[`${side}_approved`])throw new HttpError(409,'PAST_DEADLINE','This proposal has expired. Agree on a new deadline.');
  }else{
   if(!trial.a_approved||!trial.b_approved)throw new HttpError(409,'NOT_ACTIVE','Both founders must approve this plan before feedback.');
   if(trial[`${side}_feedback`]&&trial[`${side}_feedback`]!==input.decision)throw new HttpError(409,'FEEDBACK_FIXED','Your private decision has already been saved.');
  }
 }
}
export async function getTrial(matchId:string,me:string):Promise<TrialView|null>{
 const match=await authorized(matchId,me);const trial=await readTrial(matchId);return trial?view(trial,me===match.a?'a':'b'):null;
}
export async function changeTrial(matchId:string,me:string,input:Action):Promise<TrialView>{
 const match=await authorized(matchId,me);const side=me===match.a?'a':'b';
 const trial=await readTrial(matchId);validate(trial,side,input);
 let saved:SavedTrial|undefined;
 if(input.action==='propose'){
  const p=input.plan;const params=[matchId,(input.version??0)+1,p.goal,p.deliverable,side==='a'?p.myContribution:p.theirContribution,side==='a'?p.theirContribution:p.myContribution,new Date(p.deadline).toISOString()];
  if(!trial){
   [saved]=await q(`insert into trials (match_id,version,goal,deliverable,a_contribution,b_contribution,deadline)
    values ($1,$2,$3,$4,$5,$6,$7) on conflict do nothing returning *`,params);
  }else{
   [saved]=await q(`update trials set version=$2,goal=$3,deliverable=$4,a_contribution=$5,b_contribution=$6,deadline=$7,
    a_approved=false,b_approved=false,a_feedback=null,b_feedback=null
    where match_id=$1 and version=$2-1 and not (a_approved and b_approved) returning *`,params);
  }
 }else if(input.action==='approve'){
  [saved]=await q(`update trials set ${side}_approved=true where match_id=$1 and version=$2
   and (deadline>statement_timestamp() or ${side}_approved) returning *`,[matchId,input.version]);
 }else{
  [saved]=await q(`update trials set ${side}_feedback=$3 where match_id=$1 and version=$2 and a_approved and b_approved
   and (${side}_feedback is null or ${side}_feedback=$3) returning *`,[matchId,input.version,input.decision]);
 }
 if(!saved){
  validate(await readTrial(matchId),side,input);
  throw new HttpError(409,'STALE_VERSION','The trial changed. Review the latest plan first.');
 }
 return view(saved,side);
}
