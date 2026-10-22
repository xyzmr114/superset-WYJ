import {z} from 'zod';
import {browserActionSchema} from '@/lib/browser/contracts';

export const CHAT_KEY='wyj-conversation-v1';
export const DRAFT_KEY='wyj-working-draft-v1';
const message=z.object({role:z.enum(['user','assistant']),content:z.string().max(30000)});
export const conversationSchema=z.object({
  messages:z.array(message).max(100),
  input:z.string().max(8000),
  memo:z.string().max(100000),
  actions:z.array(browserActionSchema).max(30).default([]),
  sources:z.array(z.object({title:z.string(),url:z.string().url()})).max(50),
});
export type Conversation=z.infer<typeof conversationSchema>;
export const emptyConversation:Conversation={messages:[],input:'',memo:'',sources:[],actions:[]};
const draftSchema=z.object({markdown:z.string().max(100000),revision:z.number().int().positive(),savedAt:z.string(),sourceMarkdown:z.string().max(100000).optional()});
export type WorkingDraft=z.infer<typeof draftSchema>;
type TabStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;

export function restoreConversation(storage:TabStorage):Conversation {
  try {return conversationSchema.parse(JSON.parse(storage.getItem(CHAT_KEY)??'null'));}
  catch {return {...emptyConversation};}
}
export function restoreWorkingDraft(storage:TabStorage):WorkingDraft|null {
  try {return draftSchema.parse(JSON.parse(storage.getItem(DRAFT_KEY)??'null'));}
  catch {return null;}
}
export function saveWorkingDraft(storage:TabStorage,markdown:string):WorkingDraft {
  const previous=restoreWorkingDraft(storage);
  const draft={sourceMarkdown:previous?.sourceMarkdown,markdown,revision:previous?previous.revision+Number(previous.markdown!==markdown):1,savedAt:new Date().toISOString()};
  storage.setItem(DRAFT_KEY,JSON.stringify(draft));
  return draft;
}

// Reopening the same generated memo must preserve edits already made in the editor.
export function openWorkingDraft(storage:TabStorage,markdown:string):WorkingDraft {
  const previous=restoreWorkingDraft(storage);
  if(previous?.sourceMarkdown===markdown)return previous;
  const draft={markdown,sourceMarkdown:markdown,revision:1,savedAt:new Date().toISOString()};
  storage.setItem(DRAFT_KEY,JSON.stringify(draft));
  return draft;
}
