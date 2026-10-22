/** @jsxImportSource @opentui/react */
import {createCliRenderer} from '@opentui/core';
import {createRoot,useKeyboard,useRenderer} from '@opentui/react';
import {useState} from 'react';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import type {AgentEvent} from '../lib/agent/schema';
import type {BrowserAction} from '../lib/browser/contracts';

const origin=process.env.WYJ_URL??'http://localhost:3002';
let cookie='';
async function browser(command:unknown){
  const response=await fetch(origin+'/api/browser/linkedin',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(command)});
  const nextCookie=response.headers.get('set-cookie');if(nextCookie)cookie=nextCookie.split(';')[0];
  const result=await response.json();if(!response.ok)throw new Error(result.error??'Browser action failed.');return result;
}
function App(){
  const renderer=useRenderer();
  const [lines,setLines]=useState<string[]>(['Bring an idea. Find your people. Put the first experiment in motion.','Commands: /connect · /post · /outreach · /memo · /prepare N · /send N · /quit']);
  const [history,setHistory]=useState<{role:'user'|'assistant';content:string}[]>([]);
  const [actions,setActions]=useState<BrowserAction[]>([]);
  const [input,setInput]=useState('');const [busy,setBusy]=useState(false);const [status,setStatus]=useState('Ready');
  const [inputKey,setInputKey]=useState(0);
  function log(text:string){setLines(old=>[...old,text]);}
  useKeyboard(key=>{if((key.ctrl&&key.name==='c')||key.name==='escape'){renderer.destroy();process.exit(0);}});
  async function send(raw:string){
    const text=raw.trim();if(!text||busy)return;
    setInput('');setInputKey(key=>key+1);setBusy(true);
    try {
      if(text==='/quit'){renderer.destroy();process.exit(0);}
      if(text==='/connect'||text==='/browser'){const result=await browser({command:'connect'});log('BROWSER: '+result.message);return;}
      if(text==='/disconnect'){await browser({command:'disconnect'});log('Browser disconnected.');return;}
      if(/^\/(prepare|send)\s+\d+$/.test(text)){
        const [,command,index]=text.split(/[\s/]+/);const action=actions[Number(index)-1];
        if(!action)throw new Error('Choose an action number shown below a draft.');
        const result=await browser({command:command==='send'?'submit':'prepare',action});log('BROWSER: '+result.message);return;
      }
      const action=text==='/memo'?'draft_memo':text==='/post'?'social_post':text==='/outreach'?'outreach':'chat';
      const content=action==='draft_memo'?'Build a solution memo from our conversation.':action==='social_post'?'Draft a LinkedIn post about our idea asking for feedback.':action==='outreach'?'Find relevant people in my connected LinkedIn browser, read promising profiles, and draft one personalized outreach message.':text;
      const next=[...history,{role:'user' as const,content}];setHistory(next);log('YOU  '+content);setStatus('OpenCode is working…');
      const response=await fetch(origin+'/api/agent',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...(cookie?{Cookie:cookie}:{}),...(process.env.AGENT_ACCESS_CODE?{'x-agent-access-code':process.env.AGENT_ACCESS_CODE}:{})},body:JSON.stringify({provider:process.env.AGENT_PROVIDER??'deepseek',model:process.env.AGENT_MODEL??'deepseek-flash',action,messages:next.slice(-20)})});
      if(!response.ok){const result=await response.json();throw new Error(result.error??'WYJ is unavailable.');}
      if(!response.body)throw new Error('No response stream.');
      const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';let actionCount=actions.length;
      async function consume(line:string){
        if(!line.trim())return;const event=JSON.parse(line) as AgentEvent;
        if(event.type==='progress')setStatus(event.message);
        if(event.type==='answer'){log('WYJ  '+event.text);setHistory(old=>[...old,{role:'assistant',content:event.text}]);}
        if(event.type==='error')log('ERROR  '+event.message);
        if(event.type==='action'){actionCount++;setActions(old=>[...old,event.action]);log(`ACTION ${actionCount} · ${event.action.title}\n${event.action.kind!=='linkedin_post'?event.action.profileUrl+'\n':''}${event.action.body}\n/prepare ${actionCount} opens this draft · /send ${actionCount} submits the exact prepared draft`);}
        if(event.type==='memo'){const directory=path.join(process.cwd(),'.wyj-runtime','memos');await mkdir(directory,{recursive:true,mode:0o700});const filename=path.join(directory,'WYJ-'+Date.now()+'.md');await writeFile(filename,event.markdown,{mode:0o600});log('MEMO  '+filename+'\n'+event.markdown);}
        if(event.type==='sources')for(const source of event.sources)log('SOURCE  '+source.title+' '+source.url);
      }
      while(true){const {value,done}=await reader.read();if(done){buffer+=decoder.decode();break;}buffer+=decoder.decode(value,{stream:true});let index;while((index=buffer.indexOf('\n'))!==-1){await consume(buffer.slice(0,index));buffer=buffer.slice(index+1);}}
      await consume(buffer);
    }catch(error){log('ERROR  '+(error instanceof Error?error.message:'Request failed.'));}
    finally{setBusy(false);setStatus('Ready');}
  }
  return <box flexDirection="column" width="100%" height="100%" padding={1} backgroundColor="#151d18">
    <box height={3} border borderColor="#d8f36a" paddingLeft={1}><text fg="#d8f36a">WYJ / OPENCODE + DEEPSEEK V4.1 FLASH</text></box>
    <scrollbox flexGrow={1} stickyScroll stickyStart="bottom" padding={1}>{lines.map((line,index)=><text key={index} fg={line.startsWith('ERROR')?'#ffad8a':line.startsWith('ACTION')?'#d8f36a':'#eff3e8'}>{line+'\n'}</text>)}</scrollbox>
    <text fg="#9fab91">{status}</text>
    <box height={3} border borderColor={busy?'#5b695a':'#d8f36a'} paddingLeft={1}><input key={inputKey} value={input} onInput={setInput} focused={!busy} placeholder={busy?'Working…':'Ask WYJ or type /connect'} onSubmit={value=>void send(typeof value==='string'?value:input)}/></box>
    <text fg="#9fab91">Enter send · Esc quit · drafts become numbered actions · browser login happens on your computer</text>
  </box>;
}
const renderer=await createCliRenderer({exitOnCtrlC:false});
createRoot(renderer).render(<App/>);
