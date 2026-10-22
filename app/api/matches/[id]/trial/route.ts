import {NextResponse} from 'next/server';
import {assertSameOrigin,parseBody,requireSession,route} from '@/lib/server/http';
import {changeTrial,getTrial,trialAction} from '@/lib/server/trials';
type Context={params:Promise<{id:string}>};
export const GET=route(async(req,ctx:Context)=>{
 const me=requireSession(req);return NextResponse.json({trial:getTrial((await ctx.params).id,me.id)},{headers:{'Cache-Control':'no-store'}});
});
export const POST=route(async(req,ctx:Context)=>{
 assertSameOrigin(req);const me=requireSession(req);const input=await parseBody(req,trialAction);
 return NextResponse.json({trial:changeTrial((await ctx.params).id,me.id,input)},{headers:{'Cache-Control':'no-store'}});
});
