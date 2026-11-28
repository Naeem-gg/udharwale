import type { Metadata } from 'next';
import BillSplitView from '@/app/components/BillSplitView';
import { decodeBill, formatInr, settleBill } from '@/lib/bill-split';
import { absoluteUrl } from '@/lib/seo';

type SplitPageProps = {
  searchParams: Promise<{ b?: string | string[] }>;
};

function firstCode(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) || '';
}

export async function generateMetadata({ searchParams }: SplitPageProps): Promise<Metadata> {
  const params = await searchParams;
  const draft = decodeBill(firstCode(params.b));
  const url = absoluteUrl('/split');

  if (!draft) {
    return {
      title: 'Split a bill',
      description:
        'Split a dinner bill equally, see who owes whom, and share a link so the table can settle up without arguing.',
      alternates: { canonical: url },
      openGraph: {
        title: 'Split a bill | Udharwale',
        description: 'Fair shares and the fewest payments that settle a shared bill.',
        url,
      },
    };
  }

  const result = settleBill(draft);
  const title = `${draft.title} · ₹${formatInr(draft.total)} for ${draft.people.length}`;
  const description = result.balanced
    ? result.transfers.length
      ? result.transfers.map((transfer) => `${transfer.from} pays ${transfer.to} ₹${formatInr(transfer.amount)}`).join(' · ')
      : `${draft.title} is already even.`
    : `${draft.title} bill of ₹${formatInr(draft.total)}.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: false, follow: false },
    openGraph: {
      title: `${title} | Udharwale`,
      description,
      url,
    },
  };
}

export default function SplitPage() {
  return (
    <main className="fixed inset-0 overflow-hidden" style={{ background: 'var(--bg-raised)' }}>
      <div className="flex h-full justify-center">
        <div
          className="flex h-full w-full max-w-md flex-col"
          style={{
            background: 'var(--bg-base)',
            borderInline: '1px solid var(--border-soft)',
          }}
        >
          <BillSplitView standalone />
        </div>
      </div>
    </main>
  );
}
