import { Link } from 'react-router-dom';

import type { AuthUser } from '../auth/auth';
import { Layout } from '../components/Layout';

interface Props {
  user: AuthUser | null;
  onLogout: () => void;
}

export function HomePage({ user, onLogout }: Props) {
  return (
    <Layout title="CompTrack Dashboard" userName={user?.fullName} isAuthenticated={Boolean(user)} onLogout={onLogout}>
      <section className="panel">
        <h2>{user ? `Welcome, ${user.fullName}` : 'Welcome to CompTrack'}</h2>
        <p>{user ? `Active roles: ${user.roles.join(', ')}` : 'Sign in with a local account or create a new employee account.'}</p>
        {!user ? (
          <div className="helper-links">
            <Link to="/login">Sign in</Link>
            <Link to="/register">Register</Link>
          </div>
        ) : null}
      </section>
      <section className="panel">
        <h2>Local demo users</h2>
        <p>`employee1@example.com` / `ChangeMe123!`</p>
        <p>`manager1@example.com` / `ChangeMe123!`</p>
        <p>`hr1@example.com` / `ChangeMe123!`</p>
        <p>`superadmin@example.com` / `ChangeMe123!`</p>
      </section>
    </Layout>
  );
}
