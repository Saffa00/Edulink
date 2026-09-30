import React, { useState, useEffect } from 'react';
import { User, LogIn, ArrowRight, UserPlus, X } from 'lucide-react';

export default function PortalGatewayScreen({ onLogin, onRegister, onSelectAccount }) {
  const [lastAccount, setLastAccount] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('edulink_last_account');
      if (saved) {
        setLastAccount(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not parse last account:', e);
    }
  }, []);

  const handleRemoveAccount = (e) => {
    e.stopPropagation();
    try {
      localStorage.removeItem('edulink_last_account');
      setLastAccount(null);
    } catch (e) {}
  };

  const handleQuickLogin = () => {
    if (lastAccount) {
      onSelectAccount?.(lastAccount);
    } else {
      onLogin?.();
    }
  };

  const initials = lastAccount?.name
    ? lastAccount.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <main
      className="auth-screen portal-gateway-container"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'calc(24px + env(safe-area-inset-top, 0px)) 20px calc(28px + env(safe-area-inset-bottom, 0px)) 20px',
        background: '#ffffff',
        boxSizing: 'border-box',
        maxWidth: '460px',
        margin: '0 auto',
        userSelect: 'none'
      }}
    >
      {/* Invisible spacer for balanced vertical centering */}
      <div style={{ height: '24px', width: '100%' }} />

      {/* Center Section: Logo + App Name + Account Card */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          flex: 1,
          padding: '20px 0'
        }}
      >
        {/* App Logo placed at center */}
        <div
          style={{
            width: '96px',
            height: '96px',
            borderRadius: '24px',
            boxShadow: '0 12px 32px rgba(10, 37, 64, 0.16)',
            overflow: 'hidden',
            marginBottom: '16px',
            background: '#ffffff',
            display: 'grid',
            placeItems: 'center'
          }}
        >
          <img
            src="/edulink-logo.jpg"
            alt="EduLink Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        </div>

        <h1
          style={{
            fontSize: '28px',
            fontWeight: 800,
            color: '#061626',
            margin: '0 0 28px 0',
            letterSpacing: '-0.02em',
            textAlign: 'center'
          }}
        >
          EduLink
        </h1>

        {/* Facebook-style Returning Account Card */}
        {lastAccount ? (
          <div
            style={{
              width: '100%',
              maxWidth: '340px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '20px',
              boxShadow: '0 10px 30px rgba(10, 37, 64, 0.08)',
              position: 'relative',
              animation: 'fadeIn 0.25s ease'
            }}
          >
            {/* Remove account button */}
            <button
              type="button"
              onClick={handleRemoveAccount}
              title="Remove account from this device"
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                display: 'grid',
                placeItems: 'center',
                color: '#64748b',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <X size={14} />
            </button>

            {/* Profile Row */}
            <div
              onClick={handleQuickLogin}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                cursor: 'pointer',
                marginBottom: '18px'
              }}
            >
              {lastAccount.avatar ? (
                <img
                  src={lastAccount.avatar}
                  alt={lastAccount.name}
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #e2e8f0'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: '#eaf1f8',
                    color: '#0a2540',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                    fontSize: '18px'
                  }}
                >
                  {initials}
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#061626',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {lastAccount.name}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                  {lastAccount.role === 'lecturer' ? 'Lecturer' : 'Student'} ID: <strong>{lastAccount.id}</strong>
                </div>
              </div>
            </div>

            {/* Primary Log In Button */}
            <button
              type="button"
              onClick={handleQuickLogin}
              style={{
                width: '100%',
                height: '48px',
                background: '#0a2540',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(10, 37, 64, 0.2)'
              }}
            >
              <span>Log In</span>
              <ArrowRight size={16} />
            </button>

            {/* Log into another account */}
            <button
              type="button"
              onClick={() => onLogin?.()}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: '#0a2540',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '14px',
                padding: '6px'
              }}
            >
              Log into another account
            </button>
          </div>
        ) : (
          /* Standard Returning User Options */
          <div
            style={{
              width: '100%',
              maxWidth: '340px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <button
              type="button"
              onClick={() => onLogin?.()}
              style={{
                width: '100%',
                height: '52px',
                background: '#0a2540',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 8px 22px rgba(10, 37, 64, 0.22)'
              }}
            >
              <LogIn size={18} />
              <span>Log In</span>
            </button>

            <button
              type="button"
              onClick={() => onRegister?.()}
              style={{
                width: '100%',
                height: '48px',
                background: '#ffffff',
                border: '1px solid #d7e1ec',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#38516c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <UserPlus size={16} />
              <span>Create New Account</span>
            </button>
          </div>
        )}
      </section>

      {/* Bottom Section: Exactly like Facebook "from Meta" */}
      <footer
        style={{
          width: '100%',
          textAlign: 'center',
          paddingTop: '16px'
        }}
      >
        <span
          style={{
            fontSize: '13.5px',
            color: '#64748b',
            fontWeight: 500,
            letterSpacing: '0.02em',
            display: 'inline-block'
          }}
        >
          Lecturer and Student Portal
        </span>
      </footer>
    </main>
  );
}
