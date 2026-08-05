import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BuildX API Docs',
  description: 'Swagger UI for BuildX Phase 0/1 APIs',
};

export default function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
