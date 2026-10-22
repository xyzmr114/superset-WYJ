import {NextResponse} from 'next/server';
import {assertSameOrigin,parseBody,requireSession,route} from '@/lib/server/http';
import {getMyMatch,toView} from '@/lib/server/matches';
import {introDecision,decideIntroduction} from '@/lib/server/intro-consent';
export const POST=route(async(req,ctx:{params:Promise<{id:string}>})=>{
 assertSameOrigin(req);const me=requireSession(req);const match=getMyMatch((await ctx.params).id,me.id);
 const input=await parseBody(req,introDecision);decideIntroduction(match,me.id,input);
 return NextResponse.json(toView(match,me.id));
});
