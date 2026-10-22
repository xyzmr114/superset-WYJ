import {NextResponse} from 'next/server';
import {route,assertSameOrigin,requireSession,parseBody} from '@/lib/server/http';
import {ResearchRequest} from '@/lib/premium/research-contract';
import {researchApprovedIdea} from '@/lib/server/premium-research';
export const runtime='nodejs';
export const maxDuration=60;
export const POST=route(async req=>{assertSameOrigin(req);const me=await requireSession(req);const input=await parseBody(req,ResearchRequest);return NextResponse.json(await researchApprovedIdea(me,input,{signal:AbortSignal.any([req.signal,AbortSignal.timeout(45000)])}),{headers:{'Cache-Control':'no-store'}});});
