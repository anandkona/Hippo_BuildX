'use client';

import { FormEvent, Suspense, useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

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
  soft: '#F1F5F9',
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

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [valid, setValid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setError('Missing reset token. Open the link from your email.');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/v1/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invalid reset link');
        if (!cancelled) {
          setEmail(data.email || '');
          setValid(true);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Invalid reset link');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not reset password');
      router.replace(data.redirectTo || '/login?reset=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password');
    } finally {
      setSubmitting(false);
    }
  }

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
          maxWidth: 440,
          background: ui.card,
          border: `1px solid ${ui.border}`,
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <BrandMark />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: ui.text, margin: '14px 0 0' }}>
            Reset password
          </h1>
          <p style={{ fontSize: 14, marginTop: 6, color: ui.muted, marginBottom: 0 }}>
            Choose a new password for your account.
          </p>
        </div>

        {loading && <p style={{ color: ui.muted, textAlign: 'center' }}>Checking link…</p>}

        {!loading && valid && (
          <>
            <div
              style={{
                padding: 12,
                borderRadius: 10,
                background: ui.soft,
                border: `1px solid ${ui.border}`,
                fontSize: 13,
                marginBottom: 16,
                color: ui.text,
              }}
            >
              <span style={{ color: ui.muted }}>Account </span>
              <strong>{email}</strong>
            </div>
            <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
              <label style={labelStyle}>
                New password
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                Confirm password
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  style={inputStyle}
                />
              </label>
              {error && <div style={errorBox}>{error}</div>}
              <button type="submit" disabled={submitting} style={buttonStyle(submitting)}>
                {submitting ? 'Saving…' : 'Update password'}
              </button>
            </form>
          </>
        )}

        {!loading && !valid && (
          <div style={errorBox}>{error || 'Reset link not available'}</div>
        )}

        <p style={{ marginTop: 18, textAlign: 'center', fontSize: 14, color: ui.muted }}>
          <Link href="/login" style={{ color: ui.primary, fontWeight: 600, textDecoration: 'none' }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: ui.pageBg }} />}>
      <ResetForm />
    </Suspense>
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
