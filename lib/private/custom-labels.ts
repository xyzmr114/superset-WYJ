import {identifyingDetails} from './brief';
export type CustomLabels={offers:string[];interests:string[]};
export function safeCustomLabel(value:string):boolean{
 return value.length>=2&&value.length<=40&&value.split(/\s+/).length<=5&&/^[\p{L}\p{N}][\p{L}\p{N} #+&/'()-]*$/u.test(value)&&!identifyingDetails(value);
}
/** Only explicit short skill/niche phrases become candidates; Laya still has to approve each one. */
export function customLabelCandidates(text:string):CustomLabels{
 text=text.replace(/[^\s,;]*@[^\s,;]+|https?:\/\/[^\s,;]+/gi,'');
 const result:CustomLabels={offers:[],interests:[]};
 const patterns={offers:/(?:\bskills?\s*:|\b(?:speciali[sz]e|speciali[sz]ing|experience|expertise)\s+in\s+)([^.\n;!?]+)/gi,interests:/(?:\b(?:niche|interests?|topics?|domain|industry)\s*(?::|is\b|in\b)\s*)([^.\n;!?]+)/gi};
 for(const field of ['offers','interests'] as const){
  for(const match of text.matchAll(patterns[field]))for(const phrase of match[1].split(/,|\s+and\s+/i)){
   const label=phrase.trim();
   if(safeCustomLabel(label)&&!result[field].some(v=>v.toLowerCase()===label.toLowerCase()))result[field].push(label);
  }
  result[field]=result[field].slice(0,4);
 }
 return result;
}
