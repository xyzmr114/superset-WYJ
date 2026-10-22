import {NextResponse} from 'next/server';
import {assertSameOrigin,parseBody,requireSession,route} from '@/lib/server/http';
import {getMyMatch,toView} from '@/lib/server/matches';
import {introDecision,decideIntroduction} from '@/lib/server/intro-consent';
export const POST=route(async(req,ctx:{params:Promise<{id:string}>})=>{
 assertSameOrigin(req);
 const me=await requireSession(req);
 const match=await getMyMatch((await ctx.params).id,me.id);
 const input=await parseBody(req,introDecision);
 return NextResponse.json(await toView(await decideIntroduction(match,me.id,input),me.id));
});
