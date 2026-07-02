// src/server/admin.ts
import { timingSafeEqual } from 'node:crypto';

export function isAuthorized(provided: string | undefined): boolean {
  const secret = process.env.ADMIN_SECRET ?? '';
  if (!secret || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
