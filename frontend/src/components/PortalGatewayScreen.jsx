import React, { useEffect } from 'react';

export default function PortalGatewayScreen({ onFinish, onLogin }) {
  const proceedToLogin = onFinish || onLogin;

  useEffect(() => {
    // Automatically transition to the login screen after brief launch presentation
    const timer = setTimeout(() => {
      proceedToLogin?.();
    }, 1900);

    return () => clearTimeout(timer);
  }, [proceedToLogin]);

  return (
    <main
      onClick={() => proceedToLogin?.()}
      className="auth-screen portal-launch-screen"
      style={{
        minHeight: '100dvh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'calc(env(safe-area-inset-top, 24px) + 20px) 24px calc(env(safe-area-inset-bottom, 24px) + 24px)',
        background: '#ffffff',
        boxSizing: 'border-box',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        animation: 'launchFadeIn 0.35s ease-out'
      }}
    >
      {/* Top Balancing Spacer */}
      <div style={{ height: '32px', width: '100%' }} />

      {/* Center Focal: App Logo + App Title + Subtle Launch Indicator */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          flex: 1
        }}
      >
        <div
          style={{
            width: '108px',
            height: '108px',
            borderRadius: '26px',
            boxShadow: '0 16px 40px rgba(10, 37, 64, 0.14)',
            overflow: 'hidden',
            marginBottom: '20px',
            background: '#ffffff',
            display: 'grid',
            placeItems: 'center',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            transform: 'scale(1)',
            transition: 'transform 0.2s ease'
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
            fontSize: '30px',
            fontWeight: 800,
            color: '#061626',
            margin: '0 0 14px 0',
            letterSpacing: '-0.03em'
          }}
        >
          EduLink
        </h1>

        {/* Minimal Launch Pulse Line */}
        <div
          style={{
            width: '44px',
            height: '3px',
            borderRadius: '99px',
            background: 'linear-gradient(90deg, #0a2540 0%, #3b82f6 100%)',
            opacity: 0.85,
            animation: 'launchPulse 1.2s ease-in-out infinite'
          }}
        />
      </section>

      {/* Bottom Message Anchored firmly */}
      <footer
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          paddingBottom: '8px'
        }}
      >
        <p
          style={{
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.8px',
            color: '#64748b',
            textTransform: 'uppercase',
            margin: 0
          }}
        >
          Lecturer and Student Portal
        </p>
      </footer>

      <style>{`
        @keyframes launchFadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes launchPulse {
          0% { transform: scaleX(0.7); opacity: 0.5; }
          50% { transform: scaleX(1.3); opacity: 1; }
          100% { transform: scaleX(0.7); opacity: 0.5; }
        }
      `}</style>
    </main>
  );
}
