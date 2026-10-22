import {z} from 'zod';
import type {BrowserAction} from '@/lib/browser/contracts';
export const agentInput=z.object({
 provider:z.string().max(80),model:z.string().max(180),
 action:z.enum(['chat','draft_memo','outreach','social_post']).optional(),
 messages:z.array(z.object({role:z.enum(['user','assistant']),content:z.string().min(1).max(12000)}).strict()).min(1).max(24),
 card:z.object({alias:z.string().max(40),offers:z.array(z.string().max(40)).max(8),seeks:z.array(z.string().max(40)).max(8),interests:z.array(z.string().max(60)).max(8),availability:z.enum(['exploring','weekends','full_time']),approvedBlurb:z.string().max(500)}).strict().optional()
}).strict();
export type AgentInput=z.infer<typeof agentInput>;
export type AgentEvent={type:'progress';message:string}|{type:'sources';sources:{title:string;url:string}[]}|{type:'memo';markdown:string}|{type:'answer';text:string}|{type:'error';message:string}|{type:'action';action:BrowserAction}|{type:'done'};
export const memoInput=z.object({title:z.string().min(1).max(150),problem:z.string().max(2000),customer:z.string().max(1000),solution:z.string().max(2000),team:z.string().max(1500),whyNow:z.string().max(1500),experiment:z.string().max(2000).describe('One experiment runnable within 48 hours unless the user requests another timeline. Include who to reach, what to test, and a measurable signal to continue learning; a threshold does not prove the business is validated.'),teammate:z.string().min(1).max(1500).describe('One complementary role, the responsibility they would own, and a small task to try together. Do not invent a real person or credentials.'),jumpTest:z.string().min(1).max(1500),unknowns:z.array(z.string().max(500)).max(8)}).strict();
export function renderMemo(input:z.infer<typeof memoInput>,sources:{title:string;url:string}[]){return `# ${input.title}

## Problem hypothesis
${input.problem}

## Proposed customer and buyer
${input.customer}

## First product
${input.solution}

## Team
${input.team}

${input.teammate?'## Who to build with\n'+input.teammate+'\n\n':''}## Timing hypothesis
${input.whyNow}

## First experiment
${input.experiment}

${input.jumpTest?'## Before making the jump\n'+input.jumpTest+'\n\n':''}## Open questions
${input.unknowns.map(x=>'- '+x).join('\n')}

## Sources
${sources.length?sources.map(s=>`- ${s.title}: ${s.url}`).join('\n'):'No public sources retrieved in this run.'}`;}
