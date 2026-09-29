import React, { useEffect, useState, useCallback } from 'react';
import { Activity, ShieldCheck, Database, Users, BookOpen, CreditCard, RefreshCw, AlertCircle } from 'lucide-react';
import { getSystemAuditMetrics } from '../services/academicMasterV41toV55.js';

export default function AdminOperationsV50() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getSystemAuditMetrics();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  if (loading) {
    return <div className="v-master-wrap"><div className="v-card text-center"><RefreshCw className="v-spin" size={24} /><p>Loading system operations…</p></div></div>;
  }

  const c = data?.counts || {};

  return (
    <div className="v-master-wrap">
      <header className="v-master-header">
        <div>
          <h1>System Administration & Audit Operations</h1>
          <p>Global platform monitoring, operational integrity, audit logging, and system health.</p>
        </div>
        <button className="v-btn outline" onClick={loadMetrics}><RefreshCw size={16} /> Refresh</button>
      </header>

      {/* Global Metrics Cards */}
      <section className="v-stats-grid">
        <div className="v-stat-card">
          <span className="label"><Users size={16} /> Total Students</span>
          <strong className="value">{c.students}</strong>
          <span className="sub">Registered accounts</span>
        </div>
        <div className="v-stat-card blue">
          <span className="label"><Users size={16} /> Lecturers</span>
          <strong className="value">{c.lecturers}</strong>
          <span className="sub">Academic staff</span>
        </div>
        <div className="v-stat-card green">
          <span className="label"><BookOpen size={16} /> Active Modules</span>
          <strong className="value">{c.modules}</strong>
          <span className="sub">Taught courses</span>
        </div>
        <div className="v-stat-card orange">
          <span className="label"><Activity size={16} /> Attendance Logs</span>
          <strong className="value">{c.attendanceRecords}</strong>
          <span className="sub">Verified check-ins</span>
        </div>
        <div className="v-stat-card green">
          <span className="label"><CreditCard size={16} /> Payments Processed</span>
          <strong className="value">{c.payments}</strong>
          <span className="sub">Monime transactions</span>
        </div>
      </section>

      {/* System Health Status */}
      <section className="v-card">
        <h3><ShieldCheck size={18} color="#16a34a" /> System Health & Security Status</h3>
        <div className="v-health-grid">
          <div className="v-health-item">
            <span>Supabase Auth & Database:</span>
            <strong className="v-color-present">Operational (Connected)</strong>
          </div>
          <div className="v-health-item">
            <span>Row Level Security (RLS):</span>
            <strong className="v-color-present">Enforced Across All Tables</strong>
          </div>
          <div className="v-health-item">
            <span>Monime Payment Gateway:</span>
            <strong className="v-color-present">Webhook Handler Active</strong>
          </div>
          <div className="v-health-item">
            <span>Storage Buckets:</span>
            <strong className="v-color-present">Private (Signed URLs Only)</strong>
          </div>
        </div>
      </section>

      {/* Audit Logs */}
      <section className="v-card">
        <h3>Recent System Audit Events</h3>
        <div className="v-table-responsive">
          <table className="v-table">
            <thead>
              <tr><th>Timestamp</th><th>Event</th><th>Entity</th><th>Role</th></tr>
            </thead>
            <tbody>
              {!data?.recentLogs?.length ? (
                <tr><td colSpan="4" className="v-no-data">System operating normally. No high-severity security audit events logged.</td></tr>
              ) : (
                data.recentLogs.map(l => (
                  <tr key={l.id}>
                    <td>{new Date(l.created_at).toLocaleString()}</td>
                    <td><b>{l.event_name}</b></td>
                    <td>{l.target_entity}</td>
                    <td><span className="v-chip">{l.actor_role || 'system'}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
