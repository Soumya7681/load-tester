'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';

export function DeleteReportButton({ id, redirectTo, label = false }: { id: string; redirectTo?: string; label?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm('Delete this report? The saved results file is removed and cannot be recovered.')) return;
    setBusy(true);
    const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) return window.alert('Could not delete the report. It may already be gone.');
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      aria-label="Delete report"
      className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-sm text-muted transition-colors hover:bg-fail-soft hover:text-fail disabled:opacity-50"
    >
      <Trash2 className="size-4" aria-hidden />
      {label && 'Delete'}
    </button>
  );
}
