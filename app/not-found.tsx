import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-display text-2xl">Not found</h1>
      <p className="mt-2 text-sm text-muted">This report does not exist or was deleted.</p>
      <Link href="/reports" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
        Back to reports
      </Link>
    </div>
  );
}
