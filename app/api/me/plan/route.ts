import {NextResponse} from 'next/server';
import {z} from 'zod';
import {route,requireSession,assertSameOrigin,parseBody} from '@/lib/server/http';
import {planFor,choosePlan} from '@/lib/server/ideas';
export const GET=route(async(req)=>NextResponse.json(planFor(requireSession(req).id)));
// Hackathon preview selection only. No payment or paid entitlement is claimed.
export const POST=route(async(req)=>{assertSameOrigin(req);const me=requireSession(req);const {plan}=await parseBody(req,z.object({plan:z.enum(['free','premium'])}).strict());return NextResponse.json(choosePlan(me.id,plan));});
