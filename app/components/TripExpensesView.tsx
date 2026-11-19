'use client';

import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CreditCard,
  FolderPlus,
  RotateCcw,
  Search,
  Send,
  Share2,
  Split,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CATEGORY_CONFIG,
  ExpenseCategory,
  ExpensePayer,
  ExpenseSplit,
  Trip,
  TripExpense,
  TripParticipant,
  TripSettlement,
  calculateTripSummary,
  formatWhatsAppSummary,
  getDemoTrip,
} from './trip-types';
import { Contact } from './types';

const STORAGE_KEY = 'udharwale-trips-v1';

/* ─── Avatar color generator ─── */
const AVATAR_TONES = [
  'bg-[#0f766e]',
  'bg-[#115e59]',
  'bg-[#134e4a]',
  'bg-[#1e3a36]',
  'bg-[#0e7490]',
  'bg-[#3d4f47]',
];
function avatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
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
  const [showDetail, setShowDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'settlement'>('settlement');
  const [tabReady, setTabReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modals
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAcknowledgeModalOpen, setIsAcknowledgeModalOpen] = useState(false);
  const [acknowledgingSettlement, setAcknowledgingSettlement] = useState<TripSettlement | null>(null);
  const [ackPaymentMethod, setAckPaymentMethod] = useState<'UPI' | 'Cash' | 'Bank Transfer' | 'Other'>('UPI');
  const [ackNote, setAckNote] = useState('');
  const [ackSettleMode, setAckSettleMode] = useState<'full' | 'partial'>('full');
  const [ackAmount, setAckAmount] = useState('');

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

    // Try fetching from server
    fetch('/api/trips')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Trips API failed');
      })
      .then((remoteTrips: Trip[]) => {
        if (Array.isArray(remoteTrips) && remoteTrips.length > 0) {
          setTrips(remoteTrips);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteTrips));
          } catch {}
        }
      })
      .catch(() => {});
  }, [userName, contacts]);

  // Selected Trip — null on list view
  const currentTrip = useMemo(() => {
    if (!selectedTripId) return null;
    return trips.find((t) => t.id === selectedTripId) || null;
  }, [trips, selectedTripId]);

  const openTrip = (id: string) => {
    setSelectedTripId(id);
    setShowDetail(true);
    setTabReady(false);
  };

  const backToList = () => {
    setShowDetail(false);
  };

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
  const openAcknowledgeModal = (st: TripSettlement, mode: 'full' | 'partial' = 'full') => {
    const remaining = st.remainingAmount > 0.01 ? st.remainingAmount : Math.max(0, st.amount - (st.paidAmount || 0));
    setAcknowledgingSettlement(st);
    setAckPaymentMethod((st.paymentMethod as any) || 'UPI');
    setAckNote(st.note || '');
    setAckSettleMode(mode);
    setAckAmount(mode === 'full' ? remaining.toString() : '');
    setIsAcknowledgeModalOpen(true);
  };

  const handleConfirmAcknowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTrip || !acknowledgingSettlement) return;

    const total = acknowledgingSettlement.amount;
    const previousPaid = acknowledgingSettlement.paidAmount || 0;
    const remaining = Math.max(0, Math.round((total - previousPaid) * 100) / 100);
    const parsed = parseFloat(ackAmount);
    const paymentAmt =
      ackSettleMode === 'full'
        ? remaining
        : Math.min(remaining, Math.max(0, Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0));

    if (paymentAmt <= 0.009) {
      showToast('Enter a valid payment amount.', 'error');
      return;
    }

    const newPaid = Math.min(total, Math.round((previousPaid + paymentAmt) * 100) / 100);
    const newRemaining = Math.max(0, Math.round((total - newPaid) * 100) / 100);
    const fullySettled = newRemaining <= 0.01;
    const nowIso = new Date().toISOString();
    const paymentRecord = {
      id: `pay_${Date.now()}`,
      amount: paymentAmt,
      paidAt: nowIso,
      paidBy: userName || 'You',
      paymentMethod: ackPaymentMethod,
      note: ackNote.trim(),
    };

    const existingSettlements = currentTrip.settlements ? [...currentTrip.settlements] : [];
    const index = existingSettlements.findIndex((s) => s.id === acknowledgingSettlement.id);

    const record: TripSettlement = {
      ...acknowledgingSettlement,
      paidAmount: fullySettled ? total : newPaid,
      remainingAmount: fullySettled ? 0 : newRemaining,
      isSettled: fullySettled,
      isPartial: !fullySettled && newPaid > 0.01,
      payments: [...(acknowledgingSettlement.payments || []), paymentRecord],
      settledAt: nowIso,
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
    showToast(
      fullySettled
        ? `Payment of ₹${paymentAmt.toLocaleString('en-IN')} marked fully settled! ✅`
        : `Partial payment of ₹${paymentAmt.toLocaleString('en-IN')} recorded · ₹${newRemaining.toLocaleString('en-IN')} remaining`,
      'success'
    );
  };

  const handleReopenSettlement = async (st: TripSettlement) => {
    if (!currentTrip) return;
    const existingSettlements = currentTrip.settlements ? [...currentTrip.settlements] : [];
    const index = existingSettlements.findIndex((s) => s.id === st.id);

    const reset: TripSettlement = {
      ...st,
      paidAmount: 0,
      remainingAmount: st.amount,
      isSettled: false,
      isPartial: false,
      payments: [],
      settledAt: undefined,
      settledBy: undefined,
      paymentMethod: undefined,
      note: undefined,
    };

    if (index >= 0) {
      existingSettlements[index] = reset;
    } else {
      existingSettlements.push(reset);
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
    const due = st.remainingAmount > 0.01 ? st.remainingAmount : st.amount;
    const partialNote =
      st.isPartial || (st.paidAmount || 0) > 0.01
        ? ` (₹${(st.paidAmount || 0).toLocaleString('en-IN')} already paid)`
        : '';
    const text = `Hey ${st.fromName}! 👋 Friendly reminder regarding our *${currentTrip.name}* trip expenses:\n\nPending settlement amount: *₹${due.toLocaleString('en-IN')}*${partialNote} payable to *${st.toName}*.\n\nPlease clear it when free! Check full breakdown here: ${publicShareUrl || window.location.href}`;
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
        avatarColor: 'bg-[#0f766e]',
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
          avatarColor: 'bg-[#0f766e]',
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
            avatarColor: 'bg-[#3d4f47]',
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
    setShowDetail(true);
    setTabReady(false);
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
    setShowDetail(true);
    setTabReady(false);
    showToast('Loaded sample Goa Trip', 'success');
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
    const ledgerAmount =
      settlement.remainingAmount > 0.01 ? settlement.remainingAmount : settlement.amount;

    try {
      await onRecordToLedger(targetContactId, ledgerAmount, type, remark);
      showToast(
        `Recorded ₹${ledgerAmount.toLocaleString('en-IN')} settlement in ${otherPersonName}'s ledger`,
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

  const pendingSettlements = useMemo(
    () => (tripSummary ? tripSummary.settlements.filter((s) => !s.isSettled) : []),
    [tripSummary]
  );
  const settledSettlements = useMemo(
    () => (tripSummary ? tripSummary.settlements.filter((s) => s.isSettled) : []),
    [tripSummary]
  );

  useEffect(() => {
    if (!tripSummary || tabReady || !showDetail) return;
    setActiveTab(tripSummary.pendingSettlementsCount > 0 ? 'settlement' : 'expenses');
    setTabReady(true);
  }, [tripSummary, tabReady, showDetail]);

  const tripListRows = useMemo(() => {
    return trips.map((trip) => {
      const summary = calculateTripSummary(trip);
      return {
        trip,
        pending: summary.totalPendingAmount,
        pendingCount: summary.pendingSettlementsCount,
        totalSpend: summary.totalSpend,
      };
    });
  }, [trips]);

  const currency = currentTrip?.currency || '₹';

  const formatWhen = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const remainingForAck = acknowledgingSettlement
    ? acknowledgingSettlement.remainingAmount > 0.01
      ? acknowledgingSettlement.remainingAmount
      : Math.max(0, acknowledgingSettlement.amount - (acknowledgingSettlement.paidAmount || 0))
    : 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {!showDetail || !currentTrip ? (
        <>
          <div
            className="px-4 pt-3 pb-3 shrink-0 flex items-center justify-between gap-3"
            style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-soft)' }}
          >
            <div>
              <h1 className="text-xl font-bold leading-none">Trips</h1>
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {trips.length} trip{trips.length === 1 ? '' : 's'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewTripModalOpen(true)}
              className="h-9 px-3.5 rounded-xl text-xs font-semibold text-white inline-flex items-center gap-1.5"
              style={{ background: 'var(--primary)' }}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              New trip
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 pb-8">
            {tripListRows.length === 0 ? (
              <div
                className="rounded-2xl p-8 text-center space-y-3"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
              >
                <p className="text-sm font-semibold">No trips yet</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Split bills with friends, then settle who pays whom.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewTripModalOpen(true)}
                    className="h-11 rounded-xl text-sm font-semibold text-white"
                    style={{ background: 'var(--primary)' }}
                  >
                    Create trip
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadDemoTrip}
                    className="h-11 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border-soft)' }}
                  >
                    Load sample trip
                  </button>
                </div>
              </div>
            ) : (
              tripListRows.map(({ trip, pending, pendingCount, totalSpend }) => (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => openTrip(trip.id)}
                  className="w-full text-left rounded-2xl px-3.5 py-3.5 flex items-center gap-3 active:opacity-80"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                >
                  <div
                    className={cn(
                      'w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0',
                      avatarGradient(trip.name)
                    )}
                  >
                    {trip.name.trim()[0]?.toUpperCase() || 'T'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{trip.name}</p>
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                      {[trip.destination || null, `${trip.participants.length} people`, `spent ${trip.currency || '₹'}${totalSpend.toLocaleString('en-IN')}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {pending > 0.01 ? (
                      <>
                        <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--rose)' }}>
                          {(trip.currency || '₹')}
                          {pending.toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                          {pendingCount} due
                        </p>
                      </>
                    ) : (
                      <p className="text-xs font-semibold" style={{ color: 'var(--emerald)' }}>
                        Settled
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div
            className="px-4 pt-3 pb-3 shrink-0 space-y-3"
            style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-soft)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={backToList}
                  className="h-9 w-9 rounded-xl inline-flex items-center justify-center shrink-0"
                  style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)' }}
                  aria-label="Back to trips"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{currentTrip.name}</p>
                  <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                    {[currentTrip.destination || null, `${currentTrip.participants.length} people`].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleGenerateShareLink}
                  className="h-9 w-9 rounded-xl inline-flex items-center justify-center"
                  style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)' }}
                  aria-label="Share link"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={openAddExpenseModal}
                  className="h-9 px-3 rounded-xl text-xs font-semibold text-white"
                  style={{ background: 'var(--primary)' }}
                >
                  + Expense
                </button>
              </div>
            </div>

            {tripSummary && (
              <div
                className="rounded-2xl px-4 py-4 text-center"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)' }}
              >
                {tripSummary.totalPendingAmount > 0.01 ? (
                  <>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Still to settle
                    </p>
                    <p className="text-3xl font-bold tabular-nums mt-1" style={{ color: 'var(--rose)' }}>
                      {currency}
                      {tripSummary.totalPendingAmount.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                      {tripSummary.pendingSettlementsCount} payment
                      {tripSummary.pendingSettlementsCount === 1 ? '' : 's'} left · total spent{' '}
                      {currency}
                      {tripSummary.totalSpend.toLocaleString('en-IN')}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--emerald)' }}>
                      <CheckCircle2 className="w-4 h-4" />
                      All settled
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                      Total spent {currency}
                      {tripSummary.totalSpend.toLocaleString('en-IN')} · {currentTrip.participants.length} people
                    </p>
                  </>
                )}
              </div>
            )}

            <div
              className="flex p-1 rounded-2xl gap-1"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)' }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('settlement')}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{
                  background: activeTab === 'settlement' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'settlement' ? 'var(--primary-foreground)' : 'var(--text-muted)',
                }}
              >
                Who pays
                {tripSummary && tripSummary.pendingSettlementsCount > 0
                  ? ` (${tripSummary.pendingSettlementsCount})`
                  : ''}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('expenses')}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{
                  background: activeTab === 'expenses' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'expenses' ? 'var(--primary-foreground)' : 'var(--text-muted)',
                }}
              >
                Expenses ({currentTrip.expenses.length})
              </button>
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
                  {tripSummary.settlements.length === 0 ? (
                    <div
                      className="rounded-2xl p-8 text-center"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                    >
                      <p className="text-sm font-semibold">Everyone is even</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        No payments needed
                      </p>
                    </div>
                  ) : (
                    <>
                      {pendingSettlements.map((st) => {
                        const isPartial = st.isPartial || ((st.paidAmount || 0) > 0.01 && !st.isSettled);
                        const remaining =
                          st.remainingAmount > 0.01
                            ? st.remainingAmount
                            : Math.max(0, st.amount - (st.paidAmount || 0));
                        return (
                          <div
                            key={st.id}
                            className="rounded-2xl p-4 space-y-3"
                            style={{
                              background: 'var(--bg-surface)',
                              border: `1px solid ${isPartial ? 'rgba(180,83,9,0.25)' : 'var(--border-soft)'}`,
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs text-white shrink-0',
                                  avatarGradient(st.fromName)
                                )}
                              >
                                {st.fromName[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold leading-snug">
                                  <span style={{ color: 'var(--rose)' }}>{st.fromName}</span>
                                  <span style={{ color: 'var(--text-muted)' }}> pays </span>
                                  <span style={{ color: 'var(--emerald)' }}>{st.toName}</span>
                                </p>
                                {isPartial && (
                                  <p className="text-[11px] mt-0.5" style={{ color: '#b45309' }}>
                                    {currency}
                                    {(st.paidAmount || 0).toLocaleString('en-IN')} paid · {currency}
                                    {remaining.toLocaleString('en-IN')} left
                                  </p>
                                )}
                              </div>
                              <p className="text-xl font-bold tabular-nums shrink-0">
                                {currency}
                                {remaining.toLocaleString('en-IN')}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openAcknowledgeModal(st, 'full')}
                                className="flex-1 min-w-[7rem] h-11 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-1.5"
                                style={{ background: 'var(--emerald)' }}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                {isPartial ? 'Pay rest' : 'Mark paid'}
                              </button>
                              <button
                                type="button"
                                onClick={() => openAcknowledgeModal(st, 'partial')}
                                className="h-11 px-3 rounded-xl text-sm font-semibold"
                                style={{
                                  background: 'var(--bg-raised)',
                                  color: 'var(--text-secondary)',
                                  border: '1px solid var(--border-soft)',
                                }}
                              >
                                Partial
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendSettlementReminder(st)}
                                className="h-11 px-3 rounded-xl text-sm font-semibold inline-flex items-center gap-1"
                                style={{
                                  background: 'var(--bg-raised)',
                                  color: 'var(--text-secondary)',
                                  border: '1px solid var(--border-soft)',
                                }}
                              >
                                <Send className="w-3.5 h-3.5" />
                                Remind
                              </button>
                              {(st.fromContactId || st.toContactId || contacts.length > 0) && (
                                <button
                                  type="button"
                                  onClick={() => handleRecordSettlement(st)}
                                  className="h-11 px-3 rounded-xl text-sm font-semibold"
                                  style={{
                                    background: 'var(--bg-raised)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-soft)',
                                  }}
                                >
                                  To ledger
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {settledSettlements.length > 0 && (
                        <div className="pt-2 space-y-2">
                          <p
                            className="text-[11px] font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            Already paid
                          </p>
                          {settledSettlements.map((st) => (
                            <div
                              key={st.id}
                              className="rounded-2xl px-3.5 py-3 flex items-center gap-3"
                              style={{
                                background: 'rgba(4,120,87,0.06)',
                                border: '1px solid rgba(4,120,87,0.15)',
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--emerald)' }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">
                                  <span className="font-semibold">{st.fromName}</span>
                                  <span style={{ color: 'var(--text-muted)' }}> → </span>
                                  <span className="font-semibold">{st.toName}</span>
                                </p>
                                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                  {currency}
                                  {st.amount.toLocaleString('en-IN')}
                                  {st.settledBy ? ` · confirmed by ${st.settledBy}` : ''}
                                  {st.settledAt ? ` · ${formatWhen(st.settledAt)}` : ''}
                                  {st.paymentMethod ? ` · ${st.paymentMethod}` : ''}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleReopenSettlement(st)}
                                className="h-8 px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1"
                                style={{ color: 'var(--text-muted)', background: 'var(--bg-raised)' }}
                              >
                                <RotateCcw className="w-3 h-3" />
                                Undo
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <div className="pt-2 space-y-2">
                    <p
                      className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Everyone
                    </p>
                    {tripSummary.participantSummaries.map((s) => {
                      const owes = s.netBalance < -0.01;
                      const isOwed = s.netBalance > 0.01;
                      const amount = Math.abs(s.netBalance);
                      return (
                        <div
                          key={s.participant.id}
                          className="rounded-2xl px-3.5 py-3 flex items-center gap-3"
                          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                        >
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center font-semibold text-[10px] text-white shrink-0',
                              avatarGradient(s.participant.name)
                            )}
                          >
                            {s.participant.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {s.participant.name}
                              {s.participant.isCurrentUser ? ' (You)' : ''}
                            </p>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              Spent {currency}
                              {s.totalPaid.toLocaleString('en-IN')} · share {currency}
                              {s.totalShare.toLocaleString('en-IN')}
                            </p>
                          </div>
                          {owes ? (
                            <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--rose)' }}>
                              owes {currency}
                              {amount.toLocaleString('en-IN')}
                            </span>
                          ) : isOwed ? (
                            <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--emerald)' }}>
                              gets {currency}
                              {amount.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                              even
                            </span>
                          )}
                        </div>
                      );
                    })}
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
                    <Search
                      className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: 'var(--text-muted)' }}
                    />
                    <input
                      type="text"
                      placeholder="Search expenses…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl outline-none font-medium"
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
                      className="px-3 py-1.5 rounded-full text-[11px] font-semibold shrink-0"
                      style={{
                        background: categoryFilter === 'all' ? 'var(--primary)' : 'var(--bg-surface)',
                        color: categoryFilter === 'all' ? 'var(--primary-foreground)' : 'var(--text-muted)',
                        border: `1px solid ${categoryFilter === 'all' ? 'var(--primary)' : 'var(--border-soft)'}`,
                      }}
                    >
                      All
                    </button>
                    {Object.entries(CATEGORY_CONFIG).map(([catKey, config]) => (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => setCategoryFilter(catKey)}
                        className="px-3 py-1.5 rounded-full text-[11px] font-semibold shrink-0"
                        style={{
                          background: categoryFilter === catKey ? 'var(--primary)' : 'var(--bg-surface)',
                          color: categoryFilter === catKey ? 'var(--primary-foreground)' : 'var(--text-muted)',
                          border: `1px solid ${categoryFilter === catKey ? 'var(--primary)' : 'var(--border-soft)'}`,
                        }}
                      >
                        {config.label.split(' ')[0]}
                      </button>
                    ))}
                  </div>

                  {currentTrip.expenses.length === 0 && (
                    <div
                      className="rounded-2xl p-8 text-center space-y-3"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                    >
                      <p className="text-sm font-semibold">No expenses yet</p>
                      <button
                        type="button"
                        onClick={openAddExpenseModal}
                        className="h-10 px-4 rounded-xl text-sm font-semibold text-white"
                        style={{ background: 'var(--primary)' }}
                      >
                        Add expense
                      </button>
                    </div>
                  )}

                  <div className="space-y-2">
                    {filteredExpenses.length === 0 && currentTrip.expenses.length > 0 ? (
                      <p className="text-center text-xs py-8" style={{ color: 'var(--text-muted)' }}>
                        No matching expenses
                      </p>
                    ) : (
                      filteredExpenses.map((expense) => {
                        const cat = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.general;
                        const payers = expense.paidBy
                          .map((p) => currentTrip.participants.find((pt) => pt.id === p.participantId)?.name)
                          .filter(Boolean) as string[];
                        const payerLabel =
                          payers.length === 0
                            ? 'Someone'
                            : payers.length === 1
                              ? payers[0]
                              : `${payers[0]} +${payers.length - 1}`;
                        const splitCount = expense.splitAmong.length || 1;
                        const totalPeople = currentTrip.participants.length || splitCount;
                        const splitLabel =
                          splitCount >= totalPeople
                            ? 'everyone'
                            : splitCount === 1
                              ? '1 person'
                              : `${splitCount} people`;

                        return (
                          <button
                            key={expense.id}
                            type="button"
                            onClick={() => openEditExpenseModal(expense)}
                            className="w-full text-left rounded-2xl px-3.5 py-3.5 active:opacity-80"
                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-bold truncate">{expense.title}</p>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                  <span className="font-semibold">{payerLabel}</span>
                                  {' paid · split '}
                                  {splitLabel}
                                </p>
                                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                  {[cat.label, expense.date].filter(Boolean).join(' · ')}
                                </p>
                              </div>
                              <p className="text-base font-bold tabular-nums shrink-0">
                                {currency}
                                {expense.amount.toLocaleString('en-IN')}
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
        </>
      )}

      {/* Mark paid sheet */}
      {isAcknowledgeModalOpen && acknowledgingSettlement && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={() => setIsAcknowledgeModalOpen(false)}
          />
          <div
            className="relative w-full max-w-md rounded-t-[20px] sm:rounded-[20px] overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
          >
            <div
              className="flex items-center justify-between px-5 pt-4 pb-3"
              style={{ borderBottom: '1px solid var(--border-soft)' }}
            >
              <div>
                <h3 className="text-base font-bold">Mark paid</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {acknowledgingSettlement.fromName} → {acknowledgingSettlement.toName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAcknowledgeModalOpen(false)}
                className="h-9 w-9 rounded-xl inline-flex items-center justify-center"
                style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAcknowledge} className="p-5 space-y-4">
              <div className="text-center py-2">
                <p className="text-3xl font-bold tabular-nums">
                  {currency}
                  {remainingForAck.toLocaleString('en-IN')}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  due now
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAckSettleMode('full');
                    setAckAmount(remainingForAck.toString());
                  }}
                  className="h-11 rounded-xl text-sm font-semibold"
                  style={{
                    background: ackSettleMode === 'full' ? 'var(--emerald)' : 'var(--bg-raised)',
                    color: ackSettleMode === 'full' ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  Full amount
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAckSettleMode('partial');
                    setAckAmount('');
                  }}
                  className="h-11 rounded-xl text-sm font-semibold"
                  style={{
                    background: ackSettleMode === 'partial' ? 'var(--emerald)' : 'var(--bg-raised)',
                    color: ackSettleMode === 'partial' ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  Partial
                </button>
              </div>

              {ackSettleMode === 'partial' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Amount paying now
                  </label>
                  <div className="relative">
                    <span
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {currency}
                    </span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={ackAmount}
                      onChange={(e) => setAckAmount(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-3 rounded-xl text-sm font-bold tabular-nums outline-none"
                      style={{
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border-soft)',
                        color: 'var(--text-primary)',
                      }}
                      placeholder="0"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  How was it paid?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['UPI', 'Cash', 'Bank Transfer', 'Other'] as const).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setAckPaymentMethod(m)}
                      className="h-10 rounded-xl text-xs font-semibold"
                      style={{
                        background: ackPaymentMethod === m ? 'var(--primary)' : 'var(--bg-raised)',
                        color: ackPaymentMethod === m ? 'var(--primary-foreground)' : 'var(--text-secondary)',
                      }}
                    >
                      {m === 'Bank Transfer' ? 'Bank' : m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Note (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. GPay"
                  value={ackNote}
                  onChange={(e) => setAckNote(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                  style={{
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <button
                type="submit"
                className="w-full h-12 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2"
                style={{ background: 'var(--emerald)' }}
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm paid
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add / edit expense sheet */}
      {isExpenseModalOpen && currentTrip && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={() => setIsExpenseModalOpen(false)}
          />
          <div
            className="relative w-full max-w-lg rounded-t-[20px] sm:rounded-[20px] overflow-hidden flex flex-col"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-soft)',
              maxHeight: '92vh',
            }}
          >
            <div
              className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0"
              style={{ borderBottom: '1px solid var(--border-soft)' }}
            >
              <h3 className="text-base font-bold">{editingExpense ? 'Edit expense' : 'Add expense'}</h3>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="h-9 w-9 rounded-xl inline-flex items-center justify-center"
                style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dinner, Cab, Stay"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl text-sm font-bold outline-none tabular-nums"
                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)' }}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)' }}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setExpCategory(key as ExpenseCategory)}
                      className="px-3 py-1.5 rounded-full text-[11px] font-semibold"
                      style={{
                        background: expCategory === key ? 'var(--primary)' : 'var(--bg-raised)',
                        color: expCategory === key ? 'var(--primary-foreground)' : 'var(--text-secondary)',
                      }}
                    >
                      {cfg.label.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <CreditCard className="w-3.5 h-3.5" />
                    Who paid?
                  </label>
                  <div className="flex p-0.5 rounded-lg text-[11px] font-semibold" style={{ background: 'var(--bg-raised)' }}>
                    <button
                      type="button"
                      onClick={() => setPayerMode('single')}
                      className="px-2.5 py-1 rounded-md"
                      style={{
                        background: payerMode === 'single' ? 'var(--primary)' : 'transparent',
                        color: payerMode === 'single' ? 'var(--primary-foreground)' : 'var(--text-muted)',
                      }}
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
                      className="px-2.5 py-1 rounded-md"
                      style={{
                        background: payerMode === 'multiple' ? 'var(--primary)' : 'transparent',
                        color: payerMode === 'multiple' ? 'var(--primary-foreground)' : 'var(--text-muted)',
                      }}
                    >
                      Multiple
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
                        className="p-2.5 rounded-xl text-xs font-semibold text-left"
                        style={{
                          background: singlePayerId === p.id ? 'rgba(15,118,110,0.12)' : 'var(--bg-raised)',
                          border: `1px solid ${singlePayerId === p.id ? 'var(--primary)' : 'var(--border-soft)'}`,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {currentTrip.participants.map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-xl flex items-center justify-between gap-2"
                        style={{ background: 'var(--bg-raised)' }}
                      >
                        <span className="text-xs font-semibold truncate">{p.name}</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            value={multiplePayers[p.id] || ''}
                            onChange={(e) => setMultiplePayers((prev) => ({ ...prev, [p.id]: e.target.value }))}
                            className="w-20 px-2 py-1.5 text-xs font-bold text-right outline-none rounded-lg tabular-nums"
                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)' }}
                          />
                          {payerRemainingBalance > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const assignedToOthers = Object.entries(multiplePayers)
                                  .filter(([k]) => k !== p.id)
                                  .reduce((acc, [, v]) => acc + (Number(v) || 0), 0);
                                const remainder = Math.max(0, parsedTotalAmount - assignedToOthers);
                                setMultiplePayers((prev) => ({ ...prev, [p.id]: String(remainder) }));
                              }}
                              className="text-[10px] font-semibold"
                              style={{ color: 'var(--primary)' }}
                            >
                              Fill
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <p
                      className="text-[11px] font-semibold"
                      style={{ color: isPayerBalanced ? 'var(--emerald)' : 'var(--rose)' }}
                    >
                      {isPayerBalanced
                        ? 'Balanced'
                        : `Remaining ${currency}${payerRemainingBalance.toLocaleString('en-IN')}`}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Split className="w-3.5 h-3.5" />
                    Split among
                  </label>
                  <div className="flex p-0.5 rounded-lg text-[11px] font-semibold" style={{ background: 'var(--bg-raised)' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSplitMode('all');
                        setSelectedBeneficiaries(currentTrip.participants.map((p) => p.id));
                      }}
                      className="px-2.5 py-1 rounded-md"
                      style={{
                        background: splitMode === 'all' ? 'var(--primary)' : 'transparent',
                        color: splitMode === 'all' ? 'var(--primary-foreground)' : 'var(--text-muted)',
                      }}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitMode('custom')}
                      className="px-2.5 py-1 rounded-md"
                      style={{
                        background: splitMode === 'custom' ? 'var(--primary)' : 'transparent',
                        color: splitMode === 'custom' ? 'var(--primary-foreground)' : 'var(--text-muted)',
                      }}
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
                        className="p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
                        style={{
                          background: isChecked ? 'rgba(15,118,110,0.12)' : 'var(--bg-raised)',
                          border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--border-soft)'}`,
                          color: 'var(--text-primary)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBeneficiaries([...selectedBeneficiaries, p.id]);
                            } else if (selectedBeneficiaries.length > 1) {
                              setSelectedBeneficiaries(selectedBeneficiaries.filter((id) => id !== p.id));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="truncate">{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="flex gap-2 pt-1">
                {editingExpense && (
                  <button
                    type="button"
                    onClick={async () => {
                      await handleDeleteExpense(editingExpense.id);
                      setIsExpenseModalOpen(false);
                    }}
                    className="h-12 px-4 rounded-xl text-sm font-semibold"
                    style={{ background: 'rgba(194,59,74,0.1)', color: 'var(--rose)' }}
                  >
                    Delete
                  </button>
                )}
                <button
                  type="submit"
                  disabled={payerMode === 'multiple' && !isPayerBalanced}
                  className="flex-1 h-12 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: 'var(--primary)' }}
                >
                  {editingExpense ? 'Save changes' : 'Add expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New trip sheet */}
      {isNewTripModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={() => setIsNewTripModalOpen(false)}
          />
          <div
            className="relative w-full max-w-md rounded-t-[20px] sm:rounded-[20px] overflow-hidden flex flex-col"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-soft)',
              maxHeight: '90vh',
            }}
          >
            <div
              className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0"
              style={{ borderBottom: '1px solid var(--border-soft)' }}
            >
              <h3 className="text-base font-bold">New trip</h3>
              <button
                type="button"
                onClick={() => setIsNewTripModalOpen(false)}
                className="h-9 w-9 rounded-xl inline-flex items-center justify-center"
                style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="p-5 space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Trip name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Goa Trip"
                  value={newTripName}
                  onChange={(e) => setNewTripName(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Destination
                  </label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={newTripDestination}
                    onChange={(e) => setNewTripDestination(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Start date
                  </label>
                  <input
                    type="date"
                    value={newTripStartDate}
                    onChange={(e) => setNewTripStartDate(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Add from contacts ({selectedContactIds.length})
                </label>
                {contacts.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    No contacts yet
                  </p>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-1">
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
                          className="w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between"
                          style={{
                            background: isSelected ? 'rgba(15,118,110,0.12)' : 'var(--bg-raised)',
                            border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-soft)'}`,
                            color: 'var(--text-primary)',
                          }}
                        >
                          <span>{c.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Other names (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aman, Priya"
                  value={customParticipantNames}
                  onChange={(e) => setCustomParticipantNames(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)' }}
                />
              </div>

              <button
                type="submit"
                className="w-full h-12 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'var(--primary)' }}
              >
                Create trip
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Share sheet */}
      {isShareModalOpen && currentTrip && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={() => setIsShareModalOpen(false)}
          />
          <div
            className="relative w-full max-w-md rounded-t-[20px] sm:rounded-[20px] overflow-hidden p-5 space-y-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Share trip</h3>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="h-9 w-9 rounded-xl inline-flex items-center justify-center"
                style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Anyone with the link can view expenses and who pays. Trip members with accounts can mark what they owe.
            </p>

            {publicShareUrl && (
              <div
                className="p-3 rounded-xl flex items-center justify-between gap-2"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)' }}
              >
                <span className="text-xs truncate font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {publicShareUrl}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(publicShareUrl);
                    setCopiedShareLink(true);
                    setTimeout(() => setCopiedShareLink(false), 2000);
                  }}
                  className="h-9 px-3 rounded-xl text-xs font-semibold text-white shrink-0"
                  style={{ background: 'var(--primary)' }}
                >
                  {copiedShareLink ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleShareToWhatsApp}
              disabled={isGeneratingShare}
              className="w-full h-12 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2"
              style={{ background: 'var(--emerald)' }}
            >
              <Share2 className="w-4 h-4" />
              {copiedWhatsApp ? 'Summary copied' : 'Share WhatsApp summary'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

