'use client';

import { FormEvent, useEffect, useState, type CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/** Hardcoded colors so fields stay visible even when Ant Design dark mode is on */
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

type InvitePreview = {
  email: string;
  name: string;
  companyName: string;
  workspace: string;
  expiresAt: string;
};

function BrandMark({ size = 28 }: { size?: number }) {
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
        lineHeight: 1,
      }}
      aria-label="Hippo buildX"
    >
      <span style={{ fontSize: size, color: ui.primary }}>Hippo</span>
      <span style={{ fontSize: size, color: ui.accent }}>build</span>
      <span style={{ fontSize: size + 6, color: ui.accent }}>X</span>
    </div>
  );
}

export default function InviteAcceptForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setError('Missing invite token. Open the link from your email.');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/v1/auth/invite?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invalid invite');
        if (!cancelled) {
          setPreview(data);
          setName(data.name || '');
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Invalid invite');
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
      const res = await fetch('/api/v1/auth/invite/accept', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not set password');
      router.replace(data.redirectTo || '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set password');
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
        color: ui.text,
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
          position: 'absolute',
          bottom: -96,
          right: -96,
          width: 384,
          height: 384,
          borderRadius: '50%',
          background: ui.accent,
          opacity: 0.2,
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
          color: ui.text,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <BrandMark />
          <div
            style={{
              marginTop: 14,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: ui.primary,
              textTransform: 'uppercase',
            }}
          >
            Workspace invitation
          </div>
          <h1 style={{ margin: '8px 0 0', fontSize: 22, color: ui.text, fontWeight: 700 }}>
            Create your password
          </h1>
          <p style={{ margin: '8px 0 0', color: ui.muted, fontSize: 14, lineHeight: 1.5 }}>
            Choose your own password to activate tenant admin access. We never email passwords.
          </p>
        </div>

        {loading && <p style={{ marginTop: 8, color: ui.muted, textAlign: 'center' }}>Loading invite…</p>}

        {!loading && preview && (
          <>
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: ui.soft,
                border: `1px solid ${ui.border}`,
                fontSize: 13,
                lineHeight: 1.65,
                color: ui.text,
              }}
            >
              <div>
                <span style={{ color: ui.muted }}>Company </span>
                <strong style={{ color: ui.text }}>{preview.companyName}</strong>
              </div>
              <div>
                <span style={{ color: ui.muted }}>Workspace </span>
                <strong style={{ color: ui.text, fontFamily: 'Consolas, monospace' }}>{preview.workspace}</strong>
              </div>
              <div>
                <span style={{ color: ui.muted }}>Email </span>
                <strong style={{ color: ui.text }}>{preview.email}</strong>
              </div>
            </div>

            <form onSubmit={onSubmit} style={{ marginTop: 18, display: 'grid', gap: 14 }}>
              <label style={labelStyle}>
                Your name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                New password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                Confirm password
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  style={inputStyle}
                />
              </label>
              {error && (
                <div
                  style={{
                    color: ui.danger,
                    background: ui.dangerBg,
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: 4,
                  border: 0,
                  borderRadius: 10,
                  padding: '12px 14px',
                  background: ui.primary,
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: submitting ? 'wait' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(29, 78, 216, 0.35)',
                }}
              >
                {submitting ? 'Saving…' : 'Set password & continue'}
              </button>
            </form>
          </>
        )}

        {!loading && !preview && (
          <div
            style={{
              marginTop: 8,
              color: ui.danger,
              background: ui.dangerBg,
              borderRadius: 8,
              padding: '12px 14px',
              fontSize: 13,
            }}
          >
            {error || 'Invite not available'}
          </div>
        )}
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
  fontWeight: 500,
  color: ui.text,
  background: ui.inputBg,
  outline: 'none',
  boxSizing: 'border-box',
  WebkitTextFillColor: ui.text,
  caretColor: ui.text,
};
