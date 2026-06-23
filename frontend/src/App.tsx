import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { login, logout, register, restoreSession, type AuthUser, type RegisterPayload } from './auth/auth';
import { RoleGate } from './components/RoleGate';
import { AdminPage } from './pages/AdminPage';
import { EmployeePage } from './pages/EmployeePage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ManagerPage } from './pages/ManagerPage';
import { RegisterPage } from './pages/RegisterPage';

export function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    restoreSession()
      .then((sessionUser) => setUser(sessionUser))
      .finally(() => setReady(true));
  }, []);

  async function handleLogin(email: string, password: string) {
    const authUser = await login({ email, password });
    setUser(authUser);
  }

  async function handleRegister(payload: RegisterPayload) {
    await register(payload);
  }

  function handleLogout() {
    logout();
    setUser(null);
  }

  if (!ready) {
    return <div className="shell"><section className="panel">Loading session...</section></div>;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage user={user} onLogout={handleLogout} />} />
      <Route path="/login" element={<LoginPage user={user} onLogin={handleLogin} />} />
      <Route path="/register" element={<RegisterPage user={user} onRegister={handleRegister} />} />
      <Route
        path="/employee"
        element={
          <RoleGate allowed={['employee']} userRoles={user?.roles || []} isAuthenticated={Boolean(user)}>
            <EmployeePage user={user} onLogout={handleLogout} />
          </RoleGate>
        }
      />
      <Route
        path="/manager"
        element={
          <RoleGate allowed={['manager']} userRoles={user?.roles || []} isAuthenticated={Boolean(user)}>
            <ManagerPage user={user} onLogout={handleLogout} />
          </RoleGate>
        }
      />
      <Route
        path="/admin"
        element={
          <RoleGate allowed={['hr_admin', 'super_admin']} userRoles={user?.roles || []} isAuthenticated={Boolean(user)}>
            <AdminPage user={user} onLogout={handleLogout} />
          </RoleGate>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
