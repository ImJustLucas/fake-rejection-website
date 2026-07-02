import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAuthorized } from '../src/server/admin';
import { deleteEntry } from '../src/server/entries';
import { isValidId } from '../src/server/ids';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!isAuthorized(req.headers['x-admin-secret'])) return res.status(401).json({ error: 'unauthorized' });
  const id = typeof (req.body as { id?: unknown })?.id === 'string' ? (req.body as { id: string }).id : '';
  if (!isValidId(id)) return res.status(400).json({ error: 'id' });
  await deleteEntry(id);
  return res.status(200).json({ ok: true });
}
