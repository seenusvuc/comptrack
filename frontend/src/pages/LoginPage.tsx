import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';

import type { AuthUser } from '../auth/auth';
import { Layout } from '../components/Layout';

interface Props {
  user: AuthUser | null;
  onLogin: (email: string, password: string) => Promise<void>;
}

export function LoginPage({ user, onLogin }: Props) {
  const location = useLocation();
  const [email, setEmail] = useState('employee1@example.com');
  const [password, setPassword] = useState('ChangeMe123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onLogin(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Sign In">
      <section className="panel auth-panel">
        <h2>Sign in to CompTrack</h2>
        <p>{location.state?.message || 'Use one of the local demo accounts or your registered employee account.'}</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
          </label>
          {error ? <div className="form-error">{error}</div> : null}
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="helper-links">
          <Link to="/register">Create an employee account</Link>
        </div>
      </section>
    </Layout>
  );
}
