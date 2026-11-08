'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  X,
  Calendar,
  AlertCircle,
  FolderPlus,
} from 'lucide-react';
import { Contact } from './types';
import {
  Trip,
  TripExpense,
  TripParticipant,
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
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'local'>('synced');

  // Modals
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
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

    // Build paidBy array
    let paidBy: ExpensePayer[] = [];
    if (payerMode === 'single') {
      if (!singlePayerId) {
        showToast('Please select who paid this expense.', 'error');
        return;
      }
      paidBy = [{ participantId: singlePayerId, amount: amt }];
    } else {
      // Multiple payers check
      if (!isPayerBalanced) {
        showToast(`Payer amounts must sum to ${currentTrip.currency}${amt}. Remaining: ${currentTrip.currency}${payerRemainingBalance}`, 'error');
        return;
      }
      paidBy = Object.entries(multiplePayers)
        .filter(([, val]) => Number(val) > 0)
        .map(([id, val]) => ({ participantId: id, amount: Number(val) }));
    }

    // Build splitAmong array
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

    // Add selected contacts
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

    // Add custom participant names
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
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const updated = [newTrip, ...trips];
    setTrips(updated);
    setSelectedTripId(newTrip.id);
    setIsNewTripModalOpen(false);

    // Persist
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
    showToast('Loaded sample Goa Trip with partial bill splits! 🏖️', 'success');
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
        // Fallback local share URL preview
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
  const handleRecordSettlement = async (settlement: {
    fromName: string;
    toName: string;
    amount: number;
    fromContactId?: string;
    toContactId?: string;
  }) => {
    if (!currentTrip) return;
    // Determine which contact is involved with "You"
    const isFromMe = settlement.fromName.toLowerCase().includes('you') || settlement.fromName === userName;
    const isToMe = settlement.toName.toLowerCase().includes('you') || settlement.toName === userName;

    let targetContactId = isFromMe ? settlement.toContactId : settlement.fromContactId;
    const otherPersonName = isFromMe ? settlement.toName : settlement.fromName;

    // If no direct contact ID linked, try searching by name
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

    const type = isToMe ? 'gave' : 'got'; // If to me, they owe me (gave); if from me, I owe them (got)
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

  const currency = currentTrip?.currency || '₹';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* ── TOP BAR: TRIP SELECTOR & ACTIONS ── */}
      <div
        className="px-4 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3 border-b"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-soft)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-violet-500/20 shrink-0">
            <Compass className="h-5 w-5" />
          </div>

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
              <span className={syncStatus === 'synced' ? 'text-emerald-400' : 'text-slate-400'}>
                {syncStatus === 'synced' ? 'Synced ☁️' : 'Local Storage 💾'}
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
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
          </button>

          <button
            onClick={handleShareToWhatsApp}
            className="h-9 px-3 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 text-white flex items-center gap-1.5"
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
          </button>

          <button
            onClick={openAddExpenseModal}
            className="h-9 px-3.5 rounded-xl text-xs font-extrabold transition-all shadow-md active:scale-95 text-white flex items-center gap-1.5"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* ── SUB-HEADER: TRIP SUMMARY HERO CARD ── */}
      {currentTrip && tripSummary && (
        <div className="px-4 py-3 shrink-0" style={{ background: 'var(--bg-base)' }}>
          <div
            className="rounded-3xl p-4 sm:p-5 relative overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(99,102,241,0.08))',
              border: '1px solid rgba(139,92,246,0.22)',
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400">
                  Total Trip Spending
                </span>
                <div className="text-3xl sm:text-4xl font-black tabular-nums text-white mt-0.5">
                  {currency}{tripSummary.totalSpend.toLocaleString('en-IN')}
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
                    className="w-full sm:w-auto p-3 rounded-2xl flex items-center justify-between sm:justify-start gap-3"
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

                    <button
                      onClick={handleGenerateShareLink}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 transition-colors inline-flex items-center gap-1 shrink-0"
                      title="Public shareable link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Link</span>
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Quick demo trip loader if low expenses */}
            {currentTrip.expenses.length === 0 && (
              <div className="mt-4 pt-3 border-t border-violet-500/20 flex items-center justify-between">
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
        </div>
      )}

      {/* ── NAVIGATION PILLS: CHAT FEED vs SETTLEMENT vs ALL EXPENSES ── */}
      <div className="px-4 py-1 shrink-0 flex items-center gap-2">
        <div
          className="flex-1 flex items-center p-1 rounded-2xl"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
        >
          {[
            { id: 'chat', label: '💬 Chat Stream' },
            { id: 'settlement', label: '⚖️ Who Owes Whom' },
            { id: 'expenses', label: '🧾 All Expenses' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  'flex-1 py-1.5 text-xs font-extrabold rounded-xl transition-all text-center',
                  isActive
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB CONTENT SCROLL AREA ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* VIEW 1: CHAT FEED VIEW (Rich interactive chat bubbles like WhatsApp) */}
        {activeTab === 'chat' && (
          <div className="space-y-3 max-w-3xl mx-auto">
            {/* System welcome event */}
            <div className="flex justify-center my-2">
              <span
                className="px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-soft)',
                  color: 'var(--text-muted)',
                }}
              >
                <span>✈️</span>
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
                <button
                  onClick={openAddExpenseModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 transition-colors inline-flex items-center gap-1.5 shadow-md shadow-violet-600/30"
                >
                  <Plus className="w-4 h-4" />
                  Add First Expense
                </button>
              </div>
            ) : (
              filteredExpenses.map((expense) => {
                const cat = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.general;
                const perHead =
                  expense.splitAmong.length > 0
                    ? Math.round((expense.amount / expense.splitAmong.length) * 100) / 100
                    : expense.amount;
                const isExpanded = expandedExpenseId === expense.id;
                const hasMultiplePayers = expense.paidBy.length > 1;

                return (
                  <div
                    key={expense.id}
                    className="rounded-3xl p-4 sm:p-5 transition-all space-y-3 hover:border-violet-500/40"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-soft)',
                    }}
                  >
                    {/* Header: Category Badge, Date, Amount */}
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

                    {/* Title and Remark */}
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

                    {/* Who Paid Section — HIGHLIGHTING PARTIAL PAYERS! */}
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
                              'w-3.5 h-3.5 transition-transform',
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

                    {/* Detailed Math Breakdown Dropdown */}
                    {isExpanded && (
                      <div
                        className="p-3 rounded-2xl space-y-2.5 mt-2 animate-in fade-in duration-200"
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
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* VIEW 2: SETTLEMENT & WHO OWES WHOM */}
        {activeTab === 'settlement' && tripSummary && (
          <div className="space-y-5 max-w-3xl mx-auto">
            {/* Minimal Debt Settlements */}
            <div
              className="rounded-3xl p-5 space-y-4"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <span>⚖️ Optimal Settlements</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Minimal transaction path to square off all trip balances completely.
                  </p>
                </div>

                <button
                  onClick={handleShareToWhatsApp}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-violet-300 bg-violet-600/20 hover:bg-violet-600/30 transition-colors inline-flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Plan</span>
                </button>
              </div>

              {tripSummary.settlements.length === 0 ? (
                <div className="p-6 rounded-2xl bg-emerald-500/10 text-center space-y-1">
                  <p className="text-base font-extrabold text-emerald-400">
                    🎉 Group is 100% Settled Up!
                  </p>
                  <p className="text-xs text-emerald-300/80">
                    No debts remaining. Everyone has paid their exact consumption share.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tripSummary.settlements.map((st, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-soft)',
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 font-black text-xs flex items-center justify-center shrink-0">
                          {st.fromName[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-200">
                            <span className="text-rose-400">{st.fromName}</span> owes{' '}
                            <span className="text-emerald-400">{st.toName}</span>
                          </p>
                          <span className="text-[11px] text-slate-500">
                            Debt to clear trip share
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-lg font-black tabular-nums text-white">
                          {currency}{st.amount.toLocaleString('en-IN')}
                        </div>

                        {/* Direct Button to add to Udharwale contact ledger! */}
                        {onRecordToLedger && (
                          <button
                            onClick={() => handleRecordSettlement(st)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-violet-200 bg-violet-600 hover:bg-violet-500 transition-colors inline-flex items-center gap-1 shadow-md"
                            title="Record in Udharwale contact ledger"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>Record in Ledger</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Individual Participant Balance Sheet */}
            <div
              className="rounded-3xl p-5 space-y-4"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
            >
              <div>
                <h3 className="text-base font-black text-white">
                  👥 Participant Contribution & Share Matrix
                </h3>
                <p className="text-xs text-slate-400">
                  Compare how much each friend paid out of pocket versus their actual consumption share.
                </p>
              </div>

              <div className="space-y-2.5">
                {tripSummary.participantSummaries.map((s) => {
                  const isOwed = s.netBalance > 0;
                  const owes = s.netBalance < 0;

                  return (
                    <div
                      key={s.participant.id}
                      className="p-3.5 rounded-2xl flex items-center justify-between gap-3"
                      style={{
                        background: isOwed
                          ? 'rgba(16,185,129,0.06)'
                          : owes
                          ? 'rgba(244,63,94,0.06)'
                          : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${
                          isOwed
                            ? 'rgba(16,185,129,0.2)'
                            : owes
                            ? 'rgba(244,63,94,0.2)'
                            : 'var(--border-soft)'
                        }`,
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-violet-600/30 text-violet-300 font-black text-xs flex items-center justify-center shrink-0">
                          {s.participant.name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {s.participant.name}{' '}
                            {s.participant.isCurrentUser && (
                              <span className="text-[10px] text-violet-400">(You)</span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Paid {currency}{s.totalPaid.toLocaleString('en-IN')} · Consumed{' '}
                            {currency}{s.totalShare.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p
                          className={cn(
                            'text-base font-black tabular-nums',
                            isOwed ? 'text-emerald-400' : owes ? 'text-rose-400' : 'text-slate-400'
                          )}
                        >
                          {isOwed ? '+' : ''}{currency}{s.netBalance.toLocaleString('en-IN')}
                        </p>
                        <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-400">
                          {isOwed ? 'Gets Back' : owes ? 'Needs to Pay' : 'Settled'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: ALL EXPENSES LIST & SEARCH */}
        {activeTab === 'expenses' && (
          <div className="space-y-4 max-w-3xl mx-auto">
            {/* Filter chips & Search input */}
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

              {/* Category filter pills */}
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

            {/* List */}
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
                          <span className="text-[10px] text-violet-400">
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
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          ADD / EDIT EXPENSE MODAL (WITH PARTIAL PAYERS!)
      ══════════════════════════════════════════════════════ */}
      {isExpenseModalOpen && currentTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={() => setIsExpenseModalOpen(false)}
          />

          <div
            className="relative w-full max-w-lg rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-soft)',
              maxHeight: '92vh',
            }}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b shrink-0"
              style={{ borderColor: 'var(--border-soft)' }}
            >
              <h3 className="font-black text-base text-white">
                {editingExpense ? 'Edit Trip Expense' : 'Add Trip Expense'}
              </h3>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveExpense} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Title & Category */}
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

              {/* Amount & Date */}
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

              {/* Category selector */}
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

              {/* ── WHO PAID (SINGLE vs MULTIPLE/PARTIAL PAYERS) ── */}
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

                  {/* Mode switcher */}
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
                        // Pre-populate single payer amount into multiple payers
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
                  /* MULTIPLE / PARTIAL PAYERS LIST */
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

                              {/* Autofill remainder button */}
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

                    {/* Balance Status Banner */}
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

              {/* ── SPLIT BENEFICIARIES (EQUAL / CUSTOM) ── */}
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

                {/* Per-Head Calculation Preview */}
                {parsedTotalAmount > 0 && selectedBeneficiaries.length > 0 && (
                  <div className="text-[11px] text-violet-300 font-semibold pt-1">
                    💡 Per-head: {currency}
                    {Math.round((parsedTotalAmount / selectedBeneficiaries.length) * 100) / 100} for{' '}
                    {selectedBeneficiaries.length} friends
                  </div>
                )}
              </div>

              {/* Notes */}
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

              {/* Submit Button */}
              <div className="pt-2">
                <button
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
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          CREATE NEW TRIP MODAL
      ══════════════════════════════════════════════════════ */}
      {isNewTripModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={() => setIsNewTripModalOpen(false)}
          />

          <div
            className="relative w-full max-w-md rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
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

              {/* Add friends from contacts */}
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

              {/* Add custom friend names */}
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
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-xl transition-all"
                >
                  Create Trip 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SHARE MODAL (PUBLIC WEB LINK & WHATSAPP)
      ══════════════════════════════════════════════════════ */}
      {isShareModalOpen && currentTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={() => setIsShareModalOpen(false)}
          />

          <div
            className="relative w-full max-w-md rounded-3xl overflow-hidden flex flex-col shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200"
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
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(publicShareUrl);
                      setCopiedShareLink(true);
                      setTimeout(() => setCopiedShareLink(false), 2000);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-violet-600 text-white shrink-0 hover:bg-violet-500"
                  >
                    {copiedShareLink ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleShareToWhatsApp}
                className="w-full py-2.5 rounded-xl text-xs font-extrabold text-white flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                <Share2 className="w-4 h-4" />
                Share Formatted WhatsApp Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
