import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getEntryAndCountVisit } from '../src/server/entries';
import { isValidId } from '../src/server/ids';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' });
  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!isValidId(id)) return res.status(400).json({ error: 'id' });
  const entry = await getEntryAndCountVisit(id);
  if (!entry) return res.status(404).json({ error: 'notfound' });
  return res.status(200).json({ name: entry.name, phrase: entry.phrase, mode: entry.mode });
}
