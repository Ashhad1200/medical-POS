import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { accessValidity, AuthProvider, useAuth } from './auth-context';

// --- mock the api + services layer -----------------------------------------
vi.mock('@/lib/api', () => {
  const store = { t: null };
  return {
    api: { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
    tokenStore: {
      get: () => store.t,
      set: (v) => {
        store.t = v;
      },
    },
    apiError: (e) => e?.message || 'err',
  };
});

const profileResp = {
  data: {
    data: {
      user: {
        id: 'u1',
        fullName: 'A',
        role_in_pos: 'counter',
        organization: { name: 'Shop' },
        organization_is_active: true,
        organization_access_valid_till: null,
      },
    },
  },
};

vi.mock('@/lib/services', () => ({
  authServices: {
    login: vi.fn(async () => ({ data: { data: { token: 'jwt-123' } } })),
    getProfile: vi.fn(async () => profileResp),
    logout: vi.fn(async () => ({})),
  },
}));

describe('accessValidity', () => {
  it('valid when no expiry and org active', () => {
    expect(accessValidity({ organization_is_active: true }).valid).toBe(true);
  });
  it('invalid when org is deactivated', () => {
    const r = accessValidity({ organization_is_active: false });
    expect(r.valid).toBe(false);
    expect(r.message).toMatch(/deactivated/i);
  });
  it('invalid when access window is in the past', () => {
    const r = accessValidity({
      organization_access_valid_till: '2000-01-01T00:00:00Z',
    });
    expect(r.valid).toBe(false);
    expect(r.message).toMatch(/expired/i);
  });
  it('valid when access window is in the future', () => {
    const future = new Date(Date.now() + 864e5).toISOString();
    expect(
      accessValidity({ organization_access_valid_till: future }).valid
    ).toBe(true);
  });
});

function Probe() {
  const { ready, isAuthenticated, role, login } = useAuth();
  return (
    <div>
      <span data-testid="ready">{String(ready)}</span>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="role">{role || '-'}</span>
      <button onClick={() => login('a@b.c', 'pw')}>login</button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts unauthenticated and becomes ready', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId('ready')).toHaveTextContent('true')
    );
    expect(screen.getByTestId('authed')).toHaveTextContent('false');
  });

  it('login stores the profile and exposes the role', async () => {
    const { authServices } = await import('@/lib/services');
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId('ready')).toHaveTextContent('true')
    );
    screen.getByText('login').click();
    await waitFor(() =>
      expect(screen.getByTestId('authed')).toHaveTextContent('true')
    );
    expect(screen.getByTestId('role')).toHaveTextContent('counter');
    expect(authServices.login).toHaveBeenCalledWith({
      email: 'a@b.c',
      password: 'pw',
    });
  });
});
