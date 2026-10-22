import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/server/store';
import { assertSameOrigin, parseBody, requireSession, route } from '@/lib/server/http';

// Stored apart from the card; only read when a match is mutually revealed. Never echoed back.
export const PUT = route(async (req) => {
  assertSameOrigin(req);
  const me = requireSession(req);
  const body = await parseBody(req, z.object({
    displayName: z.string().trim().min(1).max(80),
    contact: z.string().trim().min(1).max(200),
  }));
  db.identities.set(me.id, body);
  return NextResponse.json({ saved: true });
});
