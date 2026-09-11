import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';

// A minimal component that exposes the context's state/functions as clickable
// buttons and readable text — RTL tests through what a component would actually
// render and do, not by calling context internals directly.
function TestConsumer() {
  const { user, isAuthenticated, loading, login, logout, updateUser } = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="authenticated">{String(isAuthenticated)}</div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
      <button onClick={() => login({ userId: '1', firstName: 'Remembered' }, 'token-a', true)}>
        login-remember
      </button>
      <button onClick={() => login({ userId: '2', firstName: 'ThisTabOnly' }, 'token-b', false)}>
        login-no-remember
      </button>
      <button onClick={() => logout()}>logout</button>
      <button onClick={() => updateUser({ firstName: 'Updated' })}>update</button>
    </div>
  );
}

const renderAuth = () => render(<AuthProvider><TestConsumer /></AuthProvider>);

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('AuthContext', () => {
  it('starts with no user and finishes loading with nothing in storage', () => {
    renderAuth();
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('restores a user from localStorage on mount', () => {
    localStorage.setItem('bt_user', JSON.stringify({ userId: '9', firstName: 'Saved' }));
    renderAuth();
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('user')).toHaveTextContent('Saved');
  });

  it('restores a user from sessionStorage when localStorage is empty', () => {
    sessionStorage.setItem('bt_user', JSON.stringify({ userId: '9', firstName: 'TabOnly' }));
    renderAuth();
    expect(screen.getByTestId('user')).toHaveTextContent('TabOnly');
  });

  it('login(remember=true) writes to localStorage and clears sessionStorage', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem('bt_token', 'stale-tab-only-token'); // simulate a leftover session
    renderAuth();

    await user.click(screen.getByText('login-remember'));

    expect(localStorage.getItem('bt_token')).toBe('token-a');
    expect(JSON.parse(localStorage.getItem('bt_user')).firstName).toBe('Remembered');
    expect(sessionStorage.getItem('bt_token')).toBeNull(); // the stale session must be cleared
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
  });

  it('login(remember=false) writes to sessionStorage and clears localStorage', async () => {
    const user = userEvent.setup();
    localStorage.setItem('bt_token', 'stale-remembered-token'); // simulate a leftover remembered session
    renderAuth();

    await user.click(screen.getByText('login-no-remember'));

    expect(sessionStorage.getItem('bt_token')).toBe('token-b');
    expect(localStorage.getItem('bt_token')).toBeNull(); // the stale remembered session must be cleared
  });

  it('logout clears both storages and resets user to null', async () => {
    const user = userEvent.setup();
    renderAuth();
    await user.click(screen.getByText('login-remember'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');

    await user.click(screen.getByText('logout'));

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(localStorage.getItem('bt_user')).toBeNull();
    expect(sessionStorage.getItem('bt_user')).toBeNull();
  });

  it('updateUser merges a patch into the existing user and persists it', async () => {
    const user = userEvent.setup();
    renderAuth();
    await user.click(screen.getByText('login-remember'));

    await user.click(screen.getByText('update'));

    expect(screen.getByTestId('user')).toHaveTextContent('Updated');
    // userId from the original login must survive the merge, not be wiped out
    expect(screen.getByTestId('user')).toHaveTextContent('"userId":"1"');
    expect(JSON.parse(localStorage.getItem('bt_user')).firstName).toBe('Updated');
  });
});
