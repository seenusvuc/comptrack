import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import type { AuthUser, RegisterPayload } from '../auth/auth';
import { Layout } from '../components/Layout';

interface Props {
  user: AuthUser | null;
  onRegister: (payload: RegisterPayload) => Promise<void>;
}

export function RegisterPage({ user, onRegister }: Props) {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterPayload>({
    fullName: '',
    email: '',
    password: '',
    employeeCode: '',
    department: '',
    team: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  function updateField<K extends keyof RegisterPayload>(key: K, value: RegisterPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onRegister(form);
      navigate('/login', { replace: true, state: { message: 'Registration complete. Please sign in.' } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Register">
      <section className="panel auth-panel">
        <h2>Create employee account</h2>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Full name
            <input value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} required />
          </label>
          <label>
            Email
            <input value={form.email} onChange={(event) => updateField('email', event.target.value)} type="email" required />
          </label>
          <label>
            Password
            <input value={form.password} onChange={(event) => updateField('password', event.target.value)} type="password" required />
          </label>
          <label>
            Employee code
            <input value={form.employeeCode} onChange={(event) => updateField('employeeCode', event.target.value)} />
          </label>
          <label>
            Department
            <input value={form.department} onChange={(event) => updateField('department', event.target.value)} />
          </label>
          <label>
            Team
            <input value={form.team} onChange={(event) => updateField('team', event.target.value)} />
          </label>
          {error ? <div className="form-error">{error}</div> : null}
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <div className="helper-links">
          <Link to="/login">Back to sign in</Link>
        </div>
      </section>
    </Layout>
  );
}
