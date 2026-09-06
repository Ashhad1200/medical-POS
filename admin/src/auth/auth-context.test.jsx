import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth-context';

const token = { v: null };
const api = { get: vi.fn(), post: vi.fn() };

vi.mock('@/lib/api', () => ({
  api: { get: (...a) => api.get(...a), post: (...a) => api.post(...a) },
  tokenStore: {
    get: () => token.v,
    set: (v) => {
      token.v = v;
    },
  },
  apiError: (e) => e?.message,
}));

function Probe() {
  const { ready, user, login } = useAuth();
  return (
    <div>
      <span data-testid="ready">{String(ready)}</span>
      <span data-testid="user">{user ? user.email : '-'}</span>
      <button
        onClick={() =>
          login('op@x.test', 'pw').catch((e) => {
            document.body.dataset.err = e.message;
          })
        }
      >
        login
      </button>
    </div>
  );
}

const renderAuth = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

describe('admin AuthProvider', () => {
  beforeEach(() => {
    token.v = null;
    api.get.mockReset();
    api.post.mockReset();
    delete document.body.dataset.err;
  });

  it('is ready and signed-out with no token', async () => {
    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId('ready')).toHaveTextContent('true')
    );
    expect(screen.getByTestId('user')).toHaveTextContent('-');
  });

  it('login stores the user after the platform-access check passes', async () => {
    api.post.mockResolvedValue({
      data: { data: { token: 'jwt', user: { email: 'op@x.test' } } },
    });
    api.get.mockResolvedValue({ data: { data: { status: 'ok' } } }); // /platform/health

    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId('ready')).toHaveTextContent('true')
    );
    screen.getByText('login').click();

    await waitFor(() =>
      expect(screen.getByTestId('user')).toHaveTextContent('op@x.test')
    );
    expect(token.v).toBe('jwt');
    expect(api.get).toHaveBeenCalledWith('/platform/health');
  });

  it('login rejects and clears the token when the account is not a platform admin', async () => {
    api.post.mockResolvedValue({
      data: { data: { token: 'jwt', user: { email: 'tenant@x.test' } } },
    });
    api.get.mockRejectedValue({ response: { status: 403 } });

    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId('ready')).toHaveTextContent('true')
    );
    screen.getByText('login').click();

    await waitFor(() =>
      expect(document.body.dataset.err).toMatch(/not a platform administrator/i)
    );
    expect(token.v).toBeNull();
    expect(screen.getByTestId('user')).toHaveTextContent('-');
  });
});
