'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BellRing, Camera, Repeat2, Share2, Smartphone, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function UpcomingFeatures() {
  const features = [
    {
      id: 'pwa',
      title: 'Install as App',
      description: 'Add Udharwale to your home screen with offline shell support and faster repeat access.',
      icon: Smartphone,
      tone: '#818cf8',
      status: 'Next',
    },
    {
      id: 'reminders',
      title: 'Smart Due Dates',
      description: 'Attach due dates to balances and surface timely reminders before payments become awkward.',
      icon: BellRing,
      tone: '#22d3ee',
      status: 'Planned',
    },
    {
      id: 'receipt-attachments',
      title: 'Receipt Attachments',
      description: 'Attach bill photos or screenshots to transactions so every balance has proof and context.',
      icon: Camera,
      tone: '#34d399',
      status: 'Planned',
    },
    {
      id: 'shared-ledgers',
      title: 'Shared Ledger Links',
      description: 'Create read-only ledger links for trusted contacts so both sides can review the same history.',
      icon: Share2,
      tone: '#f59e0b',
      status: 'Idea',
    },
    {
      id: 'recurring-balances',
      title: 'Recurring Entries',
      description: 'Automatically add repeated rent, subscriptions, advances, or monthly repayments.',
      icon: Repeat2,
      tone: '#f472b6',
      status: 'Idea',
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="text-center space-y-2 mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="inline-flex items-center justify-center p-3 rounded-full mb-2"
          style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
        >
          <Sparkles className="w-8 h-8" />
        </motion.div>
        <h2 className="text-2xl md:text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
          Product Roadmap
        </h2>
        <p className="text-sm md:text-base max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
          The basics are in place. These are the next upgrades that would make daily ledger work smoother.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {features.map(({ id, title, description, icon: Icon, tone, status }, i) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="h-full border-primary/15 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="mb-4 inline-flex rounded-xl p-3"
                    style={{ background: `${tone}1a`, color: tone }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary">{status}</Badge>
                </div>

                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {title}
                </h3>

                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
