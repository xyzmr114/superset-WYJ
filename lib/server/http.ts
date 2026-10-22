import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import { q, type Participant } from './store';

export const SESSION_COOKIE = 'wyj_session';

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');
export const newId = () => randomBytes(9).toString('base64url');

/** Identity comes only from the HttpOnly cookie, never from IDs in the request. */
export async function requireSession(req: Request): Promise<Participant> {
  const raw = req.headers.get('cookie') ?? '';
  const token = raw.split(';').map((c) => c.trim().split('=')).find(([k]) => k === SESSION_COOKIE)?.[1];
  const [p] = token ? await q('select id, event_id from participants where token_hash = $1', [hashToken(decodeURIComponent(token))]) : [];
  if (!p) throw new HttpError(401, 'UNAUTHORIZED', 'Join the event first.');
  return { id: p.id, eventId: p.event_id };
}

/** CSRF guard for mutations: a browser-sent Origin must match this host. Non-browser clients send none. */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (origin && new URL(origin).host !== host) throw new HttpError(403, 'FORBIDDEN_ORIGIN', 'Cross-origin request refused.');
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const parsed = schema.safeParse(await req.json().catch(() => undefined));
  if (!parsed.success) throw new HttpError(400, 'BAD_REQUEST', 'Invalid request body.');
  return parsed.data;
}

export const notFound = () => new HttpError(404, 'NOT_FOUND', 'Not found.');

/** Wraps a route handler: maps HttpError to the ApiError shape. Never logs request bodies. */
export function route<C>(fn: (req: Request, ctx: C) => Promise<Response> | Response) {
  return async (req: Request, ctx: C) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
      console.error('route error:', err instanceof Error ? err.message : 'unknown');
      return NextResponse.json({ error: { code: 'INTERNAL', message: 'Something went wrong.' } }, { status: 500 });
    }
  };
}
