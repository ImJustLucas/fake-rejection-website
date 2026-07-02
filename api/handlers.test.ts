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
import del from './delete';
import track from './track';
import { getEntryAndCountVisit } from '../src/server/entries';
import { handleTrack } from '../src/server/track';

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
    await entry({ method: 'GET', query: { id: 'abcDEF12' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('entry returns 400 for a malformed id', async () => {
    const res = mockRes();
    await entry({ method: 'GET', query: { id: 'bad' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('list rejects without the admin secret (401)', async () => {
    const res = mockRes();
    await list({ method: 'GET', headers: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('delete removes a valid id with the admin secret', async () => {
    const res = mockRes();
    await del({ method: 'POST', headers: { 'x-admin-secret': 'good' }, body: { id: 'abcDEF12' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
  it('delete rejects a malformed id (400)', async () => {
    const res = mockRes();
    await del({ method: 'POST', headers: { 'x-admin-secret': 'good' }, body: { id: 'bad' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('delete rejects non-POST (405)', async () => {
    const res = mockRes();
    await del({ method: 'GET', headers: { 'x-admin-secret': 'good' }, body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
  it('track returns 200 for a good event', async () => {
    const res = mockRes();
    await track({ method: 'POST', body: { event: 'visit', name: 'Lou' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it('track returns 400 for a bad event', async () => {
    (handleTrack as any).mockResolvedValueOnce({ ok: false });
    const res = mockRes();
    await track({ method: 'POST', body: { event: 'nope' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('list rejects non-GET (405)', async () => {
    const res = mockRes();
    await list({ method: 'POST', headers: { 'x-admin-secret': 'good' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});
