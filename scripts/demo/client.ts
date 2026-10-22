// Tiny API client for demo scripts: one cookie per demo founder, sessions kept in a local gitignored file.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
export const EVENT_CODE = process.env.EVENT_CODE || 'SUPERSET';
const FILE = '.wyj-demo/sessions.json';

export type Session = { alias: string; cookie: string; participantId: string; displayName: string; contact: string };
export const loadSessions = (): Session[] => (existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : []);
export function saveSessions(s: Session[]) {
  mkdirSync('.wyj-demo', { recursive: true });
  writeFileSync(FILE, JSON.stringify(s, null, 2));
}

export async function api<T = any>(method: string, path: string, body?: unknown, cookie?: string): Promise<{ status: number; data: T; cookie?: string }> {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', origin: BASE, ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const set = res.headers.getSetCookie()[0]?.split(';')[0];
  return { status: res.status, data: (await res.json().catch(() => null)) as T, cookie: set };
}
