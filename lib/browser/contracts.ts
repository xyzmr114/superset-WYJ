import {z} from 'zod';
export const linkedinProfile=z.string().url().refine(value=>{
  const url=new URL(value);
  return url.protocol==='https:'&&['linkedin.com','www.linkedin.com'].includes(url.hostname)&&/^\/in\/[^/]+\/?$/.test(url.pathname)&&!url.username&&!url.password;
},'Use a LinkedIn profile URL, such as https://www.linkedin.com/in/name/.');
export const browserActionSchema=z.discriminatedUnion('kind',[
  z.object({kind:z.literal('linkedin_post'),id:z.string().uuid(),title:z.string().max(150),body:z.string().min(1).max(3000)}).strict(),
  z.object({kind:z.literal('linkedin_connection'),id:z.string().uuid(),title:z.string().max(150),body:z.string().min(1).max(200),profileUrl:linkedinProfile}).strict(),
  z.object({kind:z.literal('linkedin_message'),id:z.string().uuid(),title:z.string().max(150),body:z.string().min(1).max(3000),profileUrl:linkedinProfile}).strict(),
]);
export type BrowserAction=z.infer<typeof browserActionSchema>;
export type BrowserReceipt={id:string;status:'prepared'|'submitted'|'unknown';message:string;url?:string};
export type BrowserStatus={available:boolean;connected:boolean;signedIn:boolean;url?:string;message:string};
export const browserCommandSchema=z.discriminatedUnion('command',[
  z.object({command:z.literal('read_conversation'),profileUrl:linkedinProfile}).strict(),
  z.object({command:z.literal('connect')}).strict(),
  z.object({command:z.literal('disconnect')}).strict(),
  z.object({command:z.literal('prepare'),action:browserActionSchema}).strict(),
  z.object({command:z.literal('submit'),action:browserActionSchema}).strict(),
]);
export function isLoopback(hostname:string){return ['localhost','127.0.0.1','[::1]','::1'].includes(hostname);}

export function browserErrorMessage(error:unknown){
  if(!(error instanceof Error))return 'The browser action failed. Check the connected browser and try again.';
  if(error.name==='TimeoutError'||/locator\.|Timeout.*exceeded/i.test(error.message))return 'LinkedIn’s page or composer was not ready for this action. Check the connected browser, then try again.';
  return error.message;
}
