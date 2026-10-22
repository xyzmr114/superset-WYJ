import {NextResponse} from 'next/server';
import {browserCommandSchema,isLoopback,browserErrorMessage} from '@/lib/browser/contracts';
import {BROWSER_COOKIE,browserSessionId,browserStatus,connectBrowser,disconnectBrowser,prepareBrowserAction,submitBrowserAction} from '@/lib/browser/session';
export const runtime='nodejs';
function localRequest(request:Request){
  const url=new URL(request.url);
  if(!isLoopback(url.hostname))throw new Error('The browser companion runs on your own computer. Open WYJ on localhost to connect it.');
  const origin=request.headers.get('origin');
  if((origin&&origin!==url.origin)||request.headers.get('sec-fetch-site')==='cross-site')throw new Error('Open the browser connection from this WYJ page.');
}
export async function GET(request:Request){
  try {localRequest(request);return NextResponse.json(browserStatus(browserSessionId(request)),{headers:{'Cache-Control':'no-store'}});}
  catch(error){return NextResponse.json({available:false,connected:false,signedIn:false,message:error instanceof Error?error.message:'Browser unavailable.'},{headers:{'Cache-Control':'no-store'}});}
}
export async function POST(request:Request){
  try {
    localRequest(request);
    if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Open the connection from WYJ.'},{status:403});
    const raw=await request.text();if(raw.length>12000)return NextResponse.json({error:'Browser command is too large.'},{status:413});
    const parsed=browserCommandSchema.safeParse(JSON.parse(raw));
    if(!parsed.success)return NextResponse.json({error:'Check the browser command and LinkedIn profile URL.'},{status:400});
    const command=parsed.data;const id=browserSessionId(request);
    if(command.command==='connect'){
      const nextId=await connectBrowser(id);
      const response=NextResponse.json(browserStatus(nextId));
      response.cookies.set(BROWSER_COOKIE,nextId,{httpOnly:true,sameSite:'strict',secure:new URL(request.url).protocol==='https:',path:'/'});
      return response;
    }
    if(command.command==='disconnect'){
      await disconnectBrowser(id);const response=NextResponse.json({connected:false});response.cookies.delete(BROWSER_COOKIE);return response;
    }
    return NextResponse.json(command.command==='prepare'?await prepareBrowserAction(id,command.action):await submitBrowserAction(id,command.action));
  }catch(error){return NextResponse.json({error:browserErrorMessage(error)},{status:400});}
}
