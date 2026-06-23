import { useEffect, useState } from 'react';
import type { AuthUser } from '../auth/auth';
import { api } from '../api/client';
import { Layout } from '../components/Layout';

interface OvertimeEntry {
  id: string;
  workDate: string;
  overtimeHours: number;
  reason: string;
  projectCode: string | null;
  status: string;
}

interface CompOffRequest {
  id: string;
  requestDate: string;
  requestedHours: number;
  reason: string;
  status: string;
}

interface Balance {
  creditedHours: number;
  debitedHours: number;
  availableHours: number;
}

interface Props {
  user: AuthUser | null;
  onLogout: () => void;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export function EmployeePage({ user, onLogout }: Props) {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [overtimes, setOvertimes] = useState<OvertimeEntry[]>([]);
  const [compoffs, setCompoffs] = useState<CompOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [showOtForm, setShowOtForm] = useState(false);
  const [otForm, setOtForm] = useState({ workDate: '', overtimeHours: '', reason: '', projectCode: '' });
  const [otSaving, setOtSaving] = useState(false);
  const [otError, setOtError] = useState('');

  const [showCoForm, setShowCoForm] = useState(false);
  const [coForm, setCoForm] = useState({ requestDate: '', requestedHours: '', reason: '' });
  const [coSaving, setCoSaving] = useState(false);
  const [coError, setCoError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const [bal, otRes, coRes] = await Promise.all([
        api.get<Balance>('/balances/me').then(r => r.data),
        api.get<{ items: OvertimeEntry[] }>('/overtime-entries').then(r => r.data.items),
        api.get<{ items: CompOffRequest[] }>('/compoff-requests').then(r => r.data.items),
      ]);
      setBalance(bal);
      setOvertimes(otRes);
      setCompoffs(coRes);
    } catch {
      setLoadError('Failed to load data. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  async function handleOtSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOtSaving(true);
    setOtError('');
    try {
      await api.post('/overtime-entries', {
        workDate: otForm.workDate,
        overtimeHours: Number(otForm.overtimeHours),
        reason: otForm.reason,
        projectCode: otForm.projectCode || undefined,
      });
      setOtForm({ workDate: '', overtimeHours: '', reason: '', projectCode: '' });
      setShowOtForm(false);
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setOtError(msg || 'Failed to create entry');
    } finally {
      setOtSaving(false);
    }
  }

  async function handleOtAction(id: string, action: 'submit' | 'cancel') {
    try {
      await api.post(`/overtime-entries/${id}/${action}`);
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || `Failed to ${action}`);
    }
  }

  async function handleCoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCoSaving(true);
    setCoError('');
    try {
      await api.post('/compoff-requests', {
        requestDate: coForm.requestDate,
        requestedHours: Number(coForm.requestedHours),
        reason: coForm.reason,
      });
      setCoForm({ requestDate: '', requestedHours: '', reason: '' });
      setShowCoForm(false);
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCoError(msg || 'Failed to create request');
    } finally {
      setCoSaving(false);
    }
  }

  async function handleCoCancel(id: string) {
    try {
      await api.post(`/compoff-requests/${id}/cancel`);
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to cancel');
    }
  }

  return (
    <Layout title="Employee Workspace" userName={user?.fullName} isAuthenticated={Boolean(user)} onLogout={onLogout}>
      {loadError && <p className="text-error" style={{ marginTop: '1rem' }}>{loadError}</p>}

      <section className="panel">
        <h2>My Balance</h2>
        {loading ? <p className="text-muted">Loading…</p> : balance ? (
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-value">{balance.availableHours}h</div>
              <div className="stat-label">Available</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{balance.creditedHours}h</div>
              <div className="stat-label">Total Credited</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{balance.debitedHours}h</div>
              <div className="stat-label">Total Used</div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Overtime Entries</h2>
          <button className="btn btn-sm btn-primary" type="button" onClick={() => setShowOtForm(v => !v)}>
            {showOtForm ? 'Close' : '+ Add Entry'}
          </button>
        </div>

        {showOtForm && (
          <form className="inline-form" onSubmit={handleOtSubmit}>
            <div className="form-grid">
              <label className="form-field">
                Work Date
                <input type="date" required value={otForm.workDate}
                  onChange={e => setOtForm(f => ({ ...f, workDate: e.target.value }))} />
              </label>
              <label className="form-field">
                Hours
                <input type="number" step="0.5" min="0.5" required value={otForm.overtimeHours}
                  onChange={e => setOtForm(f => ({ ...f, overtimeHours: e.target.value }))} />
              </label>
              <label className="form-field">
                Project Code
                <input type="text" value={otForm.projectCode}
                  onChange={e => setOtForm(f => ({ ...f, projectCode: e.target.value }))} />
              </label>
            </div>
            <label className="form-field">
              Reason
              <input type="text" required value={otForm.reason}
                onChange={e => setOtForm(f => ({ ...f, reason: e.target.value }))} />
            </label>
            {otError && <p className="text-error">{otError}</p>}
            <div className="form-actions">
              <button className="btn btn-sm btn-primary" type="submit" disabled={otSaving}>
                {otSaving ? 'Saving…' : 'Save as Draft'}
              </button>
            </div>
          </form>
        )}

        {!loading && overtimes.length === 0 && <p className="text-muted">No overtime entries yet.</p>}
        {overtimes.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Hours</th>
                <th>Reason</th>
                <th>Project</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {overtimes.map(ot => (
                <tr key={ot.id}>
                  <td>{new Date(ot.workDate).toLocaleDateString()}</td>
                  <td>{ot.overtimeHours}h</td>
                  <td>{ot.reason}</td>
                  <td>{ot.projectCode ?? '—'}</td>
                  <td><StatusBadge status={ot.status} /></td>
                  <td>
                    {ot.status === 'draft' && (
                      <>
                        <button className="btn btn-sm btn-primary" type="button"
                          onClick={() => handleOtAction(ot.id, 'submit')}>Submit</button>
                        <button className="btn btn-sm btn-danger" type="button"
                          onClick={() => handleOtAction(ot.id, 'cancel')}>Cancel</button>
                      </>
                    )}
                    {ot.status === 'submitted' && (
                      <button className="btn btn-sm btn-danger" type="button"
                        onClick={() => handleOtAction(ot.id, 'cancel')}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Comp-Off Requests</h2>
          <button className="btn btn-sm btn-primary" type="button" onClick={() => setShowCoForm(v => !v)}>
            {showCoForm ? 'Close' : '+ Request Comp-off'}
          </button>
        </div>

        {showCoForm && (
          <form className="inline-form" onSubmit={handleCoSubmit}>
            <div className="form-grid">
              <label className="form-field">
                Request Date
                <input type="date" required value={coForm.requestDate}
                  onChange={e => setCoForm(f => ({ ...f, requestDate: e.target.value }))} />
              </label>
              <label className="form-field">
                Hours
                <input type="number" step="0.5" min="0.5" required value={coForm.requestedHours}
                  onChange={e => setCoForm(f => ({ ...f, requestedHours: e.target.value }))} />
              </label>
            </div>
            <label className="form-field">
              Reason
              <input type="text" required value={coForm.reason}
                onChange={e => setCoForm(f => ({ ...f, reason: e.target.value }))} />
            </label>
            {coError && <p className="text-error">{coError}</p>}
            <div className="form-actions">
              <button className="btn btn-sm btn-primary" type="submit" disabled={coSaving}>
                {coSaving ? 'Saving…' : 'Submit Request'}
              </button>
            </div>
          </form>
        )}

        {!loading && compoffs.length === 0 && <p className="text-muted">No comp-off requests yet.</p>}
        {compoffs.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Hours</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {compoffs.map(co => (
                <tr key={co.id}>
                  <td>{new Date(co.requestDate).toLocaleDateString()}</td>
                  <td>{co.requestedHours}h</td>
                  <td>{co.reason}</td>
                  <td><StatusBadge status={co.status} /></td>
                  <td>
                    {co.status === 'submitted' && (
                      <button className="btn btn-sm btn-danger" type="button"
                        onClick={() => handleCoCancel(co.id)}>Cancel</button>
                    )}
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
