import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPublicPlans, signup } from './api';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const ok = (body: unknown) => ({
  ok: true,
  status: 200,
  json: async () => body,
});
const bad = (status: number, body: unknown) => ({
  ok: false,
  status,
  json: async () => body,
});

beforeEach(() => mockFetch.mockReset());

describe('getPublicPlans', () => {
  it('calls /public/plans and returns data[]', async () => {
    mockFetch.mockResolvedValue(ok({ data: [{ code: 'basic' }, { code: 'pro' }] }));
    const plans = await getPublicPlans();
    expect(plans.map((p) => p.code)).toEqual(['basic', 'pro']);
    expect(mockFetch.mock.calls[0][0]).toMatch(/\/public\/plans$/);
  });

  it('throws on a non-ok response', async () => {
    mockFetch.mockResolvedValue(bad(500, {}));
    await expect(getPublicPlans()).rejects.toThrow(/Failed to load plans/);
  });
});

describe('signup', () => {
  const input = {
    organizationName: 'Shop',
    fullName: 'A',
    email: 'a@b.c',
    password: 'longenough1',
    planCode: 'pro',
  };

  it('POSTs the payload as JSON and returns data', async () => {
    mockFetch.mockResolvedValue(
      ok({ success: true, data: { token: 't', plan: 'pro' } })
    );
    const res = await signup(input);
    expect(res.token).toBe('t');
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/public\/signup$/);
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toMatchObject({ email: 'a@b.c', planCode: 'pro' });
  });

  it('surfaces the server message on failure', async () => {
    mockFetch.mockResolvedValue(
      bad(409, { success: false, message: 'An account with that email already exists' })
    );
    await expect(signup(input)).rejects.toThrow(/already exists/);
  });

  it('falls back to a generic message when the body has none', async () => {
    mockFetch.mockResolvedValue(bad(400, {}));
    await expect(signup(input)).rejects.toThrow(/Sign-up failed/);
  });
});
