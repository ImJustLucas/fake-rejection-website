import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAuthorized } from '../src/server/admin';
import { listEntries } from '../src/server/entries';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorized(req.headers['x-admin-secret'] as string | undefined)) return res.status(401).json({ error: 'unauthorized' });
  return res.status(200).json({ entries: await listEntries() });
}
