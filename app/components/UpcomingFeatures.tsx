'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Download, MessageCircle, Sparkles } from 'lucide-react';

export default function UpcomingFeatures() {
  const features = [
    {
      id: 'pwa',
      title: 'Install as App (PWA)',
      description: 'Install Udharwale by Naeem Navjivan directly to your home screen for quick access, just like a native app.',
      icon: <Smartphone className="w-5 h-5 text-indigo-400" />,
      color: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      id: 'export',
      title: 'Data Export',
      description: 'Download your entire transaction history as a PDF or CSV file for your records.',
      icon: <Download className="w-5 h-5 text-emerald-400" />,
      color: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp Reminders',
      description: 'Send quick, automated reminders to your contacts directly via WhatsApp.',
      icon: <MessageCircle className="w-5 h-5 text-green-400" />,
      color: 'bg-green-500/10 border-green-500/20',
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="text-center space-y-2 mb-8">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-full mb-2"
        >
          <Sparkles className="w-8 h-8 text-indigo-400" />
        </motion.div>
        <h2 className="text-2xl md:text-3xl font-black text-white">Upcoming Features</h2>
        <p className="text-zinc-400 text-sm md:text-base max-w-lg mx-auto">
          We are constantly working to make Udharwale by Naeem Navjivan smoother and more powerful. Here is a sneak peek at what is coming next!
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {features.map((feature, i) => (
          <motion.div
            key={feature.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-5 rounded-2xl border ${feature.color} backdrop-blur-sm relative overflow-hidden group`}
          >
            <div className="absolute top-0 right-0 p-3">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-900/50 text-zinc-300 border border-zinc-700">
                Coming Soon
              </span>
            </div>
            
            <div className="mb-4 p-3 bg-zinc-900/50 rounded-xl inline-block">
              {feature.icon}
            </div>
            
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
              {feature.title}
            </h3>
            
            <p className="text-sm text-zinc-400 leading-relaxed">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
