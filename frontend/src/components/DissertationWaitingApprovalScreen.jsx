import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, RefreshCw, LogOut, FileText, CheckCircle2, AlertCircle, ArrowRight, UserCheck, XCircle } from 'lucide-react';
import { getMyDissertationRequest, withdrawDissertationRequest } from '../services/academicMasterV41toV55.js';
import PaymentCheckout from './PaymentCheckout.jsx';
import DissertationRegistrationModal from './DissertationRegistrationModal.jsx';

export default function DissertationWaitingApprovalScreen({ student, termRegistration, dissertation, onRefresh, onLogout }) {
  const [checking, setChecking] = useState(false);
  const [requestData, setRequestData] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReRegisterModal, setShowReRegisterModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadRequest = async () => {
    try {
      const req = await getMyDissertationRequest();
      setRequestData(req);
    } catch (err) {
      console.warn('Error loading dissertation request:', err.message);
    }
  };

  useEffect(() => {
    loadRequest();
  }, []);

  const handleRefresh = async () => {
    try {
      setChecking(true);
      await Promise.all([onRefresh?.(), loadRequest()]);
    } finally {
      setTimeout(() => setChecking(false), 600);
    }
  };

  const handleWithdraw = async () => {
    if (!requestData?.id) return;
    if (!window.confirm('Are you sure you want to withdraw your supervision request? You will be able to select another faculty supervisor.')) return;
    try {
      setWithdrawing(true);
      setActionError('');
      await withdrawDissertationRequest(requestData.id);
      await loadRequest();
      await onRefresh?.();
    } catch (err) {
      setActionError(err.message || 'Failed to withdraw request.');
    } finally {
      setWithdrawing(false);
    }
  };

  // Check 7-day and 14-day timing
  const createdAt = requestData?.created_at ? new Date(requestData.created_at) : new Date();
  const daysPending = Math.floor((new Date() - createdAt) / (1000 * 60 * 60 * 24));
  const isOverSevenDays = daysPending >= 7;
  const isOverFourteenDays = daysPending >= 14;

  const status = requestData?.status || termRegistration?.status || 'pending';
  const isConfirmed = status === 'confirmed';
  const isDeclined = status === 'declined' || isOverFourteenDays;

  const topicTitle = requestData?.title || dissertation?.title || 'Academic Research Dissertation';
  const topicAbstract = requestData?.abstract || '';
  const supervisorName = requestData?.lecturers?.full_name || dissertation?.lecturers?.full_name || 'Designated Faculty Supervisor';
  const supervisorDept = requestData?.lecturers?.teaching_area || 'Department of Computer Science';

  return (
    <main className="auth-screen">
      <section className="auth-card" style={{ maxWidth: '560px', textAlign: 'center', padding: '36px 28px' }}>
        {actionError && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            fontSize: '13px',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} flexShrink={0} />
            <span>{actionError}</span>
          </div>
        )}

        {/* 1. SUPERVISOR CONFIRMED (Awaiting SLE 500 Payment) */}
        {isConfirmed ? (
          <div>
            <div style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 20px auto',
              boxShadow: '0 8px 24px rgba(22, 163, 74, 0.2)'
            }}>
              <CheckCircle2 size={40} color="#16a34a" />
            </div>

            <span style={{
              display: 'inline-block',
              background: '#dcfce7',
              color: '#15803d',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 800,
              marginBottom: '12px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              Supervisor Confirmed
            </span>

            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
              Supervisor Confirmed Your Proposal!
            </h1>

            <p style={{ color: '#64748b', fontSize: '13.5px', lineHeight: 1.6, margin: '0 0 24px 0' }}>
              <strong>{supervisorName}</strong> has agreed to supervise your research. To finalize your term registration and unlock your Dissertation Workspace, please pay the flat institution fee of <strong>SLE 500</strong>.
            </p>

            {/* Details Summary Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '18px',
              textAlign: 'left',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b' }}>Confirmed Supervisor:</span>
                <strong style={{ color: '#0f172a' }}>{supervisorName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b' }}>Department:</span>
                <span style={{ color: '#334155', fontWeight: 600 }}>{supervisorDept}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b' }}>Registration Fee:</span>
                <strong style={{ color: '#0284c7' }}>SLE 500.00 (Due)</strong>
              </div>
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                <span style={{ color: '#64748b', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                  Approved Research Topic:
                </span>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#1e293b', fontWeight: 600 }}>
                  "{topicTitle}"
                </p>
              </div>
            </div>

            {/* Checkout inline or button */}
            {showCheckout ? (
              <div style={{ textAlign: 'left', marginTop: '16px' }}>
                <PaymentCheckout
                  applicant={{
                    studentId: student?.student_id || student?.id,
                    fullName: student?.full_name,
                    email: student?.email,
                    phone: student?.phone || '',
                    registrationType: 'dissertation',
                    amount: 500,
                    fee: 500,
                    modulesCount: 1,
                    modules: ['DISSERTATION-RES']
                  }}
                  onPaymentCompleted={async () => {
                    setShowCheckout(false);
                    await handleRefresh();
                  }}
                  onCancel={() => setShowCheckout(false)}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => setShowCheckout(true)}
                  style={{ width: '100%', justifyContent: 'center', padding: '13px', borderRadius: '10px', fontWeight: 800, fontSize: '14.5px' }}
                >
                  Pay Flat Fee (SLE 500) & Unlock Workspace <ArrowRight size={17} />
                </button>

                <button
                  type="button"
                  className="outline-btn"
                  onClick={handleRefresh}
                  disabled={checking}
                  style={{ width: '100%', justifyContent: 'center', padding: '11px', borderRadius: '10px' }}
                >
                  <RefreshCw size={15} className={checking ? 'v-spin' : ''} /> {checking ? 'Checking Status…' : 'Refresh Status'}
                </button>
              </div>
            )}
          </div>
        ) : isDeclined ? (
          /* 2. SUPERVISOR DECLINED */
          <div>
            <div style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: '#fee2e2',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 20px auto',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.2)'
            }}>
              <XCircle size={40} color="#dc2626" />
            </div>

            <span style={{
              display: 'inline-block',
              background: '#fee2e2',
              color: '#b91c1c',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 800,
              marginBottom: '12px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              Request Not Accepted
            </span>

            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
              Supervision Request Declined
            </h1>

            <p style={{ color: '#64748b', fontSize: '13.5px', lineHeight: 1.6, margin: '0 0 20px 0' }}>
              {supervisorName} was unable to accept your request. Your proposal title and abstract are preserved so you can easily choose another faculty supervisor.
            </p>

            {/* Reason Box */}
            <div style={{
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: '12px',
              padding: '14px 16px',
              textAlign: 'left',
              marginBottom: '24px'
            }}>
              <span style={{ fontSize: '11.5px', color: '#9f1239', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>
                Supervisor Feedback / Reason:
              </span>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#881337', fontWeight: 500 }}>
                "{requestData?.decline_reason || 'Supervisor capacity reached or research topic outside current faculty focus area.'}"
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                className="primary-btn"
                onClick={() => setShowReRegisterModal(true)}
                style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: '10px', fontWeight: 700 }}
              >
                Choose Another Supervisor <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="outline-btn"
                onClick={onLogout}
                style={{ width: '100%', justifyContent: 'center', padding: '11px', borderRadius: '10px', color: '#dc2626', borderColor: '#fca5a5' }}
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </div>
        ) : (
          /* 3. PENDING SUPERVISOR CONFIRMATION */
          <div>
            <div style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 20px auto',
              boxShadow: '0 8px 24px rgba(2, 132, 199, 0.2)'
            }}>
              <Clock size={38} color="#0284c7" />
            </div>

            <span style={{
              display: 'inline-block',
              background: '#fef3c7',
              color: '#b45309',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 800,
              marginBottom: '12px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              Awaiting Supervisor Confirmation
            </span>

            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
              Request Sent to Supervisor
            </h1>

            <p style={{ color: '#64748b', fontSize: '13.5px', lineHeight: 1.6, margin: '0 0 20px 0' }}>
              Your research proposal has been delivered to <strong>{supervisorName}</strong>. You will be notified once they confirm. No registration fee is charged until after confirmation.
            </p>

            {/* 7-day reminder banner if applicable */}
            {isOverSevenDays && (
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '20px',
                textAlign: 'left',
                fontSize: '12.5px',
                color: '#92400e',
                lineHeight: 1.5
              }}>
                <strong>7-Day Notice:</strong> It has been {daysPending} days since your request was sent. If your supervisor is unavailable, you can withdraw your request and select another supervisor below.
              </div>
            )}

            {/* Proposal Details Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '18px',
              textAlign: 'left',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b' }}>Candidate:</span>
                <strong style={{ color: '#0f172a' }}>{student?.full_name || 'Final Year Student'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b' }}>Requested Supervisor:</span>
                <strong style={{ color: '#0284c7' }}>{supervisorName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b' }}>Term:</span>
                <span style={{ color: '#334155', fontWeight: 600 }}>Year 4 • Semester 2</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b' }}>Fee Status:</span>
                <span style={{ color: '#d97706', fontWeight: 700 }}>SLE 500 (Payable after confirmation)</span>
              </div>
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                <span style={{ color: '#64748b', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                  Proposed Research Topic:
                </span>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#1e293b', fontWeight: 600 }}>
                  "{topicTitle}"
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                className="primary-btn"
                onClick={handleRefresh}
                disabled={checking}
                style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: '10px', fontWeight: 700 }}
              >
                <RefreshCw size={16} className={checking ? 'v-spin' : ''} /> {checking ? 'Checking Status…' : 'Check Confirmation Status'}
              </button>

              <button
                type="button"
                className="outline-btn"
                onClick={handleWithdraw}
                disabled={withdrawing}
                style={{ width: '100%', justifyContent: 'center', padding: '11px', borderRadius: '10px', color: '#475569' }}
              >
                {withdrawing ? 'Withdrawing…' : 'Withdraw & Choose Another Supervisor'}
              </button>

              <button
                type="button"
                className="outline-btn"
                onClick={onLogout}
                style={{ width: '100%', justifyContent: 'center', padding: '11px', borderRadius: '10px', color: '#dc2626', borderColor: '#fca5a5' }}
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Modal to choose another supervisor if declined or withdrawn */}
        {showReRegisterModal && (
          <DissertationRegistrationModal
            student={student}
            isOpen={showReRegisterModal}
            onClose={() => setShowReRegisterModal(false)}
            initialTopic={topicTitle}
            initialAbstract={topicAbstract}
            onRegistered={async () => {
              setShowReRegisterModal(false);
              await handleRefresh();
            }}
          />
        )}
      </section>
    </main>
  );
}
