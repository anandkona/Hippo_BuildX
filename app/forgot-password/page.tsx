'use client';

import { FormEvent, Suspense, useState, type CSSProperties } from 'react';
import Link from 'next/link';

const ui = {
  pageBg: '#082F49',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#D7E0EC',
  inputBg: '#F8FAFC',
  primary: '#1D4ED8',
  accent: '#EF4444',
  danger: '#B91C1C',
  dangerBg: '#FEE2E2',
  success: '#15803D',
  successBg: '#ECFDF5',
  glow: '#1D4ED8',
};

function BrandMark() {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 4,
        fontWeight: 900,
        fontStyle: 'italic',
        letterSpacing: '-0.04em',
        fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
      }}
    >
      <span style={{ fontSize: 28, color: ui.primary }}>Hippo</span>
      <span style={{ fontSize: 28, color: ui.accent }}>build</span>
      <span style={{ fontSize: 34, color: ui.accent }}>X</span>
    </div>
  );
}

function ForgotForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [debugUrl, setDebugUrl] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setDebugUrl('');
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setMessage(data.message || 'Check your email for a reset link.');
      if (data.debugResetUrl) setDebugUrl(data.debugResetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <BrandMark />
        <h1 style={{ fontSize: 20, fontWeight: 700, color: ui.text, margin: '14px 0 0' }}>Forgot password</h1>
        <p style={{ fontSize: 14, marginTop: 6, color: ui.muted, marginBottom: 0 }}>
          Enter your account email and we’ll send a reset link.
        </p>
      </div>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
        <label style={labelStyle}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            style={inputStyle}
            autoComplete="email"
          />
        </label>

        {error && <div style={errorBox}>{error}</div>}
        {message && <div style={successBox}>{message}</div>}
        {debugUrl && (
          <div style={{ ...successBox, wordBreak: 'break-all', fontSize: 12 }}>
            Dev link:{' '}
            <a href={debugUrl} style={{ color: ui.primary }}>
              {debugUrl}
            </a>
          </div>
        )}

        <button type="submit" disabled={loading} style={buttonStyle(loading)}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p style={{ marginTop: 18, textAlign: 'center', fontSize: 14, color: ui.muted }}>
        <Link href="/login" style={{ color: ui.primary, fontWeight: 600, textDecoration: 'none' }}>
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: ui.pageBg }} />}>
      <ForgotForm />
    </Suspense>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
        background: ui.pageBg,
        fontFamily: 'Segoe UI, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -96,
          left: -96,
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: ui.glow,
          opacity: 0.28,
          filter: 'blur(64px)',
        }}
      />
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: ui.card,
          border: `1px solid ${ui.border}`,
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}

const labelStyle: CSSProperties = {
  display: 'grid',
  gap: 6,
  fontSize: 14,
  fontWeight: 600,
  color: ui.text,
};

const inputStyle: CSSProperties = {
  width: '100%',
  border: `1px solid ${ui.border}`,
  borderRadius: 10,
  padding: '12px 14px',
  fontSize: 15,
  color: ui.text,
  background: ui.inputBg,
  outline: 'none',
  boxSizing: 'border-box',
  WebkitTextFillColor: ui.text,
};

const errorBox: CSSProperties = {
  fontSize: 14,
  padding: '10px 12px',
  borderRadius: 8,
  background: ui.dangerBg,
  color: ui.danger,
};

const successBox: CSSProperties = {
  fontSize: 14,
  padding: '10px 12px',
  borderRadius: 8,
  background: ui.successBg,
  color: ui.success,
};

function buttonStyle(loading: boolean): CSSProperties {
  return {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 10,
    border: 'none',
    fontWeight: 600,
    fontSize: 15,
    color: '#FFFFFF',
    background: ui.primary,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.65 : 1,
  };
}
