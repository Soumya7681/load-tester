'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Client only: the dashboard restores the last form from localStorage and lives on a
// live event stream, so server rendering it adds nothing and risks hydration mismatch.
export const DashboardLoader = dynamic(() => import('./Dashboard').then((m) => m.Dashboard), {
  ssr: false,
  loading: () => (
    <p className="flex items-center gap-2 py-10 text-sm text-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden /> Loading dashboard…
    </p>
  ),
});
