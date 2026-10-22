import {z} from 'zod';
import {Card} from '@/lib/server/brief-schema';
import type {CardInput} from '@/lib/client/api';
export const DRAFT_KEY='wyj:matching-draft:v1';
export type LocalDraft={version:1;brief:CardInput;step:number;publishedId?:string};
const Brief=Card.omit({publishConsent:true}).extend({alias:z.string().max(40),offers:z.array(z.string().min(1).max(40)).max(5),seeks:z.array(z.string().min(1).max(40)).max(5),interests:z.array(z.string().min(1).max(40)).max(4)});
/** Only explicit matching fields; background, contact, cookies and consent are never serialized. */
export function encodeDraft(brief:CardInput,step:number,publishedId?:string):string{
 const fields={alias:brief.alias,approvedBlurb:brief.approvedBlurb,offers:brief.offers,seeks:brief.seeks,interests:brief.interests,availability:brief.availability,preferences:brief.preferences};
 return JSON.stringify({version:1,brief:fields,step,...(publishedId?{publishedId}:{})});
}
export function decodeDraft(raw:string|null):LocalDraft|null{
 try{if(!raw||raw.length>20000)return null;const value=JSON.parse(raw);if(value.version!==1)return null;
 // Drafts may be incomplete; publication schema minimums still apply at publication time.
 const parsed=Brief.partial().safeParse(value.brief);if(!parsed.success)return null;
 const b=parsed.data;
 return {version:1,brief:{alias:b.alias??'',approvedBlurb:b.approvedBlurb??'',offers:b.offers??[],seeks:b.seeks??[],interests:b.interests??[],availability:b.availability??'weekends',preferences:b.preferences??{strengths:[],partnerStrengths:[],techStack:[],workStyles:[]}},step:Math.max(0,Math.min(2,Number.isInteger(value.step)?value.step:0)),...(typeof value.publishedId==='string'&&value.publishedId.length<100?{publishedId:value.publishedId}:{})};
 }catch{return null;}
}
