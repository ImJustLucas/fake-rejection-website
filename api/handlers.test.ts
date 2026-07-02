// api/handlers.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/server/admin', () => ({ isAuthorized: (s?: string) => s === 'good' }));
vi.mock('../src/server/entries', () => ({
  createEntry: vi.fn().mockResolvedValue('FIXEDid1'),
  getEntryAndCountVisit: vi.fn(),
  listEntries: vi.fn().mockResolvedValue([]),
  deleteEntry: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/server/track', () => ({ handleTrack: vi.fn().mockResolvedValue({ ok: true }) }));

import create from './create';
import entry from './entry';
import list from './list';
import { getEntryAndCountVisit } from '../src/server/entries';

function mockRes() {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

beforeEach(() => vi.clearAllMocks());

describe('api handlers', () => {
  it('create rejects without the admin secret (401)', async () => {
    const res = mockRes();
    await create({ method: 'POST', headers: {}, body: { name: 'Lou', phrase: '' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('create returns an id with the admin secret', async () => {
    const res = mockRes();
    await create({ method: 'POST', headers: { 'x-admin-secret': 'good' }, body: { name: 'Lou', phrase: '' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: 'FIXEDid1' });
  });

  it('entry returns 404 for an unknown id', async () => {
    (getEntryAndCountVisit as any).mockResolvedValue(null);
    const res = mockRes();
    await entry({ query: { id: 'abcDEF12' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('entry returns 400 for a malformed id', async () => {
    const res = mockRes();
    await entry({ query: { id: 'bad' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('list rejects without the admin secret (401)', async () => {
    const res = mockRes();
    await list({ headers: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
