'use client';

import React from 'react';
import { BellRing, Camera, Repeat2, Share2, Smartphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function UpcomingFeatures() {
  const features = [
    {
      id: 'pwa',
      title: 'Install as App',
      description: 'Add Udharwale to your home screen with offline shell support and faster repeat access.',
      icon: Smartphone,
      status: 'Live',
    },
    {
      id: 'reminders',
      title: 'Smart Due Dates',
      description: 'Attach due dates to balances and surface timely reminders before payments become awkward.',
      icon: BellRing,
      status: 'Live',
    },
    {
      id: 'receipt-attachments',
      title: 'Receipt Attachments',
      description: 'Attach bill photos or screenshots to transactions so every balance has proof and context.',
      icon: Camera,
      status: 'Next',
    },
    {
      id: 'shared-ledgers',
      title: 'Shared Ledger Links',
      description: 'Create read-only ledger links for trusted contacts so both sides can review the same history.',
      icon: Share2,
      status: 'Live',
    },
    {
      id: 'recurring-balances',
      title: 'Recurring Entries',
      description: 'Automatically add repeated rent, subscriptions, advances, or monthly repayments.',
      icon: Repeat2,
      status: 'Idea',
    },
  ];

  return (
    <div className="w-full space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Product roadmap
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          What is live today, and what is coming next.
        </p>
      </div>

      <div className="space-y-3">
        {features.map(({ id, title, description, icon: Icon, status }) => (
          <Card key={id} className="border-[var(--border-soft)] bg-[var(--bg-surface)]">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className="inline-flex rounded-xl p-2.5 shrink-0"
                  style={{ background: 'var(--accent)', color: 'var(--primary)' }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {title}
                    </h3>
                    <Badge variant="secondary">{status}</Badge>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
