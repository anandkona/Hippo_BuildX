'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    SwaggerUIBundle?: (opts: Record<string, unknown>) => void;
  }
}

/**
 * Interactive API docs (Swagger UI) driven by /openapi.json
 */
export default function ApiDocsPage() {
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

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
      });
    };
    document.body.appendChild(script);

    return () => {
      css.remove();
      script.remove();
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      <header
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          background: '#0f2744',
          color: '#fff',
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: '0.08em', opacity: 0.8, textTransform: 'uppercase' }}>
          BuildX
        </div>
        <h1 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700 }}>API reference</h1>
        <p style={{ margin: '8px 0 0', fontSize: 14, opacity: 0.85 }}>
          OpenAPI spec: <a href="/openapi.json" style={{ color: '#93c5fd' }}>/openapi.json</a>
          {' · '}
          UI guide: <code style={{ color: '#e2e8f0' }}>docs/UI-BACKEND-GUIDE.md</code>
        </p>
      </header>
      <div id="swagger-ui" />
    </div>
  );
}
