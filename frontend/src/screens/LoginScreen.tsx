import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { login, signup, useAuth } from '../stores/AuthStore';

function LoginScreen() {
  const { token, restoring } = useAuth();
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (restoring) {
    return <div className="screen">読み込み中...</div>;
  }

  if (token) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signup(handle, displayName);
      } else {
        await login(handle);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="screen" style={{ padding: 24 }}>
      <h2>{mode === 'signup' ? 'はじめる' : 'ログイン'}</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>
          ハンドル
          <input value={handle} onChange={(e) => setHandle(e.target.value)} required />
        </label>
        {mode === 'signup' && (
          <label>
            表示名
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </label>
        )}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={submitting}>
          {mode === 'signup' ? '登録してはじめる' : 'ログイン'}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
        style={{ marginTop: 12 }}
      >
        {mode === 'signup' ? 'すでにアカウントがある' : '新規登録はこちら'}
      </button>
    </div>
  );
}

export default LoginScreen;
