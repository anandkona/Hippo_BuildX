import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BuildX API Documentation',
  description: 'Professional OpenAPI reference for BuildX platform and tenant admin APIs',
};

export default function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
