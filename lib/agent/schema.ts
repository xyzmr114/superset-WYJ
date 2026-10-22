import {z} from 'zod';
export const agentInput=z.object({
 provider:z.string().max(80),model:z.string().max(180),
 messages:z.array(z.object({role:z.enum(['user','assistant']),content:z.string().min(1).max(12000)}).strict()).min(1).max(24),
 card:z.object({alias:z.string().max(40),offers:z.array(z.string().max(40)).max(8),seeks:z.array(z.string().max(40)).max(8),interests:z.array(z.string().max(60)).max(8),availability:z.enum(['exploring','weekends','full_time']),approvedBlurb:z.string().max(500)}).strict().optional()
}).strict();
export type AgentInput=z.infer<typeof agentInput>;
export type AgentEvent={type:'progress';message:string}|{type:'sources';sources:{title:string;url:string}[]}|{type:'memo';markdown:string}|{type:'answer';text:string}|{type:'error';message:string}|{type:'done'};
export const memoInput=z.object({title:z.string().min(1).max(150),problem:z.string().max(2000),customer:z.string().max(1000),solution:z.string().max(2000),team:z.string().max(1500),whyNow:z.string().max(1500),experiment:z.string().max(2000),unknowns:z.array(z.string().max(500)).max(8)}).strict();
export function renderMemo(input:z.infer<typeof memoInput>,sources:{title:string;url:string}[]){return `# ${input.title}

## Problem hypothesis
${input.problem}

## Proposed customer and buyer
${input.customer}

## First product
${input.solution}

## Team
${input.team}

## Timing hypothesis
${input.whyNow}

## First experiment
${input.experiment}

## Open questions
${input.unknowns.map(x=>'- '+x).join('\n')}

## Sources
${sources.length?sources.map(s=>`- ${s.title}: ${s.url}`).join('\n'):'No public sources retrieved in this run.'}`;}
