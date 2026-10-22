import {NextResponse} from 'next/server';
import {route,assertSameOrigin,requireSession,parseBody} from '@/lib/server/http';
import {EnhancementRequest} from '@/lib/premium/enhancement-contract';
import {enhanceApprovedIdea} from '@/lib/server/premium-enhance';
export const runtime='nodejs';
export const maxDuration=65;
export const POST=route(async(req)=>{
 assertSameOrigin(req);
 const me=await requireSession(req);
 const input=await parseBody(req,EnhancementRequest);
 return NextResponse.json(await enhanceApprovedIdea(me,input),{headers:{'Cache-Control':'no-store'}});
});
