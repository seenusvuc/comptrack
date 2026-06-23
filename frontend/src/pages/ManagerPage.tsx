import { useEffect, useState } from 'react';
import type { AuthUser } from '../auth/auth';
import { api } from '../api/client';
import { Layout } from '../components/Layout';

interface OvertimeEntry {
  id: string;
  employeeId: string;
  employee?: { fullName: string; employeeCode: string };
  workDate: string;
  overtimeHours: number;
  reason: string;
  status: string;
}

interface CompOffRequest {
  id: string;
  employeeId: string;
  employee?: { fullName: string; employeeCode: string };
  requestDate: string;
  requestedHours: number;
  reason: string;
  status: string;
}

interface TeamMember {
  employeeId: string;
  employeeName: string;
  availableHours: number;
}

interface Props {
  user: AuthUser | null;
  onLogout: () => void;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

function employeeLabel(entry: { employeeId: string; employee?: { fullName: string; employeeCode: string } }) {
  return entry.employee ? `${entry.employee.fullName} (${entry.employee.employeeCode})` : entry.employeeId;
}

export function ManagerPage({ user, onLogout }: Props) {
  const [overtimes, setOvertimes] = useState<OvertimeEntry[]>([]);
  const [compoffs, setCompoffs] = useState<CompOffRequest[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [comments, setComments] = useState<Record<string, string>>({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const [otAll, coAll, teamRes] = await Promise.all([
        api.get<{ items: OvertimeEntry[] }>('/overtime-entries').then(r => r.data.items),
        api.get<{ items: CompOffRequest[] }>('/compoff-requests').then(r => r.data.items),
        api.get<{ items: TeamMember[] }>('/balances/team').then(r => r.data.items),
      ]);
      setOvertimes(otAll.filter(e => e.status === 'submitted'));
      setCompoffs(coAll.filter(e => e.status === 'submitted'));
      setTeam(teamRes);
    } catch {
      setLoadError('Failed to load data. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  async function handleOtAction(id: string, action: 'approve' | 'reject') {
    try {
      await api.post(`/approvals/overtime/${id}/${action}`, { comment: comments[id] ?? '' });
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || `Failed to ${action}`);
    }
  }

  async function handleCoAction(id: string, action: 'approve' | 'reject') {
    try {
      await api.post(`/approvals/compoff/${id}/${action}`, { comment: comments[id] ?? '' });
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || `Failed to ${action}`);
    }
  }

  return (
    <Layout title="Manager Workspace" userName={user?.fullName} isAuthenticated={Boolean(user)} onLogout={onLogout}>
      {loadError && <p className="text-error" style={{ marginTop: '1rem' }}>{loadError}</p>}

      <section className="panel">
        <h2>Pending Overtime Approvals</h2>
        {loading ? <p className="text-muted">Loading…</p> : overtimes.length === 0 ? (
          <p className="text-muted">No pending overtime approvals.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Hours</th>
                <th>Reason</th>
                <th>Comment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {overtimes.map(ot => (
                <tr key={ot.id}>
                  <td>{employeeLabel(ot)}</td>
                  <td>{new Date(ot.workDate).toLocaleDateString()}</td>
                  <td>{ot.overtimeHours}h</td>
                  <td>{ot.reason}</td>
                  <td>
                    <input className="comment-input" type="text" placeholder="Optional comment"
                      value={comments[ot.id] ?? ''}
                      onChange={e => setComments(c => ({ ...c, [ot.id]: e.target.value }))} />
                  </td>
                  <td>
                    <button className="btn btn-sm btn-primary" type="button"
                      onClick={() => handleOtAction(ot.id, 'approve')}>Approve</button>
                    <button className="btn btn-sm btn-danger" type="button"
                      onClick={() => handleOtAction(ot.id, 'reject')}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <h2>Pending Comp-Off Approvals</h2>
        {loading ? <p className="text-muted">Loading…</p> : compoffs.length === 0 ? (
          <p className="text-muted">No pending comp-off approvals.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Hours</th>
                <th>Reason</th>
                <th>Comment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {compoffs.map(co => (
                <tr key={co.id}>
                  <td>{employeeLabel(co)}</td>
                  <td>{new Date(co.requestDate).toLocaleDateString()}</td>
                  <td>{co.requestedHours}h</td>
                  <td>{co.reason}</td>
                  <td>
                    <input className="comment-input" type="text" placeholder="Optional comment"
                      value={comments[co.id] ?? ''}
                      onChange={e => setComments(c => ({ ...c, [co.id]: e.target.value }))} />
                  </td>
                  <td>
                    <button className="btn btn-sm btn-primary" type="button"
                      onClick={() => handleCoAction(co.id, 'approve')}>Approve</button>
                    <button className="btn btn-sm btn-danger" type="button"
                      onClick={() => handleCoAction(co.id, 'reject')}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <h2>Team Balance</h2>
        {loading ? <p className="text-muted">Loading…</p> : team.length === 0 ? (
          <p className="text-muted">No direct reports found.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Available Hours</th>
              </tr>
            </thead>
            <tbody>
              {team.map(m => (
                <tr key={m.employeeId}>
                  <td>{m.employeeName}</td>
                  <td>{m.availableHours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </Layout>
  );
}
