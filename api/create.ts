import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAuthorized } from '../src/server/admin';
import { validateCreateInput } from '../src/server/validate';
import { createEntry } from '../src/server/entries';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!isAuthorized(req.headers['x-admin-secret'])) return res.status(401).json({ error: 'unauthorized' });
  const parsed = validateCreateInput(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const id = await createEntry(parsed.value, Date.now());
  return res.status(200).json({ id });
}
