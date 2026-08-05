'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import './api-docs.css';

declare global {
  interface Window {
    SwaggerUIBundle?: (opts: Record<string, unknown>) => void;
  }
}

type DocsFilter = 'all' | 'Auth' | 'Platform' | 'Tenant' | 'Health';

const FILTERS: { id: DocsFilter; label: string }[] = [
  { id: 'all', label: 'All APIs' },
  { id: 'Auth', label: 'Auth' },
  { id: 'Platform', label: 'Platform' },
  { id: 'Tenant', label: 'Tenant admin' },
  { id: 'Health', label: 'Health' },
];

function matchesFilter(tagText: string, filter: DocsFilter) {
  if (filter === 'all') return true;
  if (filter === 'Auth') return /auth/i.test(tagText);
  if (filter === 'Platform') return /platform/i.test(tagText);
  if (filter === 'Tenant') return /tenant/i.test(tagText);
  if (filter === 'Health') return /health/i.test(tagText);
  return true;
}

/**
 * Professional API documentation shell around OpenAPI (/openapi.json).
 */
export default function ApiDocsPage() {
  const [filter, setFilter] = useState<DocsFilter>('Platform');
  const [ready, setReady] = useState(false);
  const uiReady = useRef(false);

  const authSnippet = useMemo(
    () =>
      `curl -X POST http://localhost:3000/api/v1/auth/session \\
  -H "Content-Type: application/json" \\
  -c cookies.txt \\
  -d '{"email":"super@buildx.com","password":"password123"}'`,
    []
  );

  useEffect(() => {
    if (uiReady.current) return;
    uiReady.current = true;

    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css';
    document.head.appendChild(css);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js';
    script.async = true;
    script.onload = () => {
      if (!window.SwaggerUIBundle) return;
      window.SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        persistAuthorization: true,
        tryItOutEnabled: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        defaultModelsExpandDepth: 0,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        filter: false,
      });
      setReady(true);
    };
    document.body.appendChild(script);

    return () => {
      css.remove();
      script.remove();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const root = document.getElementById('swagger-ui');
    if (!root) return;

    const apply = () => {
      const tags = root.querySelectorAll('.opblock-tag-section');
      tags.forEach((section) => {
        const label =
          section.querySelector('.opblock-tag')?.textContent?.trim() ||
          section.querySelector('h3')?.textContent?.trim() ||
          '';
        (section as HTMLElement).style.display = matchesFilter(label, filter) ? '' : 'none';
      });
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [filter, ready]);

  return (
    <div className="docs-root">
      <div className="docs-shell">
        <div className="docs-topbar">
          <div className="docs-brand">
            <div className="docs-mark">BX</div>
            <div className="docs-brand-copy">
              <strong>BuildX API</strong>
              <span>Hippo Cloud Technologies · Phase 0 / 1</span>
            </div>
          </div>
          <div className="docs-top-actions">
            <a className="docs-chip" href="/openapi.json" target="_blank" rel="noreferrer">
              openapi.json
            </a>
            <a className="docs-chip" href="/login">
              Central login
            </a>
            <a className="docs-btn docs-btn-primary" href="/platform">
              Platform console
            </a>
          </div>
        </div>

        <section className="docs-hero">
          <div className="docs-card docs-hero-main">
            <div className="docs-kicker">Developer reference</div>
            <h1>HTTP APIs for platform operators and tenant admins</h1>
            <p>
              Cookie-based JWT auth, schema-per-tenant isolation, and audited admin mutations.
              Use this page to explore every current endpoint, try authenticated calls, and align UI
              work with the backend contract.
            </p>
            <div className="docs-meta">
              <div className="docs-meta-item">
                <label>Base URL</label>
                <strong>http://localhost:3000</strong>
              </div>
              <div className="docs-meta-item">
                <label>Auth</label>
                <strong>cookie · bearer</strong>
              </div>
              <div className="docs-meta-item">
                <label>Spec</label>
                <strong>OpenAPI 3.0.3</strong>
              </div>
              <div className="docs-meta-item">
                <label>Version</label>
                <strong>0.1.0</strong>
              </div>
            </div>
          </div>

          <aside className="docs-card docs-side">
            <h2>Start here</h2>
            <ol className="docs-steps">
              <li>
                <span className="docs-step-num">1</span>
                <span>Call <strong>POST /api/v1/auth/session</strong> with email + password.</span>
              </li>
              <li>
                <span className="docs-step-num">2</span>
                <span>Browser clients must use <strong>credentials: &apos;include&apos;</strong>.</span>
              </li>
              <li>
                <span className="docs-step-num">3</span>
                <span>Platform UI → <code>/api/v1/platform/*</code>, tenant UI → <code>/api/v1/admin/*</code>.</span>
              </li>
              <li>
                <span className="docs-step-num">4</span>
                <span>Read <code>docs/UI-BACKEND-GUIDE.md</code> for screen-to-API mapping.</span>
              </li>
            </ol>
            <pre className="docs-code">{authSnippet}</pre>
          </aside>
        </section>

        <div className="docs-section-title">Platform Tenants · core APIs</div>
        <div className="docs-featured">
          <div className="docs-featured-card">
            <div>
              <span className="method get">GET</span>
              <span className="path">/api/v1/platform/tenants</span>
            </div>
            <p>List all tenants for the platform console. Requires platform JWT.</p>
          </div>
          <div className="docs-featured-card">
            <div>
              <span className="method post">POST</span>
              <span className="path">/api/v1/platform/tenants</span>
            </div>
            <p>Create + provision schema, seed admin, return credentials, send Brevo invite.</p>
          </div>
          <div className="docs-featured-card">
            <div>
              <span className="method get">GET</span>
              <span className="path">/api/v1/platform/tenants/{'{id}'}</span>
            </div>
            <p>Get one tenant with subscription and usage limits.</p>
          </div>
          <div className="docs-featured-card">
            <div>
              <span className="method patch">PATCH</span>
              <span className="path">/api/v1/platform/tenants/{'{id}'}</span>
            </div>
            <p>Update company/contact/admin profile fields on the control-plane row.</p>
          </div>
          <div className="docs-featured-card">
            <div>
              <span className="method post">POST</span>
              <span className="path">/api/v1/platform/tenants/{'{id}'}</span>
            </div>
            <p>Retry provisioning when tenant is not yet active.</p>
          </div>
          <div className="docs-featured-card">
            <div>
              <span className="method post">POST</span>
              <span className="path">/api/v1/platform/tenants/{'{id}'}/suspend</span>
            </div>
            <p>Suspend or resume tenant (`action`: suspend | resume).</p>
          </div>
        </div>

        <div className="docs-toolbar">
          <div className="docs-filters" role="tablist" aria-label="API groups">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`docs-filter${filter === item.id ? ' active' : ''}`}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <a className="docs-chip" href="https://github.com/anandkona/Hippo_BuildX/blob/dev2/docs/UI-BACKEND-GUIDE.md" target="_blank" rel="noreferrer">
            UI backend guide
          </a>
        </div>

        <div className="docs-swagger-wrap">
          <div id="swagger-ui" />
        </div>

        <p className="docs-footer">
          BuildX API docs · generated from <code>public/openapi.json</code>
        </p>
      </div>
    </div>
  );
}
