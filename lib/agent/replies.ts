import {createHash} from 'node:crypto';
import {profileKey} from './prospects';
export type VisibleMessage={body:string;senderUrl?:string;eventId?:string;time?:string};
export type ConversationMessage={id:string;body:string;direction:'incoming'|'outgoing'|'unknown'};
// Sender identity comes from the message group's profile link, never a guessed display name.
export function classifyMessages(target:string,rows:VisibleMessage[]):ConversationMessage[]{
  return rows.map(row=>{
    let direction:ConversationMessage['direction']='unknown';
    if(row.senderUrl)try{const url=new URL(row.senderUrl);if(['linkedin.com','www.linkedin.com'].includes(url.hostname)&&url.pathname.startsWith('/in/'))direction=profileKey(row.senderUrl)===profileKey(target)?'incoming':'outgoing';}catch{}
    return {id:createHash('sha256').update(JSON.stringify([profileKey(target),row.eventId||[row.senderUrl??'',row.time??''],row.body])).digest('hex'),body:row.body,direction};
  });
}
