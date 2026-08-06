'use client';

import { FormEvent, useEffect, useState, type CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type InvitePreview = {
  email: string;
  name: string;
  companyName: string;
  workspace: string;
  expiresAt: string;
};

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
        background: 'linear-gradient(180deg, #eef3fb 0%, #f8fafc 60%)',
        fontFamily: 'Segoe UI, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          padding: 28,
          boxShadow: '0 16px 40px rgba(15,39,68,0.08)',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#2563eb', textTransform: 'uppercase' }}>
          BuildX invite
        </div>
        <h1 style={{ margin: '8px 0 0', fontSize: 24, color: '#0f172a' }}>Create your password</h1>
        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
          Choose your own password to activate tenant admin access. We never email passwords.
        </p>

        {loading && <p style={{ marginTop: 20, color: '#64748b' }}>Loading invite…</p>}

        {!loading && preview && (
          <>
            <div
              style={{
                marginTop: 18,
                padding: 12,
                borderRadius: 10,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              <div>
                <span style={{ color: '#64748b' }}>Company </span>
                <strong>{preview.companyName}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Workspace </span>
                <strong style={{ fontFamily: 'Consolas, monospace' }}>{preview.workspace}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Email </span>
                <strong>{preview.email}</strong>
              </div>
            </div>

            <form onSubmit={onSubmit} style={{ marginTop: 18, display: 'grid', gap: 12 }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
                Your name
                <input value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
                New password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  style={inputStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
                Confirm password
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  style={inputStyle}
                />
              </label>
              {error && (
                <div style={{ color: '#b91c1c', background: '#fef2f2', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
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
                  background: '#2563eb',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {submitting ? 'Saving…' : 'Set password & continue'}
              </button>
            </form>
          </>
        )}

        {!loading && !preview && (
          <div style={{ marginTop: 18, color: '#b91c1c', background: '#fef2f2', borderRadius: 8, padding: '12px 14px', fontSize: 13 }}>
            {error || 'Invite not available'}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  border: '1px solid #d1d5db',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  fontWeight: 500,
};
