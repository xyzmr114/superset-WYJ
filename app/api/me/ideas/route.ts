import {NextResponse} from 'next/server';
import {route,requireSession,assertSameOrigin,parseBody} from '@/lib/server/http';
import {ideasFor,publishIdea} from '@/lib/server/ideas';
import {Card} from '@/lib/server/brief-schema';
export const GET=route(async(req)=>{const me=requireSession(req);return NextResponse.json({ideas:ideasFor(me.id)});});
export const POST=route(async(req)=>{assertSameOrigin(req);const me=requireSession(req);return NextResponse.json(publishIdea(me,await parseBody(req,Card)));});
