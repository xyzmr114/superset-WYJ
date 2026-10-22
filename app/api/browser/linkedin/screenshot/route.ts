import {isLoopback} from '@/lib/browser/contracts';
import {browserSessionId,browserScreenshot,browserStatus} from '@/lib/browser/session';
export const runtime='nodejs';
export async function GET(request:Request){
  if(!isLoopback(new URL(request.url).hostname)||request.headers.get('sec-fetch-site')==='cross-site')return new Response(null,{status:403});
  const id=browserSessionId(request);if(!browserStatus(id).signedIn)return new Response(null,{status:401});
  try {const bytes=await browserScreenshot(id);return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'image/jpeg','Cache-Control':'no-store'}});}
  catch{return new Response(null,{status:409});}
}
