import React, { useEffect, useState, useCallback } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, Download, Clock, ShieldCheck, RefreshCw } from 'lucide-react';
import { getStudentPaymentHistory } from '../services/academicMasterV41toV55.js';
import { openRegistrationCheckout } from '../services/payment.js';

export default function PaymentCenterV46() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getStudentPaymentHistory();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load payment history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePay = async (type) => {
    try {
      setBusy(true);
      const returnUrl = `${window.location.origin}/payment-success`;
      const cancelUrl = `${window.location.origin}/payment-cancelled`;
      await openRegistrationCheckout({
        studentId: data.student.student_id,
        registrationType: type,
        returnUrl,
        cancelUrl
      });
    } catch (err) {
      setError(err.message || 'Could not initiate Monime checkout.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="v-master-wrap"><div className="v-card text-center"><RefreshCw className="v-spin" size={24} /><p>Loading payment status…</p></div></div>;
  }

  const s = data?.student;
  const isActive = s?.account_status === 'active';

  return (
    <div className="v-master-wrap">
      <header className="v-master-header">
        <div>
          <h1>Tuition & Academic Fees</h1>
          <p>Official university tuition schedule, registration clearance, and payment receipts.</p>
        </div>
      </header>

      {error && <div className="v-banner error"><AlertCircle size={18} /> {error}</div>}

      <section className="v-card v-payment-hero">
        <div className="v-payment-status-block">
          <div className="v-status-icon">{isActive ? <CheckCircle2 size={32} color="#16a34a" /> : <Clock size={32} color="#f59e0b" />}</div>
          <div>
            <h3>Account Status: {isActive ? 'ACTIVE & VERIFIED' : 'PAYMENT PENDING'}</h3>
            <p>{isActive ? 'Your tuition registration fee is paid. You have full access to campus modules and attendance.' : 'Complete your semester registration fee via Monime to activate your account.'}</p>
          </div>
        </div>

        {!isActive && (
          <div className="v-payment-action-box">
            <div className="v-fee-detail">
              <span>Semester Registration Fee:</span>
              <strong>SLE 100.00</strong>
            </div>
            <button className="v-btn primary" onClick={() => handlePay('normal')} disabled={busy}>
              <CreditCard size={16} /> {busy ? 'Connecting to Monime…' : 'Pay SLE 100 via Monime'}
            </button>
          </div>
        )}
      </section>

      {/* Payment History & Receipts */}
      <section className="v-card">
        <h3>Payment History & Digital Receipts</h3>
        <div className="v-table-responsive">
          <table className="v-table">
            <thead>
              <tr><th>Receipt #</th><th>Type</th><th>Amount</th><th>Provider Ref</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {!data?.payments?.length ? (
                <tr><td colSpan="6" className="v-no-data">No payment transactions recorded yet.</td></tr>
              ) : (
                data.payments.map(p => (
                  <tr key={p.id}>
                    <td><b className="v-id-badge">{p.receipt_number || p.id.slice(0, 8)}</b></td>
                    <td>{p.payment_type?.toUpperCase()}</td>
                    <td><b>{p.currency} {p.amount}</b></td>
                    <td><small className="v-sub">{p.provider_reference || '—'}</small></td>
                    <td>{new Date(p.created_at).toLocaleDateString()}</td>
                    <td><span className={`v-status-pill ${p.status === 'paid' ? 'green' : p.status === 'pending' ? 'orange' : 'red'}`}>{p.status.toUpperCase()}</span></td>
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
