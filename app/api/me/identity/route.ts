import { NextResponse } from 'next/server';
import { z } from 'zod';
import { q } from '@/lib/server/store';
import { assertSameOrigin, parseBody, requireSession, route } from '@/lib/server/http';

// Stored apart from the card; only read when a match is mutually revealed. Never echoed back.
export const PUT = route(async (req) => {
  assertSameOrigin(req);
  const me = await requireSession(req);
  const body = await parseBody(req, z.object({
    displayName: z.string().trim().min(1).max(80),
    contact: z.string().trim().min(1).max(200),
  }));
  await q(
    `insert into identities (participant_id, display_name, contact) values ($1, $2, $3)
     on conflict (participant_id) do update set display_name = excluded.display_name, contact = excluded.contact`,
    [me.id, body.displayName, body.contact],
  );
  return NextResponse.json({ saved: true });
});
