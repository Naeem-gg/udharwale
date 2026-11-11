'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Share2,
  Users,
  CreditCard,
  Split,
  ReceiptText,
  ChevronDown,
  Trash2,
  Check,
  Search,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  X,
  Calendar,
  AlertCircle,
  FolderPlus,
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
  const [activeTab, setActiveTab] = useState<'expenses' | 'settlement'>('expenses');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [settlementFilter, setSettlementFilter] = useState<'all' | 'pending' | 'settled'>('all');

  // Modals
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAcknowledgeModalOpen, setIsAcknowledgeModalOpen] = useState(false);
  const [acknowledgingSettlement, setAcknowledgingSettlement] = useState<TripSettlement | null>(null);
  const [ackPaymentMethod, setAckPaymentMethod] = useState<'UPI' | 'Cash' | 'Bank Transfer' | 'Other'>('UPI');
  const [ackNote, setAckNote] = useState('');

  const [editingExpense, setEditingExpense] = useState<TripExpense | null>(null);
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
        }
      })
      .catch(() => {});
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
        try {
          await fetch(`/api/trips/${activeTrip.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(activeTrip),
          });
        } catch {}
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

  // Settlement Acknowledgement Handlers
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
    } catch {}

    showToast('New trip created! Start adding expenses.', 'success');
  };

  // Reset to Demo Trip
  const handleLoadDemoTrip = async () => {
    const demo = getDemoTrip(userName, contacts);
    const updated = [demo, ...trips.filter((t) => t.id !== demo.id)];
    await saveTripsState(updated);
    setSelectedTripId(demo.id);
    showToast('Loaded sample Goa Trip! 🏖️', 'success');
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
    <div className="flex-1 flex flex-col h-full overflow-hidden relative" style={{ background: 'var(--bg-base)' }}>
      {/* App bar */}
      <div
        className="px-4 pt-3 pb-2 shrink-0 border-b"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-soft)' }}
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="min-w-0">
            <h1 className="text-xl font-black leading-none" style={{ color: 'var(--text-primary)' }}>Trips</h1>
            <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
              {currentTrip?.destination || 'Group expenses'} · {currentTrip?.participants.length || 0} people
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsNewTripModalOpen(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)', color: 'var(--text-muted)' }}
              aria-label="New trip"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={openAddExpenseModal}
              className="h-9 px-3.5 rounded-full text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}
            >
              + Expense
            </button>
          </div>
        </div>

        <select
          value={selectedTripId || ''}
          onChange={(e) => setSelectedTripId(e.target.value)}
          className="w-full px-3 py-2.5 text-sm font-bold rounded-2xl outline-none"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)' }}
        >
          {trips.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {tripSummary && (
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl px-2.5 py-2 text-center" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)' }}>
              <p className="text-sm font-black tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {currency}{tripSummary.totalSpend.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>Spent</p>
            </div>
            <div className="rounded-2xl px-2.5 py-2 text-center" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)' }}>
              <p className="text-sm font-black tabular-nums leading-tight" style={{ color: '#34d399' }}>
                {tripSummary.hasUnevenShares
                  ? `${currency}${tripSummary.minShare.toLocaleString('en-IN')}–${tripSummary.maxShare.toLocaleString('en-IN')}`
                  : `${currency}${tripSummary.perHeadAverage.toLocaleString('en-IN')}`}
              </p>
              <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {tripSummary.hasUnevenShares ? 'Share range' : 'Per head'}
              </p>
            </div>
            <div className="rounded-2xl px-2.5 py-2 text-center" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)' }}>
              <p className="text-sm font-black tabular-nums" style={{ color: tripSummary.totalPendingAmount > 0 ? '#fb7185' : '#34d399' }}>
                {currency}{tripSummary.totalPendingAmount.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>Pending</p>
            </div>
          </div>
        )}

        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={handleShareToWhatsApp}
            className="flex-1 py-2 rounded-xl text-xs font-bold"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}
          >
            {copiedWhatsApp ? 'Copied' : 'Share summary'}
          </button>
          <button
            type="button"
            onClick={handleGenerateShareLink}
            className="flex-1 py-2 rounded-xl text-xs font-bold"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)', color: 'var(--text-secondary)' }}
          >
            Copy link
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 shrink-0" style={{ background: 'var(--bg-base)' }}>
        <div
          className="flex p-1 rounded-2xl gap-1"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
        >
          {([
            { id: 'expenses' as const, label: 'Expenses' },
            {
              id: 'settlement' as const,
              label: tripSummary?.pendingSettlementsCount
                ? `Settle (${tripSummary.pendingSettlementsCount})`
                : 'Settle',
            },
          ]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition-colors"
              style={{
                background: activeTab === tab.id ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: activeTab === tab.id ? '#a5b4fc' : 'var(--text-muted)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-8">
        <AnimatePresence mode="wait">
          {activeTab === 'settlement' && tripSummary && (
            <motion.div
              key="settlement"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="space-y-3"
            >
              <div
                className="rounded-2xl p-3.5"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                      {tripSummary.settlementProgressPct}% settled
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {tripSummary.settledSettlementsCount}/{tripSummary.settlements.length} transfers
                    </p>
                  </div>
                  <p className="text-sm font-black tabular-nums" style={{ color: tripSummary.totalPendingAmount > 0 ? '#fb7185' : '#34d399' }}>
                    {currency}{tripSummary.totalPendingAmount.toLocaleString('en-IN')} due
                  </p>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-raised)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${tripSummary.settlementProgressPct}%`, background: '#34d399' }}
                  />
                </div>
              </div>

              <div
                className="rounded-2xl p-3.5 space-y-3"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                    Who pays whom
                  </h3>
                  <div className="flex p-0.5 rounded-lg text-[11px] font-bold" style={{ background: 'var(--bg-raised)' }}>
                    <button
                      onClick={() => setSettlementFilter('all')}
                      className={cn(
                        'px-2 py-0.5 rounded-md transition-colors',
                        settlementFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      )}
                    >
                      All ({tripSummary.settlements.length})
                    </button>
                    <button
                      onClick={() => setSettlementFilter('pending')}
                      className={cn(
                        'px-2 py-0.5 rounded-md transition-colors flex items-center gap-1',
                        settlementFilter === 'pending' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                      )}
                    >
                      <Clock className="w-2.5 h-2.5" />
                      <span>{tripSummary.pendingSettlementsCount}</span>
                    </button>
                    <button
                      onClick={() => setSettlementFilter('settled')}
                      className={cn(
                        'px-2 py-0.5 rounded-md transition-colors flex items-center gap-1',
                        settlementFilter === 'settled' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                      )}
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>{tripSummary.settledSettlementsCount}</span>
                    </button>
                  </div>
                </div>

                {filteredSettlements.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-800/40 text-center space-y-1">
                    <p className="text-xs font-bold text-slate-300">
                      {settlementFilter === 'pending' ? '🎉 No pending transfers!' : 'No transfers match this filter.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredSettlements.map((st, i) => {
                      const isSettled = st.isSettled;

                      return (
                        <div
                          key={st.id || i}
                          className={cn(
                            'p-3 rounded-xl flex flex-col gap-2.5 transition-all',
                            isSettled
                              ? 'border border-emerald-500/25 bg-emerald-500/5'
                              : 'border border-rose-500/20 bg-rose-500/5'
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={cn(
                                  'w-8 h-8 rounded-lg bg-gradient-to-tr flex items-center justify-center font-black text-xs text-white shrink-0',
                                  avatarGradient(st.fromName)
                                )}
                              >
                                {st.fromName[0]}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                                  <span className="text-rose-400 font-extrabold">{st.fromName}</span>
                                  <span className="text-slate-500 font-normal">→</span>
                                  <span className="text-emerald-400 font-extrabold">{st.toName}</span>
                                  {isSettled ? (
                                    <span className="text-[9px] font-extrabold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                      <CheckCircle2 className="w-2.5 h-2.5" /> Settled
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-extrabold text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                      <Clock className="w-2.5 h-2.5" /> Due
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                                  {isSettled
                                    ? `Paid ${st.paymentMethod ? `via ${st.paymentMethod}` : ''} ${st.note ? `• "${st.note}"` : ''}`
                                    : 'Settlement debt transfer'}
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div
                                className={cn(
                                  'text-base font-black tabular-nums',
                                  isSettled ? 'text-emerald-400 line-through opacity-75' : 'text-white'
                                )}
                              >
                                {currency}{st.amount.toLocaleString('en-IN')}
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="pt-1.5 border-t border-white/5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              {isSettled ? (
                                <motion.button
                                  whileTap={{ scale: 0.94 }}
                                  onClick={() => handleReopenSettlement(st)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors inline-flex items-center gap-1"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Revert</span>
                                </motion.button>
                              ) : (
                                <motion.button
                                  whileTap={{ scale: 0.94 }}
                                  onClick={() => openAcknowledgeModal(st)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 transition-all inline-flex items-center gap-1 shadow-sm"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Mark Paid</span>
                                </motion.button>
                              )}

                              {!isSettled && (
                                <motion.button
                                  whileTap={{ scale: 0.94 }}
                                  onClick={() => handleSendSettlementReminder(st)}
                                  className="px-2 py-1 rounded-lg text-[11px] font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors inline-flex items-center gap-1"
                                  title="WhatsApp reminder"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Remind</span>
                                </motion.button>
                              )}
                            </div>

                            {onRecordToLedger && (
                              <motion.button
                                whileTap={{ scale: 0.94 }}
                                onClick={() => handleRecordSettlement(st)}
                                className="px-2 py-1 rounded-lg text-[11px] font-bold text-violet-300 bg-violet-600/20 hover:bg-violet-600/30 transition-colors inline-flex items-center gap-1"
                                title="Record in Udharwale ledger"
                              >
                                <TrendingUp className="w-3 h-3" />
                                <span>Ledger</span>
                              </motion.button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div
                className="rounded-2xl p-3.5 space-y-3"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
              >
                <div>
                  <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                    Each person&apos;s share
                  </h3>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {tripSummary.hasUnevenShares
                      ? `Personal / partial splits change this — equal would be ${currency}${tripSummary.perHeadAverage.toLocaleString('en-IN')}`
                      : 'Paid vs their share and what\'s still due'}
                  </p>
                </div>

                <div className="space-y-2">
                  {tripSummary.participantSummaries.map((s) => {
                    const isOwed = s.netBalance > 0.01;
                    const owes = s.netBalance < -0.01;
                    const maxShare = Math.max(...tripSummary.participantSummaries.map((x) => x.totalShare), 1);
                    const barPct = Math.min(100, Math.max(0, (s.totalShare / maxShare) * 100));
                    const vsEqual = Math.round((s.totalShare - tripSummary.perHeadAverage) * 100) / 100;

                    return (
                      <div
                        key={s.participant.id}
                        className="p-3 rounded-xl space-y-2 border"
                        style={{
                          background: s.isFullySettled
                            ? 'rgba(16,185,129,0.04)'
                            : owes
                            ? 'rgba(244,63,94,0.04)'
                            : 'rgba(255,255,255,0.02)',
                          borderColor: s.isFullySettled
                            ? 'rgba(16,185,129,0.2)'
                            : owes
                            ? 'rgba(244,63,94,0.2)'
                            : 'var(--border-soft)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={cn(
                                'w-7 h-7 rounded-lg bg-gradient-to-tr flex items-center justify-center font-black text-[10px] text-white shrink-0',
                                avatarGradient(s.participant.name)
                              )}
                            >
                              {s.participant.name[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">
                                {s.participant.name}
                                {s.participant.isCurrentUser && <span className="text-[9px] text-violet-400 ml-1">(You)</span>}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                Share{' '}
                                <span className="font-bold text-slate-200">
                                  {currency}{s.totalShare.toLocaleString('en-IN')}
                                </span>
                                {tripSummary.hasUnevenShares && Math.abs(vsEqual) > 0.01 && (
                                  <span style={{ color: vsEqual > 0 ? '#fb7185' : '#34d399' }}>
                                    {' '}
                                    ({vsEqual > 0 ? '+' : '−'}
                                    {currency}
                                    {Math.abs(vsEqual).toLocaleString('en-IN')})
                                  </span>
                                )}
                                {' · '}paid {currency}{s.totalPaid.toLocaleString('en-IN')}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {owes ? (
                              s.pendingDebt > 0 ? (
                                <span className="text-[10px] font-extrabold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 inline-flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {currency}{s.pendingDebt.toLocaleString('en-IN')} Due
                                </span>
                              ) : (
                                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> All Paid
                                </span>
                              )
                            ) : isOwed ? (
                              s.pendingCredit > 0 ? (
                                <span className="text-[10px] font-extrabold text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20 inline-flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {currency}{s.pendingCredit.toLocaleString('en-IN')} Due
                                </span>
                              ) : (
                                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Received
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                                Even
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="h-1 rounded-full bg-slate-800/80 overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', isOwed ? 'bg-emerald-500' : owes ? 'bg-rose-500' : 'bg-slate-500')}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'expenses' && (
            <motion.div
              key="expenses"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="space-y-3"
            >
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search expenses…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-2xl outline-none font-medium"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className="px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0"
                  style={{
                    background: categoryFilter === 'all' ? 'rgba(99,102,241,0.2)' : 'var(--bg-surface)',
                    border: `1px solid ${categoryFilter === 'all' ? 'rgba(99,102,241,0.35)' : 'var(--border-soft)'}`,
                    color: categoryFilter === 'all' ? '#a5b4fc' : 'var(--text-muted)',
                  }}
                >
                  All
                </button>
                {Object.entries(CATEGORY_CONFIG).map(([catKey, config]) => (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setCategoryFilter(catKey)}
                    className="px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 inline-flex items-center gap-1"
                    style={{
                      background: categoryFilter === catKey ? 'rgba(99,102,241,0.2)' : 'var(--bg-surface)',
                      border: `1px solid ${categoryFilter === catKey ? 'rgba(99,102,241,0.35)' : 'var(--border-soft)'}`,
                      color: categoryFilter === catKey ? '#a5b4fc' : 'var(--text-muted)',
                    }}
                  >
                    <span>{config.icon}</span>
                    <span>{config.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>

              {currentTrip?.expenses.length === 0 && (
                <div
                  className="rounded-2xl p-5 text-center"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                >
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>No expenses yet</p>
                  <p className="text-xs mt-1 mb-3" style={{ color: 'var(--text-muted)' }}>
                    Add the first bill, or load a sample trip.
                  </p>
                  <button
                    type="button"
                    onClick={handleLoadDemoTrip}
                    className="text-xs font-bold px-3 py-2 rounded-xl"
                    style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}
                  >
                    Load sample trip
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {filteredExpenses.length === 0 && (currentTrip?.expenses.length || 0) > 0 ? (
                  <p className="text-center text-xs py-8" style={{ color: 'var(--text-muted)' }}>
                    No matching expenses.
                  </p>
                ) : (
                  filteredExpenses.map((expense) => {
                    const cat = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.general;
                    const payerNames = expense.paidBy
                      .map((p) => currentTrip?.participants.find((pt) => pt.id === p.participantId)?.name || 'Friend')
                      .join(', ');
                    const splitCount = expense.splitAmong.length || 1;
                    const totalPeople = currentTrip?.participants.length || splitCount;
                    const splitLabel =
                      splitCount <= 1
                        ? 'personal'
                        : splitCount < totalPeople
                          ? `split ${splitCount}/${totalPeople}`
                          : `split ${splitCount}`;

                    return (
                      <button
                        key={expense.id}
                        type="button"
                        onClick={() => openEditExpenseModal(expense)}
                        className="w-full text-left rounded-2xl p-3.5 flex items-center gap-3 transition-opacity active:opacity-80"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                      >
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0"
                          style={{ background: cat.bg, color: cat.tone }}
                        >
                          {cat.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                              {expense.title}
                            </h4>
                            <p className="text-sm font-black tabular-nums shrink-0" style={{ color: 'var(--text-primary)' }}>
                              {currency}{expense.amount.toLocaleString('en-IN')}
                            </p>
                          </div>
                          <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                            {payerNames} · {splitLabel} · {expense.date}
                          </p>
                        </div>
                      </button>
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
              className="relative w-full max-w-md rounded-2xl overflow-hidden flex flex-col shadow-2xl"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-soft)',
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-3 border-b shrink-0"
                style={{ borderColor: 'var(--border-soft)' }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white">Acknowledge Payment</h3>
                    <p className="text-[10px] text-slate-400">Confirm settlement has been cleared</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAcknowledgeModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmAcknowledge} className="p-4 space-y-3.5">
                <div
                  className="p-3 rounded-xl space-y-1 border"
                  style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.2)' }}
                >
                  <span className="text-[9px] font-extrabold uppercase text-emerald-400 tracking-wider">
                    Settlement Transfer
                  </span>
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>
                      <strong className="text-rose-400">{acknowledgingSettlement.fromName}</strong> paid to{' '}
                      <strong className="text-emerald-400">{acknowledgingSettlement.toName}</strong>
                    </span>
                    <span className="text-base font-black text-white tabular-nums">
                      {currency}{acknowledgingSettlement.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Payment Mode</label>
                  <div className="grid grid-cols-4 gap-1.5">
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
                          'py-1.5 px-1 rounded-lg text-xs font-extrabold transition-all text-center',
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

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Note / Reference (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Paid via Google Pay, Txn #49102"
                    value={ackNote}
                    onChange={(e) => setAckNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none font-medium text-white"
                    style={{
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border-soft)',
                    }}
                  />
                </div>

                <div className="pt-1">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="submit"
                    className="w-full py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm & Mark Settled</span>
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════
          ADD / EDIT EXPENSE MODAL
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
              className="relative w-full max-w-lg rounded-2xl overflow-hidden flex flex-col shadow-2xl"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-soft)',
                maxHeight: '92vh',
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-3 border-b shrink-0"
                style={{ borderColor: 'var(--border-soft)' }}
              >
                <h3 className="font-black text-sm text-white">
                  {editingExpense ? 'Edit Trip Expense' : 'Add Trip Expense'}
                </h3>
                <button
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveExpense} className="p-4 space-y-3.5 overflow-y-auto flex-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Item / Expense Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Seafood Dinner at Shack, Villa Stay, Cab"
                    value={expTitle}
                    onChange={(e) => setExpTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none font-medium text-white"
                    style={{
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border-soft)',
                    }}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Total Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 5000"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-sm font-black outline-none text-emerald-400"
                      style={{
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border-soft)',
                      }}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Date</label>
                    <input
                      type="date"
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs outline-none font-medium text-white"
                      style={{
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border-soft)',
                      }}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Category</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
                      const isSelected = expCategory === key;
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => setExpCategory(key as ExpenseCategory)}
                          className={cn(
                            'p-1.5 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all',
                            isSelected
                              ? 'bg-violet-600 text-white shadow-sm'
                              : 'bg-slate-800/60 text-slate-400 hover:text-white'
                          )}
                        >
                          <span className="text-sm">{cfg.icon}</span>
                          <span className="text-[10px] truncate max-w-full">{cfg.label.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Who Paid */}
                <div
                  className="p-3 rounded-xl space-y-2.5"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <CreditCard className="w-3 h-3 text-emerald-400" />
                      Who Paid for This?
                    </label>

                    <div className="flex p-0.5 rounded-lg text-[10px] font-bold" style={{ background: 'var(--bg-raised)' }}>
                      <button
                        type="button"
                        onClick={() => setPayerMode('single')}
                        className={cn(
                          'px-2 py-0.5 rounded transition-colors',
                          payerMode === 'single' ? 'bg-violet-600 text-white' : 'text-slate-400'
                        )}
                      >
                        Single
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
                          'px-2 py-0.5 rounded transition-colors',
                          payerMode === 'multiple' ? 'bg-violet-600 text-white' : 'text-slate-400'
                        )}
                      >
                        Multiple ✨
                      </button>
                    </div>
                  </div>

                  {payerMode === 'single' ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      {currentTrip.participants.map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => setSinglePayerId(p.id)}
                          className={cn(
                            'p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all text-left',
                            singlePayerId === p.id
                              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800/40 text-slate-300 border border-transparent'
                          )}
                        >
                          <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-black">
                            {p.name[0]}
                          </span>
                          <span className="truncate">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-400">
                        Specify exact amount paid by each person:
                      </p>

                      <div className="space-y-1.5">
                        {currentTrip.participants.map((p) => {
                          const currentVal = multiplePayers[p.id] || '';
                          return (
                            <div
                              key={p.id}
                              className="p-2 rounded-lg flex items-center justify-between gap-2"
                              style={{ background: 'var(--bg-raised)' }}
                            >
                              <span className="text-xs font-bold text-white truncate min-w-[70px]">
                                {p.name}
                              </span>

                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0"
                                  value={currentVal}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setMultiplePayers((prev) => ({ ...prev, [p.id]: val }));
                                  }}
                                  className="w-20 px-2 py-1 text-xs font-black text-right outline-none rounded text-emerald-400"
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
                          'p-2 rounded-lg text-[11px] font-bold flex items-center justify-between',
                          isPayerBalanced
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        )}
                      >
                        <span>
                          {isPayerBalanced
                            ? '✨ Balanced!'
                            : `Remaining: ${currency}${payerRemainingBalance}`}
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
                  className="p-3 rounded-xl space-y-2"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Split className="w-3 h-3 text-violet-400" />
                      Split Among
                    </label>

                    <div className="flex p-0.5 rounded-lg text-[10px] font-bold" style={{ background: 'var(--bg-raised)' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSplitMode('all');
                          setSelectedBeneficiaries(currentTrip.participants.map((p) => p.id));
                        }}
                        className={cn(
                          'px-2 py-0.5 rounded transition-colors',
                          splitMode === 'all' ? 'bg-violet-600 text-white' : 'text-slate-400'
                        )}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSplitMode('custom')}
                        className={cn(
                          'px-2 py-0.5 rounded transition-colors',
                          splitMode === 'custom' ? 'bg-violet-600 text-white' : 'text-slate-400'
                        )}
                      >
                        Custom
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {currentTrip.participants.map((p) => {
                      const isChecked = selectedBeneficiaries.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={cn(
                            'p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all',
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
                    <div className="text-[10px] font-semibold pt-0.5" style={{ color: '#a5b4fc' }}>
                      {selectedBeneficiaries.length === 1
                        ? `Personal — full ${currency}${parsedTotalAmount.toLocaleString('en-IN')} counts only for them`
                        : selectedBeneficiaries.length < (currentTrip?.participants.length || selectedBeneficiaries.length)
                          ? `${currency}${Math.round((parsedTotalAmount / selectedBeneficiaries.length) * 100) / 100} each for ${selectedBeneficiaries.length}/${currentTrip?.participants.length} people`
                          : `${currency}${Math.round((parsedTotalAmount / selectedBeneficiaries.length) * 100) / 100}/head for everyone`}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Lobster special, Innova cab"
                    value={expNotes}
                    onChange={(e) => setExpNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none font-medium text-white"
                    style={{
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border-soft)',
                    }}
                  />
                </div>

                <div className="pt-1">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="submit"
                    disabled={payerMode === 'multiple' && !isPayerBalanced}
                    className={cn(
                      'w-full py-2.5 rounded-xl text-xs font-black text-white shadow-xl transition-all',
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
              className="relative w-full max-w-md rounded-2xl overflow-hidden flex flex-col shadow-2xl"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-soft)',
                maxHeight: '90vh',
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-3 border-b shrink-0"
                style={{ borderColor: 'var(--border-soft)' }}
              >
                <h3 className="font-black text-sm text-white">Create New Trip</h3>
                <button
                  onClick={() => setIsNewTripModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTrip} className="p-4 space-y-3.5 overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Trip Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Manali Vacation, Goa Trip, Friday Dinner"
                    value={newTripName}
                    onChange={(e) => setNewTripName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none font-medium text-white"
                    style={{
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border-soft)',
                    }}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Destination</label>
                    <input
                      type="text"
                      placeholder="e.g. North Goa"
                      value={newTripDestination}
                      onChange={(e) => setNewTripDestination(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs outline-none font-medium text-white"
                      style={{
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border-soft)',
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Start Date</label>
                    <input
                      type="date"
                      value={newTripStartDate}
                      onChange={(e) => setNewTripStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs outline-none font-medium text-white"
                      style={{
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border-soft)',
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Add from Contacts</span>
                    <span className="text-[10px] text-violet-400 font-semibold">
                      {selectedContactIds.length} selected
                    </span>
                  </label>

                  {contacts.length === 0 ? (
                    <p className="text-[11px] text-slate-500">No contacts saved yet.</p>
                  ) : (
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
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
                              'w-full p-2 rounded-lg text-xs font-bold flex items-center justify-between transition-all',
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

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    Or Other Names (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Aman, Priya, Rohit"
                    value={customParticipantNames}
                    onChange={(e) => setCustomParticipantNames(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none font-medium text-white"
                    style={{
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border-soft)',
                    }}
                  />
                </div>

                <div className="pt-1">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="submit"
                    className="w-full py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-xl transition-all"
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
              className="relative w-full max-w-md rounded-2xl overflow-hidden flex flex-col shadow-2xl p-4 space-y-3.5"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-soft)',
              }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-white">Share Trip Expenses</h3>
                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Anyone with this link can view the complete transparent expense breakdown, chat stream, and settlement plan without needing to log in.
              </p>

              {publicShareUrl && (
                <div className="space-y-1.5">
                  <div
                    className="p-2.5 rounded-xl flex items-center justify-between gap-2"
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
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-violet-600 text-white shrink-0 hover:bg-violet-500"
                    >
                      {copiedShareLink ? 'Copied!' : 'Copy Link'}
                    </motion.button>
                  </div>
                </div>
              )}

              <div className="pt-1">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleShareToWhatsApp}
                  className="w-full py-2.5 rounded-xl text-xs font-extrabold text-white flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Formatted WhatsApp Chat</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
