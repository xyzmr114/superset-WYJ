import {NextResponse} from 'next/server';
import {z} from 'zod';
import {route,requireSession,assertSameOrigin,parseBody} from '@/lib/server/http';
import {setIdeaPublished} from '@/lib/server/ideas';
const Publication=z.object({published:z.boolean()}).strict();
export const PATCH=route(async(req,ctx:{params:Promise<{ideaId:string}>})=>{
 assertSameOrigin(req);
 const me=await requireSession(req),{ideaId}=await ctx.params;
 const {published}=await parseBody(req,Publication);
 return NextResponse.json(await setIdeaPublished(me,ideaId,published));
});
