// src/server/admin.ts
import { timingSafeEqual } from 'node:crypto';

export function isAuthorized(provided: string | string[] | undefined): boolean {
  const value = Array.isArray(provided) ? provided[0] : provided;
  const secret = process.env.ADMIN_SECRET ?? '';
  if (!secret || !value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
