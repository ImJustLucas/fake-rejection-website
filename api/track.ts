import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleTrack } from '../src/server/track';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const result = await handleTrack(req.body ?? {});
  return res.status(result.ok ? 200 : 400).json(result);
}
