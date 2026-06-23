import { useEffect, useState } from 'react';
import type { AuthUser } from '../auth/auth';
import { api } from '../api/client';
import { Layout } from '../components/Layout';

interface Policy {
  conversionRatio: number;
  minUnitHours: number;
  maxCarryForwardHours: number;
  expiryDays: number;
  allowNegativeBalance: boolean;
  timezoneName: string;
}

interface UserItem {
  id: string;
  email: string;
  fullName: string;
  employeeCode: string | null;
  department: string | null;
  roles: string[];
}

interface Props {
  user: AuthUser | null;
  onLogout: () => void;
}

const ALL_ROLES = ['employee', 'manager', 'hr_admin', 'super_admin'];

export function AdminPage({ user, onLogout }: Props) {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [policyForm, setPolicyForm] = useState<Policy>({
    conversionRatio: 1, minUnitHours: 0.5, maxCarryForwardHours: 160,
    expiryDays: 180, allowNegativeBalance: false, timezoneName: 'UTC',
  });
  const [policyError, setPolicyError] = useState('');
  const [policySaving, setPolicySaving] = useState(false);
  const [policySaved, setPolicySaved] = useState(false);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [roleEdits, setRoleEdits] = useState<Record<string, string[]>>({});
  const [roleSaving, setRoleSaving] = useState<Record<string, boolean>>({});
  const [roleSaved, setRoleSaved] = useState<Record<string, boolean>>({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const [pol, usersRes] = await Promise.all([
        api.get<Policy>('/policy').then(r => r.data),
        api.get<{ items: UserItem[] }>('/users').then(r => r.data.items).catch(() => [] as UserItem[]),
      ]);
      setPolicy(pol);
      setPolicyForm({
        conversionRatio: pol.conversionRatio,
        minUnitHours: pol.minUnitHours,
        maxCarryForwardHours: pol.maxCarryForwardHours,
        expiryDays: pol.expiryDays,
        allowNegativeBalance: pol.allowNegativeBalance,
        timezoneName: pol.timezoneName,
      });
      setUsers(usersRes);
      const edits: Record<string, string[]> = {};
      usersRes.forEach(u => { edits[u.id] = u.roles; });
      setRoleEdits(edits);
    } catch {
      setLoadError('Failed to load data. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePolicySave(e: React.FormEvent) {
    e.preventDefault();
    setPolicySaving(true);
    setPolicyError('');
    setPolicySaved(false);
    try {
      await api.put('/policy', policyForm);
      setPolicySaved(true);
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPolicyError(msg || 'Failed to save policy');
    } finally {
      setPolicySaving(false);
    }
  }

  async function handleRoleSave(userId: string) {
    setRoleSaving(r => ({ ...r, [userId]: true }));
    setRoleSaved(r => ({ ...r, [userId]: false }));
    try {
      await api.put(`/users/${userId}/roles`, { roles: roleEdits[userId] });
      setRoleSaved(r => ({ ...r, [userId]: true }));
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to update roles');
    } finally {
      setRoleSaving(r => ({ ...r, [userId]: false }));
    }
  }

  function toggleRole(userId: string, role: string) {
    setRoleEdits(prev => {
      const current = prev[userId] ?? [];
      const next = current.includes(role) ? current.filter(r => r !== role) : [...current, role];
      return { ...prev, [userId]: next };
    });
    setRoleSaved(r => ({ ...r, [userId]: false }));
  }

  return (
    <Layout title="Admin Workspace" userName={user?.fullName} isAuthenticated={Boolean(user)} onLogout={onLogout}>
      {loadError && <p className="text-error" style={{ marginTop: '1rem' }}>{loadError}</p>}

      <section className="panel">
        <h2>Policy Settings</h2>
        {loading ? <p className="text-muted">Loading…</p> : policy && (
          <form onSubmit={handlePolicySave} style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
            <div className="form-grid">
              <label className="form-field">
                Conversion Ratio
                <input type="number" step="0.1" min="0.1" value={policyForm.conversionRatio}
                  onChange={e => setPolicyForm(f => ({ ...f, conversionRatio: Number(e.target.value) }))} />
              </label>
              <label className="form-field">
                Min Unit Hours
                <input type="number" step="0.5" min="0.5" value={policyForm.minUnitHours}
                  onChange={e => setPolicyForm(f => ({ ...f, minUnitHours: Number(e.target.value) }))} />
              </label>
              <label className="form-field">
                Max Carry Forward (h)
                <input type="number" step="1" min="0" value={policyForm.maxCarryForwardHours}
                  onChange={e => setPolicyForm(f => ({ ...f, maxCarryForwardHours: Number(e.target.value) }))} />
              </label>
              <label className="form-field">
                Expiry Days
                <input type="number" step="1" min="1" value={policyForm.expiryDays}
                  onChange={e => setPolicyForm(f => ({ ...f, expiryDays: Number(e.target.value) }))} />
              </label>
              <label className="form-field">
                Timezone
                <input type="text" value={policyForm.timezoneName}
                  onChange={e => setPolicyForm(f => ({ ...f, timezoneName: e.target.value }))} />
              </label>
              <label className="form-field">
                Allow Negative Balance
                <select value={policyForm.allowNegativeBalance ? 'yes' : 'no'}
                  onChange={e => setPolicyForm(f => ({ ...f, allowNegativeBalance: e.target.value === 'yes' }))}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </label>
            </div>
            {policyError && <p className="text-error">{policyError}</p>}
            {policySaved && <p className="text-success">Policy saved!</p>}
            <div className="form-actions">
              <button className="btn btn-sm btn-primary" type="submit" disabled={policySaving}>
                {policySaving ? 'Saving…' : 'Save Policy'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="panel">
        <h2>Users &amp; Roles</h2>
        {loading ? <p className="text-muted">Loading…</p> : users.length === 0 ? (
          <p className="text-muted">No users found or insufficient permissions.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Code</th>
                <th>Roles</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.fullName}</td>
                  <td>{u.email}</td>
                  <td>{u.employeeCode ?? '—'}</td>
                  <td>
                    <div className="role-toggles">
                      {ALL_ROLES.map(r => (
                        <label key={r} className="role-toggle">
                          <input type="checkbox"
                            checked={(roleEdits[u.id] ?? []).includes(r)}
                            onChange={() => toggleRole(u.id, r)} />
                          {' '}{r.replace('_', ' ')}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td>
                    {roleSaved[u.id] && <span className="text-success" style={{ marginRight: '0.5rem' }}>✓</span>}
                    <button className="btn btn-sm btn-primary" type="button"
                      disabled={roleSaving[u.id]}
                      onClick={() => handleRoleSave(u.id)}>
                      {roleSaving[u.id] ? 'Saving…' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </Layout>
  );
}
