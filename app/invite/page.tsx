'use client';

import { Suspense } from 'react';
import InviteAcceptForm from './InviteAcceptForm';

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#64748b' }}>
          Loading invite…
        </div>
      }
    >
      <InviteAcceptForm />
    </Suspense>
  );
}
