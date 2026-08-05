"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FiRefreshCw, FiSave } from "react-icons/fi";

const SECTIONS = ["general", "email", "storage", "security", "notifications", "integrations", "backup"] as const;

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [active, setActive] = useState<string>("general");
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/platform/settings");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setSettings(data.settings || {});
      setForm(data.settings?.[active] || {});
    } finally {
      setLoading(false);
    }
  }, [active]);

  useEffect(() => { load(); }, []);
  useEffect(() => { setForm(settings[active] || {}); }, [active, settings]);

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/v1/platform/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: active, value: form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSettings(data.settings || {});
      setMessage(`${active} settings saved`);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !Object.keys(settings).length) {
    return <div className="py-20 text-center" style={{ color: "var(--ui-text-muted)" }}>Loading settings...</div>;
  }

  return (
    <div className="flex flex-col gap-6" data-testid="platform-settings">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">System Settings</h1>
          <p className="text-sm" style={{ color: "var(--ui-text-muted)" }}>Configure platform-wide preferences</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-2 border rounded-md text-sm flex items-center gap-2" style={{ borderColor: "var(--ui-border)" }}><FiRefreshCw /> Refresh</button>
          <button onClick={save} disabled={saving} className="px-4 py-2.5 rounded-md font-semibold flex items-center gap-2 shadow-md" style={{ background: "var(--ui-primary)", color: "#fff" }}>
            <FiSave /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border shadow-sm" style={{ background: "var(--ui-surface)", borderColor: "var(--ui-border)" }}>
        <div className="flex flex-wrap gap-1 border-b p-2" style={{ borderColor: "var(--ui-border)" }}>
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setActive(s)}
              className="px-3 py-2 rounded-md text-sm font-medium capitalize"
              style={{
                background: active === s ? "var(--ui-primary-soft)" : "transparent",
                color: active === s ? "var(--ui-primary)" : "var(--ui-text-muted)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="p-6 max-w-xl flex flex-col gap-4">
          {active === "general" && (
            <>
              <Field label="Platform Name" value={form.platformName} onChange={(v) => setForm({ ...form, platformName: v })} />
              <Field label="Platform URL" value={form.platformUrl} onChange={(v) => setForm({ ...form, platformUrl: v })} />
              <Field label="Support Email" value={form.supportEmail} onChange={(v) => setForm({ ...form, supportEmail: v })} />
              <Field label="Timezone" value={form.timezone} onChange={(v) => setForm({ ...form, timezone: v })} />
              <Field label="Date Format" value={form.dateFormat} onChange={(v) => setForm({ ...form, dateFormat: v })} />
              <Field label="Time Format" value={form.timeFormat} onChange={(v) => setForm({ ...form, timeFormat: v })} />
            </>
          )}
          {active === "email" && (
            <>
              <Field label="Provider" value={form.provider} onChange={(v) => setForm({ ...form, provider: v })} />
              <Field label="From Name" value={form.fromName} onChange={(v) => setForm({ ...form, fromName: v })} />
              <Field label="From Email" value={form.fromEmail} onChange={(v) => setForm({ ...form, fromEmail: v })} />
            </>
          )}
          {active === "storage" && (
            <>
              <Field label="Provider" value={form.provider} onChange={(v) => setForm({ ...form, provider: v })} />
              <Field label="Bucket" value={form.bucket} onChange={(v) => setForm({ ...form, bucket: v })} />
              <Field label="Region" value={form.region} onChange={(v) => setForm({ ...form, region: v })} />
            </>
          )}
          {active === "security" && (
            <>
              <Field label="Session Timeout (minutes)" value={String(form.sessionTimeoutMinutes ?? "")} onChange={(v) => setForm({ ...form, sessionTimeoutMinutes: Number(v) })} />
              <Field label="Password Min Length" value={String(form.passwordMinLength ?? "")} onChange={(v) => setForm({ ...form, passwordMinLength: Number(v) })} />
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={!!form.requireMfa} onChange={(e) => setForm({ ...form, requireMfa: e.target.checked })} />
                Require MFA
              </label>
            </>
          )}
          {active === "notifications" && (
            <>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={!!form.emailAlerts} onChange={(e) => setForm({ ...form, emailAlerts: e.target.checked })} />
                Email Alerts
              </label>
              <Field label="Slack Webhook" value={form.slackWebhook || ""} onChange={(v) => setForm({ ...form, slackWebhook: v })} />
            </>
          )}
          {active === "integrations" && (
            <Field label="Webhook Base URL" value={form.webhookBaseUrl || ""} onChange={(v) => setForm({ ...form, webhookBaseUrl: v })} />
          )}
          {active === "backup" && (
            <>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={!!form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
                Backups Enabled
              </label>
              <Field label="Schedule" value={form.schedule || ""} onChange={(v) => setForm({ ...form, schedule: v })} />
              <Field label="Retention Days" value={String(form.retentionDays ?? "")} onChange={(v) => setForm({ ...form, retentionDays: Number(v) })} />
            </>
          )}
          {message && <div className="text-sm" style={{ color: "var(--ui-success)" }}>{message}</div>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: any; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5">{label}</label>
      <input className="w-full p-2.5 border rounded-lg outline-none text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-transparent" style={{ borderColor: "var(--ui-border)", color: "var(--ui-text)" }} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
