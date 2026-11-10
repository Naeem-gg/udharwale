'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Plus,
  Share2,
  Users,
  Compass,
  CreditCard,
  Split,
  MessageCircle,
  ReceiptText,
  ChevronDown,
  Trash2,
  Edit2,
  Check,
  Copy,
  Sparkles,
  Search,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  X,
  Calendar,
  AlertCircle,
  FolderPlus,
  Zap,
  MapPin,
  CheckCircle2,
  Clock,
  RotateCcw,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { Contact } from './types';
import {
  Trip,
  TripExpense,
  TripParticipant,
  TripSettlement,
  ExpenseCategory,
  ExpensePayer,
  ExpenseSplit,
  CATEGORY_CONFIG,
  calculateTripSummary,
  formatWhatsAppSummary,
  getDemoTrip,
} from './trip-types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'udharwale-trips-v1';

/* ─── Avatar color generator ─── */
const AVATAR_GRADIENTS = [
  'from-violet-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-cyan-500 to-blue-600',
  'from-fuchsia-500 to-purple-600',
];
function avatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

/* ─── Animated Number Counter ─── */
function Counter({ to, prefix = '', duration = 1.2 }: { to: number; prefix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });

  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      const pct = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - pct, 3);
      setVal(Math.round(eased * to));
      if (pct < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, to, duration]);

  return (
    <span ref={ref}>
      {prefix}{val.toLocaleString('en-IN')}
    </span>
  );
}

interface TripExpensesViewProps {
  contacts: Contact[];
  userName?: string;
  onRecordToLedger?: (contactId: string, amount: number, type: 'gave' | 'got', remark: string) => Promise<void>;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function TripExpensesView({
  contacts,
  userName = 'You',
  onRecordToLedger,
  showToast = () => {},
}: TripExpensesViewProps) {
  // Trips State
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'settlement' | 'expenses'>('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [settlementFilter, setSettlementFilter] = useState<'all' | 'pending' | 'settled'>('all');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'local'>('synced');

  // Modals
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAcknowledgeModalOpen, setIsAcknowledgeModalOpen] = useState(false);
  const [acknowledgingSettlement, setAcknowledgingSettlement] = useState<TripSettlement | null>(null);
  const [ackPaymentMethod, setAckPaymentMethod] = useState<'UPI' | 'Cash' | 'Bank Transfer' | 'Other'>('UPI');
  const [ackNote, setAckNote] = useState('');

  const [editingExpense, setEditingExpense] = useState<TripExpense | null>(null);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);
  const [publicShareUrl, setPublicShareUrl] = useState<string | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  // New Trip Form State
  const [newTripName, setNewTripName] = useState('');
  const [newTripDestination, setNewTripDestination] = useState('');
  const [newTripStartDate, setNewTripStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [customParticipantNames, setCustomParticipantNames] = useState<string>('');

  // Expense Form State
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('food');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expNotes, setExpNotes] = useState('');
  const [payerMode, setPayerMode] = useState<'single' | 'multiple'>('single');
  const [singlePayerId, setSinglePayerId] = useState<string>('');
  const [multiplePayers, setMultiplePayers] = useState<Record<string, string>>({});
  const [splitMode, setSplitMode] = useState<'all' | 'custom'>('all');
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<string[]>([]);

  // Load Trips on mount (from API with localStorage fallback)
  useEffect(() => {
    let loadedTrips: Trip[] = [];
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        loadedTrips = JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Failed to parse cached trips', e);
    }

    if (loadedTrips.length === 0) {
      const demo = getDemoTrip(userName, contacts);
      loadedTrips = [demo];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedTrips));
      } catch {}
    }

    setTrips(loadedTrips);
    if (!selectedTripId && loadedTrips.length > 0) {
      setSelectedTripId(loadedTrips[0].id);
    }

    // Try fetching from server
    fetch('/api/trips')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Trips API failed');
      })
      .then((remoteTrips: Trip[]) => {
        if (Array.isArray(remoteTrips) && remoteTrips.length > 0) {
          setTrips(remoteTrips);
          if (!selectedTripId) setSelectedTripId(remoteTrips[0].id);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteTrips));
          } catch {}
          setSyncStatus('synced');
        }
      })
      .catch(() => {
        setSyncStatus('local');
      });
  }, [userName, contacts]);

  // Selected Trip
  const currentTrip = useMemo(() => {
    return trips.find((t) => t.id === selectedTripId) || trips[0] || null;
  }, [trips, selectedTripId]);

  // Current Trip Calculations
  const tripSummary = useMemo(() => {
    if (!currentTrip) return null;
    return calculateTripSummary(currentTrip);
  }, [currentTrip]);

  // Save trips helper
  const saveTripsState = useCallback(
    async (updated: Trip[]) => {
      setTrips(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('LocalStorage save error:', err);
      }

      const activeTrip = updated.find((t) => t.id === selectedTripId);
      if (activeTrip) {
        setSyncStatus('saving');
        try {
          const res = await fetch(`/api/trips/${activeTrip.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(activeTrip),
          });
          if (res.ok) {
            setSyncStatus('synced');
          } else {
            setSyncStatus('local');
          }
        } catch {
          setSyncStatus('local');
        }
      }
    },
    [selectedTripId]
  );

  // Initialize Expense Form for Add or Edit
  const openAddExpenseModal = () => {
    if (!currentTrip) return;
    setEditingExpense(null);
    setExpTitle('');
    setExpCategory('food');
    setExpAmount('');
    setExpDate(new Date().toISOString().split('T')[0]);
    setExpNotes('');
    setPayerMode('single');
    const myPart = currentTrip.participants.find((p) => p.isCurrentUser) || currentTrip.participants[0];
    setSinglePayerId(myPart?.id || '');
    setMultiplePayers({});
    setSplitMode('all');
    setSelectedBeneficiaries(currentTrip.participants.map((p) => p.id));
    setIsExpenseModalOpen(true);
  };

  const openEditExpenseModal = (expense: TripExpense) => {
    if (!currentTrip) return;
    setEditingExpense(expense);
    setExpTitle(expense.title);
    setExpCategory(expense.category);
    setExpAmount(String(expense.amount));
    setExpDate(expense.date);
    setExpNotes(expense.notes || '');

    if (expense.paidBy.length > 1) {
      setPayerMode('multiple');
      const map: Record<string, string> = {};
      expense.paidBy.forEach((p) => {
        map[p.participantId] = String(p.amount);
      });
      setMultiplePayers(map);
    } else {
      setPayerMode('single');
      setSinglePayerId(expense.paidBy[0]?.participantId || '');
      setMultiplePayers({});
    }

    if (expense.splitAmong.length === currentTrip.participants.length) {
      setSplitMode('all');
    } else {
      setSplitMode('custom');
    }
    setSelectedBeneficiaries(expense.splitAmong.map((s) => s.participantId));
    setIsExpenseModalOpen(true);
  };

  // Multiple Payers Amount Validation & Helpers
  const parsedTotalAmount = Number(expAmount) || 0;
  const currentAssignedPayersTotal = useMemo(() => {
    if (payerMode === 'single') return parsedTotalAmount;
    return Object.values(multiplePayers).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  }, [payerMode, multiplePayers, parsedTotalAmount]);

  const payerRemainingBalance = Math.round((parsedTotalAmount - currentAssignedPayersTotal) * 100) / 100;
  const isPayerBalanced = parsedTotalAmount > 0 && Math.abs(payerRemainingBalance) < 0.01;

  // Handle Save Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTrip) return;

    const amt = Number(expAmount);
    if (!expTitle.trim() || isNaN(amt) || amt <= 0) {
      showToast('Please enter a valid title and amount.', 'error');
      return;
    }

    let paidBy: ExpensePayer[] = [];
    if (payerMode === 'single') {
      if (!singlePayerId) {
        showToast('Please select who paid this expense.', 'error');
        return;
      }
      paidBy = [{ participantId: singlePayerId, amount: amt }];
    } else {
      if (!isPayerBalanced) {
        showToast(`Payer amounts must sum to ${currentTrip.currency}${amt}. Remaining: ${currentTrip.currency}${payerRemainingBalance}`, 'error');
        return;
      }
      paidBy = Object.entries(multiplePayers)
        .filter(([, val]) => Number(val) > 0)
        .map(([id, val]) => ({ participantId: id, amount: Number(val) }));
    }

    const targetBeneficiaryIds =
      splitMode === 'all'
        ? currentTrip.participants.map((p) => p.id)
        : selectedBeneficiaries;

    if (targetBeneficiaryIds.length === 0) {
      showToast('Please select at least one person to split this with.', 'error');
      return;
    }

    const perHeadShare = Math.round((amt / targetBeneficiaryIds.length) * 100) / 100;
    const splitAmong: ExpenseSplit[] = targetBeneficiaryIds.map((id) => ({
      participantId: id,
      amount: perHeadShare,
    }));

    const expensePayload: TripExpense = {
      id: editingExpense ? editingExpense.id : 'exp_' + Date.now(),
      title: expTitle.trim(),
      category: expCategory,
      amount: amt,
      date: expDate,
      paidBy,
      splitType: splitMode === 'all' ? 'equal' : 'custom',
      splitAmong,
      notes: expNotes.trim(),
      createdAt: editingExpense ? editingExpense.createdAt : new Date().toISOString(),
    };

    let updatedExpenses: TripExpense[];
    if (editingExpense) {
      updatedExpenses = currentTrip.expenses.map((ex) =>
        ex.id === editingExpense.id ? expensePayload : ex
      );
    } else {
      updatedExpenses = [expensePayload, ...currentTrip.expenses];
    }

    const updatedTrip: Trip = {
      ...currentTrip,
      expenses: updatedExpenses,
      updatedAt: new Date().toISOString(),
    };

    const newTrips = trips.map((t) => (t.id === updatedTrip.id ? updatedTrip : t));
    await saveTripsState(newTrips);
    setIsExpenseModalOpen(false);
    showToast(editingExpense ? 'Expense updated!' : 'Expense added to chat! 💸', 'success');
  };

  // Delete Expense
  const handleDeleteExpense = async (expenseId: string) => {
    if (!currentTrip) return;
    const updatedExpenses = currentTrip.expenses.filter((ex) => ex.id !== expenseId);
    const updatedTrip: Trip = { ...currentTrip, expenses: updatedExpenses };
    const newTrips = trips.map((t) => (t.id === updatedTrip.id ? updatedTrip : t));
    await saveTripsState(newTrips);
    showToast('Expense removed', 'info');
  };

  // ── SETTLEMENT ACKNOWLEDGEMENT / RESOLUTION HANDLERS ──
  const openAcknowledgeModal = (st: TripSettlement) => {
    setAcknowledgingSettlement(st);
    setAckPaymentMethod((st.paymentMethod as any) || 'UPI');
    setAckNote(st.note || '');
    setIsAcknowledgeModalOpen(true);
  };

  const handleConfirmAcknowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTrip || !acknowledgingSettlement) return;

    const existingSettlements = currentTrip.settlements ? [...currentTrip.settlements] : [];
    const index = existingSettlements.findIndex((s) => s.id === acknowledgingSettlement.id);

    const record: TripSettlement = {
      ...acknowledgingSettlement,
      isSettled: true,
      settledAt: new Date().toISOString(),
      settledBy: userName || 'You',
      paymentMethod: ackPaymentMethod,
      note: ackNote.trim(),
    };

    if (index >= 0) {
      existingSettlements[index] = record;
    } else {
      existingSettlements.push(record);
    }

    const updatedTrip: Trip = {
      ...currentTrip,
      settlements: existingSettlements,
      updatedAt: new Date().toISOString(),
    };

    const newTrips = trips.map((t) => (t.id === updatedTrip.id ? updatedTrip : t));
    await saveTripsState(newTrips);
    setIsAcknowledgeModalOpen(false);
    setAcknowledgingSettlement(null);
    showToast(`Payment of ₹${record.amount.toLocaleString('en-IN')} marked as Settled & Acknowledged! ✅`, 'success');
  };

  const handleReopenSettlement = async (st: TripSettlement) => {
    if (!currentTrip) return;
    const existingSettlements = currentTrip.settlements ? [...currentTrip.settlements] : [];
    const index = existingSettlements.findIndex((s) => s.id === st.id);

    if (index >= 0) {
      existingSettlements[index] = {
        ...existingSettlements[index],
        isSettled: false,
        settledAt: undefined,
        settledBy: undefined,
      };
    } else {
      existingSettlements.push({
        ...st,
        isSettled: false,
      });
    }

    const updatedTrip: Trip = {
      ...currentTrip,
      settlements: existingSettlements,
      updatedAt: new Date().toISOString(),
    };

    const newTrips = trips.map((t) => (t.id === updatedTrip.id ? updatedTrip : t));
    await saveTripsState(newTrips);
    showToast(`Settlement marked back to Pending ⏳`, 'info');
  };

  // Direct WhatsApp Reminder for a specific pending settlement
  const handleSendSettlementReminder = async (st: TripSettlement) => {
    if (!currentTrip) return;
    const text = `Hey ${st.fromName}! 👋 Friendly reminder regarding our *${currentTrip.name}* trip expenses:\n\nPending settlement amount: *₹${st.amount.toLocaleString('en-IN')}* payable to *${st.toName}*.\n\nPlease clear it when free! Check full breakdown here: ${publicShareUrl || window.location.href}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Reminder: ${currentTrip.name} Settlement`,
          text,
        });
      } else {
        await navigator.clipboard.writeText(text);
        showToast(`Copied payment reminder message for ${st.fromName}! 📋`, 'success');
      }
    } catch {
      await navigator.clipboard.writeText(text);
      showToast(`Copied payment reminder message for ${st.fromName}! 📋`, 'success');
    }
  };

  // Create New Trip
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripName.trim()) {
      showToast('Please enter a trip name.', 'error');
      return;
    }

    const participants: TripParticipant[] = [
      {
        id: 'p_you',
        name: `${userName || 'You'}`,
        isCurrentUser: true,
        avatarColor: 'from-violet-500 to-indigo-600',
      },
    ];

    selectedContactIds.forEach((cId) => {
      const contact = contacts.find((c) => c.id === cId);
      if (contact && !participants.some((p) => p.name.toLowerCase() === contact.name.toLowerCase())) {
        participants.push({
          id: 'p_' + contact.id,
          name: contact.name,
          contactId: contact.id,
          phone: contact.phone,
          avatarColor: 'from-emerald-500 to-teal-600',
        });
      }
    });

    if (customParticipantNames.trim()) {
      const names = customParticipantNames
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean);
      names.forEach((name, i) => {
        if (!participants.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
          participants.push({
            id: 'p_custom_' + Date.now() + '_' + i,
            name,
            avatarColor: 'from-amber-500 to-pink-600',
          });
        }
      });
    }

    const newTrip: Trip = {
      id: 'trip_' + Date.now(),
      name: newTripName.trim(),
      destination: newTripDestination.trim(),
      startDate: newTripStartDate,
      currency: '₹',
      participants,
      expenses: [],
      settlements: [],
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const updated = [newTrip, ...trips];
    setTrips(updated);
    setSelectedTripId(newTrip.id);
    setIsNewTripModalOpen(false);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTrip),
      });
      setSyncStatus('synced');
    } catch {
      setSyncStatus('local');
    }

    showToast('New trip created! Start adding expenses.', 'success');
  };

  // Reset to Demo Trip
  const handleLoadDemoTrip = async () => {
    const demo = getDemoTrip(userName, contacts);
    const updated = [demo, ...trips.filter((t) => t.id !== demo.id)];
    await saveTripsState(updated);
    setSelectedTripId(demo.id);
    showToast('Loaded sample Goa Trip with acknowledgement tracking! 🏖️', 'success');
  };

  // Generate / Open Public Share Link
  const handleGenerateShareLink = async () => {
    if (!currentTrip) return;
    setIsGeneratingShare(true);
    try {
      const res = await fetch(`/api/trips/${currentTrip.id}/share`, { method: 'POST' });
      if (res.ok) {
        const body = await res.json();
        setPublicShareUrl(body.shareUrl);
      } else {
        const token = currentTrip.shareToken || 'demo_trip_' + currentTrip.id;
        const host = window.location.host;
        setPublicShareUrl(`${window.location.protocol}//${host}/share/trip/${token}`);
      }
    } catch {
      const token = currentTrip.shareToken || 'demo_trip_' + currentTrip.id;
      const host = window.location.host;
      setPublicShareUrl(`${window.location.protocol}//${host}/share/trip/${token}`);
    } finally {
      setIsGeneratingShare(false);
      setIsShareModalOpen(true);
    }
  };

  // Share to WhatsApp / Chat
  const handleShareToWhatsApp = async () => {
    if (!currentTrip) return;
    const text = formatWhatsAppSummary(currentTrip, userName);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${currentTrip.name} — Expenses`,
          text,
        });
      } else {
        await navigator.clipboard.writeText(text);
        setCopiedWhatsApp(true);
        setTimeout(() => setCopiedWhatsApp(false), 2500);
        showToast('Copied WhatsApp summary to clipboard! 📋', 'success');
      }
    } catch {
      await navigator.clipboard.writeText(text);
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2500);
      showToast('Copied WhatsApp summary to clipboard! 📋', 'success');
    }
  };

  // Record settlement to Udharwale contact ledger
  const handleRecordSettlement = async (settlement: TripSettlement) => {
    if (!currentTrip) return;
    const isFromMe = settlement.fromName.toLowerCase().includes('you') || settlement.fromName === userName;
    const isToMe = settlement.toName.toLowerCase().includes('you') || settlement.toName === userName;

    let targetContactId = isFromMe ? settlement.toContactId : settlement.fromContactId;
    const otherPersonName = isFromMe ? settlement.toName : settlement.fromName;

    if (!targetContactId) {
      const match = contacts.find(
        (c) => c.name.toLowerCase() === otherPersonName.toLowerCase()
      );
      if (match) targetContactId = match.id;
    }

    if (!targetContactId || !onRecordToLedger) {
      showToast(
        `Please add "${otherPersonName}" as a contact first to record transactions directly in your ledger.`,
        'info'
      );
      return;
    }

    const type = isToMe ? 'gave' : 'got';
    const remark = `Trip: ${currentTrip.name} settlement`;

    try {
      await onRecordToLedger(targetContactId, settlement.amount, type, remark);
      showToast(
        `Recorded ₹${settlement.amount} settlement in ${otherPersonName}'s ledger! ✨`,
        'success'
      );
    } catch {
      showToast('Could not record to ledger. Please check connection.', 'error');
    }
  };

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    if (!currentTrip) return [];
    return currentTrip.expenses.filter((ex) => {
      const matchesSearch =
        ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ex.notes && ex.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' || ex.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [currentTrip, searchQuery, categoryFilter]);

  // Filtered settlements in Settlement Tab
  const filteredSettlements = useMemo(() => {
    if (!tripSummary) return [];
    if (settlementFilter === 'pending') {
      return tripSummary.settlements.filter((s) => !s.isSettled);
    }
    if (settlementFilter === 'settled') {
      return tripSummary.settlements.filter((s) => s.isSettled);
    }
    return tripSummary.settlements;
  }, [tripSummary, settlementFilter]);

  const currency = currentTrip?.currency || '₹';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* ── TOP BAR: TRIP SELECTOR & ACTIONS ── */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="px-4 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3 border-b"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-soft)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-violet-500/20 shrink-0"
          >
            <Compass className="h-5 w-5" />
          </motion.div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <select
                value={selectedTripId || ''}
                onChange={(e) => setSelectedTripId(e.target.value)}
                className="font-black text-base sm:text-lg bg-transparent outline-none cursor-pointer text-white truncate max-w-[200px] sm:max-w-[280px]"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                    {t.name}
                  </option>
                ))}
              </select>
              <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex border-violet-500/30 text-violet-300">
                {currentTrip?.participants.length || 0} friends
              </Badge>
            </div>
            <p className="text-[11px] truncate flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <span>{currentTrip?.destination ? `📍 ${currentTrip.destination}` : 'Trip Calculator'}</span>
              <span>·</span>
              <span className={syncStatus === 'synced' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                {syncStatus === 'synced' ? 'Synced ☁️' : 'Local Storage 💾'}
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setIsNewTripModalOpen(true)}
            className="h-9 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border"
            style={{
              background: 'var(--bg-raised)',
              borderColor: 'var(--border-soft)',
              color: 'var(--text-secondary)',
            }}
            title="Create new trip"
          >
            <FolderPlus className="w-4 h-4 text-violet-400" />
            <span className="hidden sm:inline">New Trip</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={handleShareToWhatsApp}
            className="h-9 px-3 rounded-xl text-xs font-bold transition-all shadow-md text-white flex items-center gap-1.5"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            title="Share formatted chat summary to WhatsApp"
          >
            {copiedWhatsApp ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </>
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={openAddExpenseModal}
            className="h-9 px-3.5 rounded-xl text-xs font-extrabold transition-all shadow-md text-white flex items-center gap-1.5"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </motion.button>
        </div>
      </motion.div>

      {/* ── SUB-HEADER: TRIP SUMMARY HERO CARD ── */}
      {currentTrip && tripSummary && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="px-4 py-3 shrink-0"
          style={{ background: 'var(--bg-base)' }}
        >
          <div
            className="rounded-3xl p-4 sm:p-5 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(99,102,241,0.08))',
              border: '1px solid rgba(139,92,246,0.22)',
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400">
                  Total Trip Spending
                </span>
                <div className="text-3xl sm:text-4xl font-black tabular-nums text-white mt-0.5">
                  <Counter to={tripSummary.totalSpend} prefix={currency} />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-300">
                    Average Per Head:{' '}
                    <strong className="text-emerald-400 font-extrabold">
                      {currency}{tripSummary.perHeadAverage.toLocaleString('en-IN')}
                    </strong>
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-xs text-slate-400">
                    {tripSummary.participantSummaries.length} friends
                  </span>
                </div>
              </div>

              {/* Personal net position pill */}
              {(() => {
                const mySummary = tripSummary.participantSummaries.find(
                  (s) => s.participant.isCurrentUser || s.participant.name.toLowerCase() === userName.toLowerCase()
                );
                const net = mySummary?.netBalance || 0;
                const isOwed = net > 0;
                const owes = net < 0;

                return (
                  <div
                    className="w-full sm:w-auto p-3 rounded-2xl flex items-center justify-between sm:justify-start gap-3 backdrop-blur-md"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-soft)',
                    }}
                  >
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
                        Your Personal Status
                      </span>
                      <p
                        className={cn(
                          'text-base font-black tabular-nums leading-tight',
                          isOwed ? 'text-emerald-400' : owes ? 'text-rose-400' : 'text-slate-300'
                        )}
                      >
                        {isOwed ? `+${currency}${net.toLocaleString('en-IN')} (You get back)` : owes ? `-${currency}${Math.abs(net).toLocaleString('en-IN')} (You owe)` : 'Settled ✨'}
                      </p>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={handleGenerateShareLink}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 transition-colors inline-flex items-center gap-1 shrink-0"
                      title="Public shareable link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Link</span>
                    </motion.button>
                  </div>
                );
              })()}
            </div>

            {/* Quick demo trip loader if low expenses */}
            {currentTrip.expenses.length === 0 && (
              <div className="mt-4 pt-3 border-t border-violet-500/20 flex items-center justify-between relative z-10">
                <span className="text-xs text-slate-400">
                  Want to explore with real sample data?
                </span>
                <button
                  onClick={handleLoadDemoTrip}
                  className="text-xs font-bold text-violet-300 hover:text-white underline inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Load Sample Goa Trip
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── NAVIGATION PILLS: CHAT FEED vs SETTLEMENT vs ALL EXPENSES ── */}
      <div className="px-4 py-1 shrink-0 flex items-center gap-2">
        <div
          className="flex-1 flex items-center p-1 rounded-2xl relative"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
        >
          {[
            { id: 'chat', label: '💬 Chat Stream' },
            {
              id: 'settlement',
              label: `⚖️ Who Owes Whom ${tripSummary && tripSummary.pendingSettlementsCount > 0 ? `(${tripSummary.pendingSettlementsCount} pending)` : ''}`,
            },
            { id: 'expenses', label: '🧾 All Expenses' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  'relative flex-1 py-1.5 text-xs font-extrabold rounded-xl transition-colors text-center z-10',
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="trip-tab-pill"
                    className="absolute inset-0 rounded-xl bg-violet-600 shadow-md shadow-violet-600/40"
                    style={{ zIndex: -1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB CONTENT SCROLL AREA ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="wait">
          {/* VIEW 1: CHAT FEED VIEW */}
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-3 max-w-3xl mx-auto"
            >
              <div className="flex justify-center my-2">
                <span
                  className="px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Compass className="w-3 h-3 text-violet-400" />
                  <span>{currentTrip?.name} expense log started</span>
                </span>
              </div>

              {filteredExpenses.length === 0 ? (
                <div
                  className="rounded-3xl p-8 text-center space-y-3"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                >
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center text-xl">
                    💬
                  </div>
                  <h3 className="font-extrabold text-base text-white">No expenses in this trip yet</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Add dinner, flights, hotel, or fuel expenses. You can even split who paid partially!
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={openAddExpenseModal}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 transition-colors inline-flex items-center gap-1.5 shadow-md shadow-violet-600/30"
                  >
                    <Plus className="w-4 h-4" />
                    Add First Expense
                  </motion.button>
                </div>
              ) : (
                filteredExpenses.map((expense, idx) => {
                  const cat = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.general;
                  const perHead =
                    expense.splitAmong.length > 0
                      ? Math.round((expense.amount / expense.splitAmong.length) * 100) / 100
                      : expense.amount;
                  const isExpanded = expandedExpenseId === expense.id;
                  const hasMultiplePayers = expense.paidBy.length > 1;

                  return (
                    <motion.div
                      key={expense.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.3 }}
                      className="rounded-3xl p-4 sm:p-5 transition-all space-y-3 hover:border-violet-500/40"
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-soft)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2.5 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                            style={{ background: cat.bg, color: cat.tone }}
                          >
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </span>
                          <span className="text-[11px] font-medium text-slate-500">
                            {expense.date}
                          </span>
                        </div>

                        <div className="text-right">
                          <div className="text-xl sm:text-2xl font-black tabular-nums text-white">
                            {currency}{expense.amount.toLocaleString('en-IN')}
                          </div>
                          <span className="text-[10px] font-bold text-violet-400 block">
                            {currency}{perHead.toLocaleString('en-IN')}/head
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-base sm:text-lg font-extrabold text-white">
                          {expense.title}
                        </h3>
                        {expense.notes && (
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            &ldquo;{expense.notes}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Who Paid Section */}
                      <div
                        className="p-3 rounded-2xl flex flex-col gap-2"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border-soft)',
                        }}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-400 flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                            {hasMultiplePayers ? 'Split Payment by:' : 'Paid by:'}
                          </span>
                          {hasMultiplePayers && (
                            <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              Multiple Partial Payers
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {expense.paidBy.map((payer) => {
                            const pName =
                              currentTrip?.participants.find((pt) => pt.id === payer.participantId)?.name ||
                              'Friend';
                            const pct = Math.round((payer.amount / expense.amount) * 100);
                            return (
                              <span
                                key={payer.participantId}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold"
                                style={{
                                  background: 'rgba(16,185,129,0.12)',
                                  color: '#34d399',
                                  border: '1px solid rgba(16,185,129,0.25)',
                                }}
                              >
                                <span>{pName}</span>
                                <span className="font-black">
                                  {currency}{payer.amount.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] opacity-75">({pct}%)</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Beneficiaries & Action Footer */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-violet-400" />
                          Split among {expense.splitAmong.length} friends
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setExpandedExpenseId(isExpanded ? null : expense.id)
                            }
                            className="text-violet-400 hover:text-violet-300 font-bold inline-flex items-center gap-1"
                          >
                            <span>{isExpanded ? 'Hide' : 'Transparency'}</span>
                            <ChevronDown
                              className={cn(
                                'w-3.5 h-3.5 transition-transform duration-200',
                                isExpanded && 'rotate-180'
                              )}
                            />
                          </button>

                          <button
                            onClick={() => openEditExpenseModal(expense)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div
                              className="p-3 rounded-2xl space-y-2.5 mt-2"
                              style={{
                                background: 'rgba(124,58,237,0.06)',
                                border: '1px solid rgba(139,92,246,0.2)',
                              }}
                            >
                              <p className="text-[10px] font-extrabold text-violet-300 uppercase tracking-wider">
                                Transparent Share Calculation:
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {expense.splitAmong.map((split) => {
                                  const pName =
                                    currentTrip?.participants.find((pt) => pt.id === split.participantId)?.name ||
                                    'Friend';
                                  return (
                                    <div
                                      key={split.participantId}
                                      className="flex items-center justify-between p-2 rounded-xl text-xs"
                                      style={{ background: 'var(--bg-raised)' }}
                                    >
                                      <span className="font-semibold text-slate-300 truncate mr-2">
                                        {pName}
                                      </span>
                                      <span className="font-black tabular-nums text-white shrink-0">
                                        {currency}{split.amount.toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}

          {/* VIEW 2: SETTLEMENT, ACKNOWLEDGEMENT & WHO OWES WHOM */}
          {activeTab === 'settlement' && tripSummary && (
            <motion.div
              key="settlement"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-5 max-w-3xl mx-auto"
            >
              {/* ── RESOLUTION & PROGRESS HERO BANNER ── */}
              <div
                className="rounded-3xl p-5 space-y-4 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(124,58,237,0.08))',
                  border: '1px solid rgba(16,185,129,0.25)',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-400 block">
                      Settlement Resolution Progress
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 mt-0.5">
                      <span>{tripSummary.settlementProgressPct}% Resolved</span>
                      {tripSummary.allSettled && (
                        <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                          100% Cleared 🎉
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {tripSummary.settledSettlementsCount} of {tripSummary.settlements.length} transfers cleared · Minimum-debt algorithm
                    </p>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={handleShareToWhatsApp}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/30 shrink-0 self-start sm:self-auto"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Status on WhatsApp</span>
                  </motion.button>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="h-2.5 rounded-full bg-slate-800/90 overflow-hidden relative">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${tripSummary.settlementProgressPct}%` }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* Stat pills: Settled vs Pending */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div
                    className="p-3 rounded-2xl border"
                    style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)' }}
                  >
                    <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block">
                      ✅ Paid & Acknowledged
                    </span>
                    <div className="text-lg font-black text-white tabular-nums mt-0.5">
                      {currency}{tripSummary.totalSettledAmount.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {tripSummary.settledSettlementsCount} transfer{tripSummary.settledSettlementsCount !== 1 ? 's' : ''} completed
                    </span>
                  </div>

                  <div
                    className="p-3 rounded-2xl border"
                    style={{ background: 'rgba(244,63,94,0.08)', borderColor: 'rgba(244,63,94,0.2)' }}
                  >
                    <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-wider block">
                      ⏳ Pending Resolution
                    </span>
                    <div className="text-lg font-black text-white tabular-nums mt-0.5">
                      {currency}{tripSummary.totalPendingAmount.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {tripSummary.pendingSettlementsCount} transfer{tripSummary.pendingSettlementsCount !== 1 ? 's' : ''} remaining
                    </span>
                  </div>
                </div>
              </div>

              {/* ── SETTLEMENT TRANSFERS LIST WITH FILTERS & ACKNOWLEDGEMENT ── */}
              <div
                className="rounded-3xl p-5 space-y-4"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>⚖️ Who Pays Whom</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Acknowledge transfers as they are paid via UPI, Cash, or Ledger
                    </p>
                  </div>

                  {/* Filter chips */}
                  <div
                    className="flex p-0.5 rounded-xl text-xs font-bold"
                    style={{ background: 'var(--bg-raised)' }}
                  >
                    <button
                      onClick={() => setSettlementFilter('all')}
                      className={cn(
                        'px-2.5 py-1 rounded-lg transition-colors',
                        settlementFilter === 'all' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                      )}
                    >
                      All ({tripSummary.settlements.length})
                    </button>
                    <button
                      onClick={() => setSettlementFilter('pending')}
                      className={cn(
                        'px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1',
                        settlementFilter === 'pending' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                      )}
                    >
                      <Clock className="w-3 h-3" />
                      <span>Pending ({tripSummary.pendingSettlementsCount})</span>
                    </button>
                    <button
                      onClick={() => setSettlementFilter('settled')}
                      className={cn(
                        'px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1',
                        settlementFilter === 'settled' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                      )}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Settled ({tripSummary.settledSettlementsCount})</span>
                    </button>
                  </div>
                </div>

                {filteredSettlements.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-800/40 text-center space-y-2">
                    <p className="text-sm font-extrabold text-slate-300">
                      {settlementFilter === 'pending'
                        ? '🎉 Awesome! No pending settlements.'
                        : settlementFilter === 'settled'
                        ? 'No acknowledged settlements yet.'
                        : 'No settlements required.'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {settlementFilter === 'pending'
                        ? 'Everyone has paid their dues or all balances are even.'
                        : 'Mark payments as settled when friends pay you or each other.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredSettlements.map((st, i) => {
                      const isSettled = st.isSettled;

                      return (
                        <motion.div
                          key={st.id || i}
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={cn(
                            'p-4 rounded-2xl flex flex-col gap-3 transition-all',
                            isSettled
                              ? 'border border-emerald-500/30 bg-emerald-500/5'
                              : 'border border-rose-500/20 bg-rose-500/5 hover:border-violet-500/40'
                          )}
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            {/* Debtor to Creditor info */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn(
                                'w-10 h-10 rounded-xl bg-gradient-to-tr flex items-center justify-center font-black text-xs text-white shrink-0',
                                avatarGradient(st.fromName)
                              )}>
                                {st.fromName[0]}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                                  <span className="text-rose-400 font-extrabold">{st.fromName}</span>
                                  <span className="text-slate-500 font-normal">owes</span>
                                  <span className="text-emerald-400 font-extrabold">{st.toName}</span>

                                  {isSettled ? (
                                    <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                      Paid & Settled
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-extrabold text-amber-300 uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-amber-400" />
                                      Pending
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                  {isSettled ? (
                                    <span>
                                      Confirmed {st.settledAt ? `on ${new Date(st.settledAt).toLocaleDateString('en-IN')}` : ''}
                                      {st.paymentMethod ? ` via ${st.paymentMethod}` : ''}
                                      {st.note ? ` • "${st.note}"` : ''}
                                    </span>
                                  ) : (
                                    <span>Direct settlement transfer to square off trip balance</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Amount */}
                            <div className="text-right shrink-0 self-end sm:self-auto">
                              <div className={cn(
                                'text-xl font-black tabular-nums',
                                isSettled ? 'text-emerald-400 line-through opacity-80' : 'text-white'
                              )}>
                                {currency}{st.amount.toLocaleString('en-IN')}
                              </div>
                              <span className="text-[10px] text-slate-500 block">
                                {isSettled ? 'Settled ✅' : 'Due payment'}
                              </span>
                            </div>
                          </div>

                          {/* Action Toolbar */}
                          <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {/* Acknowledge / Toggle button */}
                              {isSettled ? (
                                <motion.button
                                  whileTap={{ scale: 0.94 }}
                                  onClick={() => handleReopenSettlement(st)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5 border border-slate-700"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Revert to Pending</span>
                                </motion.button>
                              ) : (
                                <motion.button
                                  whileTap={{ scale: 0.94 }}
                                  onClick={() => openAcknowledgeModal(st)}
                                  className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 transition-all inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Acknowledge / Mark Paid</span>
                                </motion.button>
                              )}

                              {/* WhatsApp Reminder for this specific pending debt */}
                              {!isSettled && (
                                <motion.button
                                  whileTap={{ scale: 0.94 }}
                                  onClick={() => handleSendSettlementReminder(st)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors inline-flex items-center gap-1.5 border border-emerald-500/30"
                                  title="Send payment reminder to this friend on WhatsApp"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Remind</span>
                                </motion.button>
                              )}
                            </div>

                            {/* Record in Udharwale Ledger */}
                            {onRecordToLedger && (
                              <motion.button
                                whileTap={{ scale: 0.94 }}
                                onClick={() => handleRecordSettlement(st)}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold text-violet-200 bg-violet-600/30 hover:bg-violet-600/50 transition-colors inline-flex items-center gap-1 border border-violet-500/30 ml-auto"
                                title="Record in Udharwale contact ledger"
                              >
                                <TrendingUp className="w-3.5 h-3.5" />
                                <span>Record in Ledger</span>
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── PARTICIPANT CONTRIBUTION & RESOLUTION MATRIX ── */}
              <div
                className="rounded-3xl p-5 space-y-4"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
              >
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-violet-400" />
                    Who Paid & Who is Remaining
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Clear visibility into each participant's out-of-pocket spend, share, and remaining dues
                  </p>
                </div>

                <div className="space-y-3">
                  {tripSummary.participantSummaries.map((s, i) => {
                    const isOwed = s.netBalance > 0.01;
                    const owes = s.netBalance < -0.01;
                    const maxPaid = Math.max(...tripSummary.participantSummaries.map((x) => x.totalPaid), 1);
                    const barPct = Math.min(100, Math.max(0, (s.totalPaid / maxPaid) * 100));

                    return (
                      <motion.div
                        key={s.participant.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="p-4 rounded-2xl space-y-3"
                        style={{
                          background: s.isFullySettled
                            ? 'rgba(16,185,129,0.04)'
                            : owes
                            ? 'rgba(244,63,94,0.05)'
                            : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${
                            s.isFullySettled
                              ? 'rgba(16,185,129,0.25)'
                              : owes
                              ? 'rgba(244,63,94,0.25)'
                              : 'var(--border-soft)'
                          }`,
                        }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn(
                              'w-10 h-10 rounded-xl bg-gradient-to-tr flex items-center justify-center font-black text-xs text-white shrink-0',
                              avatarGradient(s.participant.name)
                            )}>
                              {s.participant.name[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate flex items-center gap-2">
                                <span>{s.participant.name}</span>
                                {s.participant.isCurrentUser && (
                                  <span className="text-[10px] text-violet-400 font-extrabold">(You)</span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Paid {currency}{s.totalPaid.toLocaleString('en-IN')} · Consumed{' '}
                                {currency}{s.totalShare.toLocaleString('en-IN')}
                              </p>
                            </div>
                          </div>

                          {/* Remaining / Settled Status Badge */}
                          <div className="text-left sm:text-right shrink-0">
                            {owes ? (
                              s.pendingDebt > 0 ? (
                                <div>
                                  <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-wider bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30 inline-flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-rose-400" />
                                    {currency}{s.pendingDebt.toLocaleString('en-IN')} Pending to Pay
                                  </span>
                                  {s.settledDebt > 0 && (
                                    <p className="text-[10px] text-emerald-400 mt-0.5 font-semibold">
                                      ({currency}{s.settledDebt.toLocaleString('en-IN')} already cleared)
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  All Dues Paid ({currency}{s.settledDebt.toLocaleString('en-IN')})
                                </span>
                              )
                            ) : isOwed ? (
                              s.pendingCredit > 0 ? (
                                <div>
                                  <span className="text-[10px] font-extrabold text-violet-300 uppercase tracking-wider bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/30 inline-flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-violet-400" />
                                    {currency}{s.pendingCredit.toLocaleString('en-IN')} Due to Receive
                                  </span>
                                  {s.settledCredit > 0 && (
                                    <p className="text-[10px] text-emerald-400 mt-0.5 font-semibold">
                                      ({currency}{s.settledCredit.toLocaleString('en-IN')} collected)
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  All Received ({currency}{s.settledCredit.toLocaleString('en-IN')})
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-emerald-400" />
                                Even · Settled
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Animated progress bar showing relative payment */}
                        <div className="h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
                          <motion.div
                            className={cn('h-full rounded-full', isOwed ? 'bg-emerald-500' : owes ? 'bg-rose-500' : 'bg-slate-500')}
                            initial={{ width: 0 }}
                            animate={{ width: `${barPct}%` }}
                            transition={{ duration: 0.8, delay: i * 0.06 + 0.1, ease: 'easeOut' }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Spending by Category Breakdown */}
              {(() => {
                const cats = Object.entries(tripSummary.categoryTotals)
                  .filter(([, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a);
                if (cats.length === 0) return null;
                const total = cats.reduce((a, [, v]) => a + v, 0);

                return (
                  <div
                    className="rounded-3xl p-5 space-y-3.5"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                  >
                    <h3 className="text-sm font-black text-white">Spending by Category</h3>
                    <div className="space-y-3">
                      {cats.map(([cat, amt], i) => {
                        const cfg = CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.general;
                        const pct = Math.round((amt / total) * 100);
                        return (
                          <div key={cat} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5 font-bold" style={{ color: cfg.tone }}>
                                <span>{cfg.icon}</span> {cfg.label}
                              </span>
                              <span className="font-black tabular-nums text-white">
                                {currency}{amt.toLocaleString('en-IN')}
                                <span className="text-slate-500 font-normal ml-1">({pct}%)</span>
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: cfg.tone }}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, delay: i * 0.05 + 0.1, ease: 'easeOut' }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* VIEW 3: ALL EXPENSES LIST & SEARCH */}
          {activeTab === 'expenses' && (
            <motion.div
              key="expenses"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4 max-w-3xl mx-auto"
            >
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search expenses by title or memo…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl outline-none font-medium"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-soft)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setCategoryFilter('all')}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0',
                      categoryFilter === 'all'
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white'
                    )}
                  >
                    All ({currentTrip?.expenses.length || 0})
                  </button>
                  {Object.entries(CATEGORY_CONFIG).map(([catKey, config]) => (
                    <button
                      key={catKey}
                      onClick={() => setCategoryFilter(catKey)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 inline-flex items-center gap-1',
                        categoryFilter === catKey
                          ? 'bg-violet-600 text-white'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      )}
                    >
                      <span>{config.icon}</span>
                      <span>{config.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="rounded-3xl p-5 divide-y divide-slate-800"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
              >
                {filteredExpenses.length === 0 ? (
                  <p className="text-center text-xs py-8 text-slate-400">
                    No matching expenses found.
                  </p>
                ) : (
                  filteredExpenses.map((expense) => {
                    const cat = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.general;
                    const payersStr = expense.paidBy
                      .map((p) => {
                        const name =
                          currentTrip?.participants.find((pt) => pt.id === p.participantId)?.name ||
                          'Friend';
                        return `${name} (${currency}${p.amount.toLocaleString('en-IN')})`;
                      })
                      .join(' + ');

                    return (
                      <div key={expense.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0"
                            style={{ background: cat.bg, color: cat.tone }}
                          >
                            {cat.icon}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">{expense.title}</h4>
                            <p className="text-[11px] text-slate-400 truncate">Paid by {payersStr}</p>
                            <span className="text-[10px] text-slate-500">{expense.date}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-base font-black tabular-nums text-white">
                              {currency}{expense.amount.toLocaleString('en-IN')}
                            </p>
                            <span className="text-[10px] text-violet-400 font-bold">
                              {currency}
                              {Math.round((expense.amount / expense.splitAmong.length) * 100) / 100}
                              /head
                            </span>
                          </div>

                          <button
                            onClick={() => openEditExpenseModal(expense)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══════════════════════════════════════════════════════
          ACKNOWLEDGE SETTLEMENT PAYMENT MODAL
      ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isAcknowledgeModalOpen && acknowledgingSettlement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsAcknowledgeModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="relative w-full max-w-md rounded-3xl overflow-hidden flex flex-col shadow-2xl"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-soft)',
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 border-b shrink-0"
                style={{ borderColor: 'var(--border-soft)' }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white">Acknowledge Payment</h3>
                    <p className="text-[11px] text-slate-400">Confirm payment has been settled</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAcknowledgeModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmAcknowledge} className="p-5 space-y-4">
                {/* Transfer Details Card */}
                <div
                  className="p-4 rounded-2xl space-y-1.5 border"
                  style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.2)' }}
                >
                  <span className="text-[10px] font-extrabold uppercase text-emerald-400 tracking-wider">
                    Settlement Transfer
                  </span>
                  <div className="text-sm font-bold text-white flex items-center justify-between">
                    <span>
                      <strong className="text-rose-400">{acknowledgingSettlement.fromName}</strong> paid to{' '}
                      <strong className="text-emerald-400">{acknowledgingSettlement.toName}</strong>
                    </span>
                    <span className="text-xl font-black text-white tabular-nums">
                      {currency}{acknowledgingSettlement.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Payment Mode</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'UPI', label: 'UPI / GPay' },
                      { id: 'Cash', label: 'Cash' },
                      { id: 'Bank Transfer', label: 'Bank' },
                      { id: 'Other', label: 'Other' },
                    ].map((m) => (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setAckPaymentMethod(m.id as any)}
                        className={cn(
                          'py-2 px-1 rounded-xl text-xs font-extrabold transition-all text-center',
                          ackPaymentMethod === m.id
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-slate-800/60 text-slate-400 hover:text-white'
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes / Reference */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Note / Reference (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Paid via Google Pay, Txn #49102"
                    value={ackNote}
                    onChange={(e) => setAckNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none font-medium text-white"
                    style={{
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border-soft)',
                    }}
                  />
                </div>

                <div className="pt-2">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="submit"
                    className="w-full py-3 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Mark as Settled</span>
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════
          ADD / EDIT EXPENSE MODAL (WITH PARTIAL PAYERS!)
      ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isExpenseModalOpen && currentTrip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsExpenseModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="relative w-full max-w-lg rounded-3xl overflow-hidden flex flex-col shadow-2xl"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-soft)',
                maxHeight: '92vh',
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 border-b shrink-0"
                style={{ borderColor: 'var(--border-soft)' }}
              >
                <h3 className="font-black text-base text-white">
                  {editingExpense ? 'Edit Trip Expense' : 'Add Trip Expense'}
                </h3>
                <button
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveExpense} className="p-5 space-y-4 overflow-y-auto flex-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Item / Expense Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Seafood Dinner at Beach Shack, Villa Stay, Cab"
                    value={expTitle}
                    onChange={(e) => setExpTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none font-medium text-white"
                    style={{
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border-soft)',
                    }}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Total Bill Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 5000"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm font-black outline-none text-emerald-400"
                      style={{
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border-soft)',
                      }}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Date</label>
                    <input
                      type="date"
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none font-medium text-white"
                      style={{
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border-soft)',
                      }}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Category</label>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
                      const isSelected = expCategory === key;
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => setExpCategory(key as ExpenseCategory)}
                          className={cn(
                            'p-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all',
                            isSelected
                              ? 'bg-violet-600 text-white shadow-md'
                              : 'bg-slate-800/60 text-slate-400 hover:text-white'
                          )}
                        >
                          <span className="text-base">{cfg.icon}</span>
                          <span className="text-[10px] truncate max-w-full">{cfg.label.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Who Paid Mode */}
                <div
                  className="p-4 rounded-2xl space-y-3"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      Who Paid for This?
                    </label>

                    <div
                      className="flex p-0.5 rounded-xl text-[10px] font-bold"
                      style={{ background: 'var(--bg-raised)' }}
                    >
                      <button
                        type="button"
                        onClick={() => setPayerMode('single')}
                        className={cn(
                          'px-2.5 py-1 rounded-lg transition-colors',
                          payerMode === 'single' ? 'bg-violet-600 text-white' : 'text-slate-400'
                        )}
                      >
                        Single Payer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPayerMode('multiple');
                          if (singlePayerId && parsedTotalAmount > 0 && Object.keys(multiplePayers).length === 0) {
                            setMultiplePayers({ [singlePayerId]: String(parsedTotalAmount) });
                          }
                        }}
                        className={cn(
                          'px-2.5 py-1 rounded-lg transition-colors',
                          payerMode === 'multiple' ? 'bg-violet-600 text-white' : 'text-slate-400'
                        )}
                      >
                        Multiple Payers ✨
                      </button>
                    </div>
                  </div>

                  {payerMode === 'single' ? (
                    <div className="grid grid-cols-2 gap-2">
                      {currentTrip.participants.map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => setSinglePayerId(p.id)}
                          className={cn(
                            'p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all text-left',
                            singlePayerId === p.id
                              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800/40 text-slate-300 border border-transparent hover:border-slate-700'
                          )}
                        >
                          <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-black">
                            {p.name[0]}
                          </span>
                          <span className="truncate">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <p className="text-[11px] text-slate-400">
                        Enter what each person paid (e.g. You paid ₹2,000, Rahul paid ₹3,000):
                      </p>

                      <div className="space-y-2">
                        {currentTrip.participants.map((p) => {
                          const currentVal = multiplePayers[p.id] || '';
                          return (
                            <div
                              key={p.id}
                              className="p-2.5 rounded-xl flex items-center justify-between gap-3"
                              style={{ background: 'var(--bg-raised)' }}
                            >
                              <span className="text-xs font-bold text-white truncate min-w-[80px]">
                                {p.name}
                              </span>

                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0"
                                  value={currentVal}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setMultiplePayers((prev) => ({ ...prev, [p.id]: val }));
                                  }}
                                  className="w-24 px-2.5 py-1 text-xs font-black text-right outline-none rounded-lg text-emerald-400"
                                  style={{
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-soft)',
                                  }}
                                />

                                {payerRemainingBalance > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const assignedToOthers = Object.entries(multiplePayers)
                                        .filter(([k]) => k !== p.id)
                                        .reduce((acc, [, v]) => acc + (Number(v) || 0), 0);
                                      const remainder = Math.max(0, parsedTotalAmount - assignedToOthers);
                                      setMultiplePayers((prev) => ({
                                        ...prev,
                                        [p.id]: String(remainder),
                                      }));
                                    }}
                                    className="text-[10px] font-bold text-violet-400 hover:text-violet-300 underline shrink-0"
                                  >
                                    +Fill
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div
                        className={cn(
                          'p-2.5 rounded-xl text-xs font-bold flex items-center justify-between',
                          isPayerBalanced
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        )}
                      >
                        <span>
                          {isPayerBalanced
                            ? '✨ Perfectly balanced!'
                            : `Remaining to allocate: ${currency}${payerRemainingBalance}`}
                        </span>
                        <span>
                          {currency}{currentAssignedPayersTotal} / {currency}{parsedTotalAmount}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Split Beneficiaries */}
                <div
                  className="p-4 rounded-2xl space-y-3"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Split className="w-3.5 h-3.5 text-violet-400" />
                      Split Among (Beneficiaries)
                    </label>

                    <div
                      className="flex p-0.5 rounded-xl text-[10px] font-bold"
                      style={{ background: 'var(--bg-raised)' }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSplitMode('all');
                          setSelectedBeneficiaries(currentTrip.participants.map((p) => p.id));
                        }}
                        className={cn(
                          'px-2.5 py-1 rounded-lg transition-colors',
                          splitMode === 'all' ? 'bg-violet-600 text-white' : 'text-slate-400'
                        )}
                      >
                        All (Equal)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSplitMode('custom')}
                        className={cn(
                          'px-2.5 py-1 rounded-lg transition-colors',
                          splitMode === 'custom' ? 'bg-violet-600 text-white' : 'text-slate-400'
                        )}
                      >
                        Select People
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {currentTrip.participants.map((p) => {
                      const isChecked = selectedBeneficiaries.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={cn(
                            'p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all',
                            isChecked
                              ? 'bg-violet-600/20 text-violet-200 border border-violet-500/30'
                              : 'bg-slate-800/40 text-slate-500 border border-transparent'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBeneficiaries([...selectedBeneficiaries, p.id]);
                              } else {
                                if (selectedBeneficiaries.length > 1) {
                                  setSelectedBeneficiaries(selectedBeneficiaries.filter((id) => id !== p.id));
                                }
                              }
                            }}
                            className="rounded text-violet-600 focus:ring-0"
                          />
                          <span className="truncate">{p.name}</span>
                        </label>
                      );
                    })}
                  </div>

                  {parsedTotalAmount > 0 && selectedBeneficiaries.length > 0 && (
                    <div className="text-[11px] text-violet-300 font-semibold pt-1">
                      💡 Per-head: {currency}
                      {Math.round((parsedTotalAmount / selectedBeneficiaries.length) * 100) / 100} for{' '}
                      {selectedBeneficiaries.length} friends
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Notes / Remarks (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Lobster special, 2 beers included, Innova cab"
                    value={expNotes}
                    onChange={(e) => setExpNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none font-medium text-white"
                    style={{
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border-soft)',
                    }}
                  />
                </div>

                <div className="pt-2">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="submit"
                    disabled={payerMode === 'multiple' && !isPayerBalanced}
                    className={cn(
                      'w-full py-3 rounded-2xl text-xs font-black text-white shadow-xl transition-all',
                      payerMode === 'multiple' && !isPayerBalanced
                        ? 'bg-slate-700 opacity-50 cursor-not-allowed'
                        : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500'
                    )}
                  >
                    {editingExpense ? 'Save Changes' : 'Post to Trip Chat 💸'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════
          CREATE NEW TRIP MODAL
      ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isNewTripModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsNewTripModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="relative w-full max-w-md rounded-3xl overflow-hidden flex flex-col shadow-2xl"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-soft)',
                maxHeight: '90vh',
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 border-b shrink-0"
                style={{ borderColor: 'var(--border-soft)' }}
              >
                <h3 className="font-black text-base text-white">Create New Trip</h3>
                <button
                  onClick={() => setIsNewTripModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTrip} className="p-5 space-y-4 overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Trip Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Manali Vacation, Goa Trip, Friday Dinner"
                    value={newTripName}
                    onChange={(e) => setNewTripName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none font-medium text-white"
                    style={{
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border-soft)',
                    }}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Destination</label>
                    <input
                      type="text"
                      placeholder="e.g. North Goa"
                      value={newTripDestination}
                      onChange={(e) => setNewTripDestination(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none font-medium text-white"
                      style={{
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border-soft)',
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Start Date</label>
                    <input
                      type="date"
                      value={newTripStartDate}
                      onChange={(e) => setNewTripStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none font-medium text-white"
                      style={{
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border-soft)',
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Add Friends from Contacts</span>
                    <span className="text-[10px] text-violet-400">
                      {selectedContactIds.length} selected
                    </span>
                  </label>

                  {contacts.length === 0 ? (
                    <p className="text-[11px] text-slate-500">No contacts saved yet.</p>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {contacts.map((c) => {
                        const isSelected = selectedContactIds.includes(c.id);
                        return (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedContactIds(selectedContactIds.filter((id) => id !== c.id));
                              } else {
                                setSelectedContactIds([...selectedContactIds, c.id]);
                              }
                            }}
                            className={cn(
                              'w-full p-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all',
                              isSelected
                                ? 'bg-violet-600/30 text-violet-200 border border-violet-500/40'
                                : 'bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                            )}
                          >
                            <span>{c.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-violet-400" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Or Add Other Friends (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Aman, Priya, Rohit"
                    value={customParticipantNames}
                    onChange={(e) => setCustomParticipantNames(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none font-medium text-white"
                    style={{
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border-soft)',
                    }}
                  />
                </div>

                <div className="pt-2">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="submit"
                    className="w-full py-3 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-xl transition-all"
                  >
                    Create Trip 🚀
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════
          SHARE MODAL (PUBLIC WEB LINK & WHATSAPP)
      ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isShareModalOpen && currentTrip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsShareModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="relative w-full max-w-md rounded-3xl overflow-hidden flex flex-col shadow-2xl p-5 space-y-4"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-soft)',
              }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-black text-base text-white">Share Trip Expenses</h3>
                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Anyone with this link can view the complete transparent expense breakdown, chat stream, and settlement plan without needing to log in.
              </p>

              {publicShareUrl && (
                <div className="space-y-2">
                  <div
                    className="p-3 rounded-2xl flex items-center justify-between gap-2"
                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)' }}
                  >
                    <span className="text-xs text-slate-300 truncate font-mono">
                      {publicShareUrl}
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={async () => {
                        await navigator.clipboard.writeText(publicShareUrl);
                        setCopiedShareLink(true);
                        setTimeout(() => setCopiedShareLink(false), 2000);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-violet-600 text-white shrink-0 hover:bg-violet-500"
                    >
                      {copiedShareLink ? 'Copied!' : 'Copy Link'}
                    </motion.button>
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleShareToWhatsApp}
                  className="w-full py-2.5 rounded-xl text-xs font-extrabold text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  <Share2 className="w-4 h-4" />
                  Share Formatted WhatsApp Chat
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
