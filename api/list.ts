import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAuthorized } from '../src/server/admin.js';
import { listEntries } from '../src/server/entries.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' });
  if (!isAuthorized(req.headers['x-admin-secret'])) return res.status(401).json({ error: 'unauthorized' });
  return res.status(200).json({ entries: await listEntries() });
}
