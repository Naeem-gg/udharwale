'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { signOut } from 'next-auth/react';
import {
  Contact,
  Transaction,
  ModeType,
  ActiveTab,
  LedgerCategory,
  LEDGER_CATEGORIES,
  LEDGER_CATEGORY_CONFIG,
} from './types';
import TripExpensesView from './TripExpensesView';
import { SITE_CREDIT_LINE } from '@/lib/seo';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/app/theme-provider';
import ConfirmDialog from './ConfirmDialog';
import AccountPanel from './AccountPanel';
import ActivityFeed from './ActivityFeed';
import ContactProfilePanel from './ContactProfilePanel';
import AvatarPicker from './AvatarPicker';
import PersonAvatar from './PersonAvatar';
import { presetFromFallback, randomAvatarPreset, type AvatarPresetId } from '@/lib/avatar-presets';
import ChatShareSheet from './ChatShareSheet';
import TransactionShareSheet, {
  type TransactionSharePayload,
} from './TransactionShareSheet';
import { buildBalanceReminders, formatReminderLabel } from '@/lib/reminders';
import {
  pushDashboardNav,
  readDashboardNav,
  replaceDashboardNav,
  type DashboardTab,
} from '@/lib/dashboard-nav';
import { useHistoryLayer } from '@/lib/useHistoryLayer';
import {
  clearClientCaches,
  readContactsCache,
  readSessionCache,
  sessionUserKey,
  writeContactsCache,
  writeSessionCache,
} from '@/lib/client-cache';
import {
  AccountPanelSkeleton,
  FriendsListSkeleton,
} from './Skeleton';
import {
  Clock3,
  History,
  Pencil,
  Share2,
  Trash2,
  X,
} from 'lucide-react';

// Custom CSS-based Confetti Particle component for settlements
interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  speedX: number;
  speedY: number;
}

const getStoredDefaultTxMode = (): ModeType => {
  if (typeof window === 'undefined') return 'Cash';
  const saved = window.localStorage.getItem('udharwale-default-tx-mode');
  return saved === 'Online Transfer' ? 'Online Transfer' : 'Cash';
};

const getStoredCompactLedgerView = () => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem('udharwale-compact-ledger-view') === 'true';
};

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme();

  // --- Persistent State (SSR-safe empty start; hydrate cache after mount) ---
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userAvatarSeed, setUserAvatarSeed] = useState('');
  const [historyTx, setHistoryTx] = useState<Transaction | null>(null);
  const [claimedOnce, setClaimedOnce] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAvatarSeed, setProfileAvatarSeed] = useState<AvatarPresetId>('uw-a01');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const userKeyRef = useRef('');
  const contactsRef = useRef<Contact[]>([]);
  contactsRef.current = contacts;

  // Database connection status: connecting, connected, or error
  const [dbStatus, setDbStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- UI Navigation State ---
  const [activeTab, setActiveTab] = useState<ActiveTab>('ledgers');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'ledger'>('list'); // 'list' or 'ledger' for mobile

  // --- Filtering & Sorting State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'credit' | 'debit' | 'settled'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'balance'>('recent');
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
  const [isLedgerSearchOpen, setIsLedgerSearchOpen] = useState(false);

  // --- Modals Toggle ---
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isContactMenuOpen, setIsContactMenuOpen] = useState(false);
  const [profileContactId, setProfileContactId] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [txSharePayload, setTxSharePayload] = useState<TransactionSharePayload | null>(null);
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [showBalances, setShowBalances] = useState(false);
  const [peekingContactId, setPeekingContactId] = useState<string | null>(null);
  const [defaultTxMode, setDefaultTxMode] = useState<ModeType>('Cash');
  const [compactLedgerView, setCompactLedgerView] = useState(false);

  // --- Add Transaction Form State ---
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<'gave' | 'got'>('gave');
  const [txRemark, setTxRemark] = useState('');
  const [txMode, setTxMode] = useState<ModeType>('Cash');
  const [txCategory, setTxCategory] = useState<LedgerCategory>('other');
  const [txDate, setTxDate] = useState('');
  const [txDueDate, setTxDueDate] = useState('');

  // --- Add Contact Form State ---
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactDueDate, setContactDueDate] = useState('');
  const [contactAvatarSeed, setContactAvatarSeed] = useState<AvatarPresetId>('uw-a01');
  const [contactInitialBalance, setContactInitialBalance] = useState('');
  const [contactInitialType, setContactInitialType] = useState<'credit' | 'debit'>('credit');
  const [isImportingContacts, setIsImportingContacts] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [contactsSupported, setContactsSupported] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // --- Account Security Form State ---
  const [securityModal, setSecurityModal] = useState<'password' | 'pin' | 'answer' | null>(null);
  const [securityCurrentPassword, setSecurityCurrentPassword] = useState('');
  const [securityPrimaryValue, setSecurityPrimaryValue] = useState('');
  const [securityConfirmValue, setSecurityConfirmValue] = useState('');
  const [isUpdatingSecurity, setIsUpdatingSecurity] = useState(false);

  // --- Confetti Particle System ---
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);
  const confettiInterval = useRef<NodeJS.Timeout | null>(null);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const confirmResolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: 'danger' | 'default';
    extraActions?: { label: string; onClick: () => void }[];
  } | null>(null);

  // --- Fetch Contacts Function (Component Scope for Retry) ---
  const loadContacts = async (opts?: { silent?: boolean }) => {
    const hasWarmData = contactsRef.current.length > 0 || !!opts?.silent;
    if (!hasWarmData) setDbStatus('connecting');
    else setIsRefreshing(true);

    try {
      const res = await fetch('/api/contacts');
      if (res.status === 401) {
        clearClientCaches();
        window.location.href = '/login';
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setContacts(data);
          contactsRef.current = data;
          if (userKeyRef.current) writeContactsCache(userKeyRef.current, data);
        }
        setDbStatus('connected');
      } else if (!hasWarmData) {
        setDbStatus('error');
      }
    } catch (err) {
      console.error('Failed to load contacts from database:', err);
      if (!hasWarmData) setDbStatus('error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const claimMatchingChats = async () => {
    try {
      const res = await fetch('/api/contacts/claim-matches', { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.linked > 0) {
        showToast(data.message || `${data.linked} shared chats linked`, 'success');
        await loadContacts({ silent: true });
      }
    } catch (err) {
      console.error('claim-matches failed:', err);
    }
  };

  // --- Load Initial Data (hydrate cache after mount, then refresh from API) ---
  useEffect(() => {
    let cancelled = false;

    // Restore prefs + warm cache only on the client (avoids SSR hydration mismatch)
    setDefaultTxMode(getStoredDefaultTxMode());
    setCompactLedgerView(getStoredCompactLedgerView());
    setTxMode(getStoredDefaultTxMode());
    setTxDate(new Date().toISOString().split('T')[0]);
    setContactAvatarSeed(randomAvatarPreset());
    setProfileAvatarSeed(randomAvatarPreset());
    setIsMobileDevice(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
    setContactsSupported(
      'contacts' in navigator && typeof (navigator as any).contacts?.select === 'function'
    );

    const session = readSessionCache();
    if (session) {
      userKeyRef.current = session.userKey;
      setUserName(session.name);
      setUserEmail(session.email);
      setUserPhone(session.phone || '');
      setUserAvatarSeed(session.avatarSeed || '');
      const cached = readContactsCache<Contact>(session.userKey);
      if (cached?.length) {
        setContacts(cached);
        contactsRef.current = cached;
        setDbStatus('connected');
        setIsRefreshing(true);
      }
    }

    const bootstrap = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.status === 401) {
          clearClientCaches();
          window.location.href = '/login?next=/dashboard';
          return;
        }
        if (!res.ok) throw new Error('API session load failed');
        const data = await res.json();
        if (cancelled || !data?.authenticated) return;

        const key = sessionUserKey(data.user.email, data.user.phone, data.user.name);
        const previousKey = userKeyRef.current;
        userKeyRef.current = key;

        setUserName(data.user.name);
        setUserEmail(data.user.email);
        setUserPhone(data.user.phone || '');
        setUserAvatarSeed(data.user.avatarSeed || '');
        writeSessionCache(key, {
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone || '',
          avatarSeed: data.user.avatarSeed || undefined,
        });

        if (previousKey && previousKey !== key) {
          setContacts([]);
          contactsRef.current = [];
          setDbStatus('connecting');
        }

        await loadContacts({ silent: true });
        if (!cancelled && !claimedOnce) {
          setClaimedOnce(true);
          await claimMatchingChats();
        }
      } catch (err) {
        console.error('Session authentication check failed:', err);
        if (!cancelled && contactsRef.current.length === 0 && !userKeyRef.current) {
          window.location.href = '/login?next=/dashboard';
        } else {
          setIsRefreshing(false);
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.localStorage.setItem('udharwale-default-tx-mode', defaultTxMode);
  }, [defaultTxMode]);

  useEffect(() => {
    window.localStorage.setItem('udharwale-compact-ledger-view', String(compactLedgerView));
  }, [compactLedgerView]);

  /** Sync ledgers/tabs from the URL so phone back steps through real history. */
  const applyDashboardNav = React.useCallback(() => {
    const nav = readDashboardNav();
    setActiveTab(nav.tab);
    if (nav.contactId) {
      setSelectedContactId(nav.contactId);
      setMobileView('ledger');
    } else {
      setMobileView('list');
    }
  }, []);

  useEffect(() => {
    applyDashboardNav();
    window.addEventListener('popstate', applyDashboardNav);
    return () => window.removeEventListener('popstate', applyDashboardNav);
  }, [applyDashboardNav]);

  const openContactChat = React.useCallback((contactId: string) => {
    setProfileContactId(null);
    setActiveTab('ledgers');
    setSelectedContactId(contactId);
    setMobileView('ledger');
    const current = readDashboardNav();
    if (current.contactId === contactId && current.tab === 'ledgers') {
      replaceDashboardNav({ tab: 'ledgers', contactId, tripId: null });
    } else {
      pushDashboardNav({ tab: 'ledgers', contactId, tripId: null });
    }
  }, []);

  const openContactProfile = React.useCallback((contactId: string) => {
    setIsContactMenuOpen(false);
    setProfileContactId(contactId);
  }, []);

  const closeContactProfile = React.useCallback(() => {
    setProfileContactId(null);
  }, []);

  const closeContactChat = React.useCallback(() => {
    const { contactId } = readDashboardNav();
    if (contactId && window.history.state && (window.history.state as { __uwNav?: boolean }).__uwNav) {
      window.history.back();
      return;
    }
    setMobileView('list');
    replaceDashboardNav({ tab: 'ledgers', contactId: null, tripId: null });
  }, []);

  const goToTab = React.useCallback((tab: DashboardTab) => {
    setActiveTab(tab);
    setMobileView('list');
    const current = readDashboardNav();
    if (current.tab === tab && !current.contactId && !current.tripId) {
      replaceDashboardNav({ tab, contactId: null, tripId: null });
    } else {
      pushDashboardNav({ tab, contactId: null, tripId: null });
    }
  }, []);

  // Reset chat search when switching contacts
  useEffect(() => {
    setLedgerSearchQuery('');
    setIsLedgerSearchOpen(false);
  }, [selectedContactId]);

  // Drop profile if the contact was deleted
  useEffect(() => {
    if (!profileContactId) return;
    if (!contacts.some((c) => c.id === profileContactId)) {
      setProfileContactId(null);
    }
  }, [contacts, profileContactId]);


  const openEditProfile = () => {
    setProfileName(userName);
    setProfilePhone(userPhone);
    setProfileAvatarSeed(
      (userAvatarSeed as AvatarPresetId) ||
        presetFromFallback(userEmail || userPhone || userName || 'you')
    );
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          phone: profilePhone,
          avatarSeed: profileAvatarSeed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update profile');
      setUserName(data.user.name);
      setUserPhone(data.user.phone || '');
      setUserAvatarSeed(data.user.avatarSeed || profileAvatarSeed);
      const key = sessionUserKey(data.user.email || userEmail, data.user.phone, data.user.name);
      userKeyRef.current = key;
      writeSessionCache(key, {
        name: data.user.name,
        email: data.user.email || userEmail,
        phone: data.user.phone || '',
        avatarSeed: data.user.avatarSeed || profileAvatarSeed,
      });
      setIsEditProfileOpen(false);
      showToast('Profile updated', 'success');
      // Re-claim matches if phone changed
      await claimMatchingChats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update profile', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      clearClientCaches();
      await signOut({ callbackUrl: '/login' });
    } catch (e) {
      console.error(e);
      showToast('An error occurred during log out.', 'error');
    }
  };

  // --- Save Contacts & Configurations ---
  // Note: Contacts are now written directly to Mongoose backend via API endpoints.
  // This helper updates local React state for instantaneous UI responsiveness.
  const saveContactsState = (newContacts: Contact[]) => {
    setContacts(newContacts);
    if (userKeyRef.current) writeContactsCache(userKeyRef.current, newContacts);
  };



  // --- Confetti Blast Trigger ---
  const triggerConfetti = () => {
    const colors = ['#10B981', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899'];
    const newParticles: ConfettiParticle[] = [];

    // Generate particles
    for (let i = 0; i < 70; i++) {
      newParticles.push({
        id: Math.random() + i,
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
        y: window.innerHeight * 0.4 + (Math.random() - 0.5) * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 6,
        rotation: Math.random() * 360,
        speedX: (Math.random() - 0.5) * 15,
        speedY: (Math.random() - 0.8) * 20, // push upwards
      });
    }

    setParticles(newParticles);

    // Animate particles
    let frames = 0;
    if (confettiInterval.current) clearInterval(confettiInterval.current);

    confettiInterval.current = setInterval(() => {
      setParticles((prev) => {
        const next = prev
          .map((p) => ({
            ...p,
            x: p.x + p.speedX,
            y: p.y + p.speedY,
            speedY: p.speedY + 0.6, // gravity
            rotation: p.rotation + p.speedX,
          }))
          .filter((p) => p.y < window.innerHeight + 100);

        if (next.length === 0 || frames > 120) {
          if (confettiInterval.current) clearInterval(confettiInterval.current);
          return [];
        }
        frames++;
        return next;
      });
    }, 16);
  };

  // --- Clear practice sample friends / trips ---
  const handleClearSampleData = async () => {
    try {
      const clearingSelected = contacts.find((c) => c.id === selectedContactId)?.isSample;
      const res = await fetch('/api/sample/clear', { method: 'POST' });
      if (res.ok) {
        await loadContacts();
        setProfileContactId(null);
        if (clearingSelected) {
          setSelectedContactId(null);
          setMobileView('list');
          replaceDashboardNav({ tab: 'ledgers', contactId: null, tripId: null });
        }
        try {
          localStorage.removeItem('udharwale-trips-v1');
          if (userKeyRef.current) writeContactsCache(userKeyRef.current, contacts.filter((c) => !c.isSample));
        } catch {}
        window.dispatchEvent(new Event('udharwale:sample-cleared'));
        showToast('Sample examples removed', 'success');
      } else {
        showToast('Failed to remove sample data.', 'error');
      }
    } catch (err) {
      console.error('Error clearing sample data:', err);
      showToast('Failed to remove sample data.', 'error');
    }
  };

  // --- Wipe All Data ---
  const handleWipeData = async () => {
    try {
      const res = await fetch('/api/db/wipe', { method: 'POST' });
      if (res.ok) {
        saveContactsState([]);
        setSelectedContactId(null);
        setDbStatus('connected');
        clearClientCaches();
        if (userKeyRef.current) {
          writeSessionCache(userKeyRef.current, {
            name: userName,
            email: userEmail,
            phone: userPhone,
            avatarSeed: userAvatarSeed || undefined,
          });
        }
        showToast('All ledger data wiped', 'success');
      } else {
        showToast('Failed to wipe database on backend.', 'error');
      }
    } catch (err) {
      console.error('Error modifying database state:', err);
      showToast('An error occurred while connecting to the database server.', 'error');
    }
  };

  const hasWarmUi = contacts.length > 0 || !!userName;
  const showBootSkeleton = dbStatus === 'connecting' && !hasWarmUi;
  const showBootError = dbStatus === 'error' && !hasWarmUi;
  const appReady = dbStatus === 'connected' || hasWarmUi;

  // --- Selected Contact Ledger Logic ---
  const selectedContact = useMemo(() => {
    return contacts.find((c) => c.id === selectedContactId) || null;
  }, [contacts, selectedContactId]);

  const profileContact = useMemo(() => {
    return contacts.find((c) => c.id === profileContactId) || null;
  }, [contacts, profileContactId]);

  // Calculate stats for all contacts
  const stats = useMemo(() => {
    let credit = 0; // Owed to you (positive overall contact balance)
    let debit = 0;  // You owe others (negative overall contact balance)

    contacts.forEach((c) => {
      let contactBal = 0;
      c.transactions.forEach((t) => {
        if (t.type === 'gave') contactBal += t.amount;
        else contactBal -= t.amount;
      });

      if (contactBal > 0) {
        credit += contactBal;
      } else if (contactBal < 0) {
        debit += Math.abs(contactBal);
      }
    });

    return {
      totalCredit: credit,
      totalDebit: debit,
      netBalance: credit - debit,
    };
  }, [contacts]);

  const ledgerSummary = useMemo(() => {
    const transactionCount = contacts.reduce((sum, contact) => sum + contact.transactions.length, 0);
    const allDates = contacts.flatMap((contact) => [
      contact.createdAt,
      ...contact.transactions.map((transaction) => transaction.date),
    ]);
    const lastActivity = allDates.length
      ? new Date(Math.max(...allDates.map((date) => new Date(date).getTime())))
      : null;

    return {
      contactCount: contacts.length,
      transactionCount,
      lastActivity,
    };
  }, [contacts]);

  // Individual Contact balances computed
  const getContactBalance = (contact: Contact) => {
    let bal = 0;
    contact.transactions.forEach((t) => {
      if (t.type === 'gave') bal += t.amount;
      else bal -= t.amount;
    });
    return bal;
  };

  const getContactLastActivity = (contact: Contact) => {
    if (contact.transactions.length === 0) return new Date(contact.createdAt);
    const dates = contact.transactions.map((t) => new Date(t.date));
    return new Date(Math.max(...dates.map(d => d.getTime())));
  };

  // --- Filter and Sort Contacts ---
  const filteredContacts = useMemo(() => {
    return contacts
      .filter((c) => {
        const matchesSearch =
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone.includes(searchQuery);

        const bal = getContactBalance(c);
        if (statusFilter === 'all') return matchesSearch;
        if (statusFilter === 'credit') return matchesSearch && bal > 0;
        if (statusFilter === 'debit') return matchesSearch && bal < 0;
        if (statusFilter === 'settled') return matchesSearch && bal === 0;

        return matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'balance') {
          return Math.abs(getContactBalance(b)) - Math.abs(getContactBalance(a));
        }
        // default recent activity
        return getContactLastActivity(b).getTime() - getContactLastActivity(a).getTime();
      });
  }, [contacts, searchQuery, statusFilter, sortBy]);

  // --- Filtered transactions within selected contact (chat order: oldest → newest) ---
  const filteredTransactions = useMemo(() => {
    if (!selectedContact) return [];
    return selectedContact.transactions
      .filter((t) => {
        if (!ledgerSearchQuery) return true;
        const query = ledgerSearchQuery.toLowerCase();
        return (
          t.remark.toLowerCase().includes(query) ||
          t.mode.toLowerCase().includes(query) ||
          t.amount.toString().includes(query)
        );
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selectedContact, ledgerSearchQuery]);

  // Group ledger txs by date for PhonePe/GPay-style middle date chips
  const chatTransactionGroups = useMemo(() => {
    const groups: { date: string; items: Transaction[] }[] = [];
    for (const tx of filteredTransactions) {
      const last = groups[groups.length - 1];
      if (last && last.date === tx.date) {
        last.items.push(tx);
      } else {
        groups.push({ date: tx.date, items: [tx] });
      }
    }
    return groups;
  }, [filteredTransactions]);

  useEffect(() => {
    if (!selectedContactId || !chatScrollRef.current) return;
    const el = chatScrollRef.current;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [selectedContactId, filteredTransactions.length, ledgerSearchQuery]);

  // --- Mode + ledger category distribution for Overview ---
  const categoryDistribution = useMemo(() => {
    const distribution: Record<ModeType, number> = {
      Cash: 0,
      'Online Transfer': 0,
    };
    const ledgerCategories: Record<LedgerCategory, number> = {
      food: 0,
      travel: 0,
      rent: 0,
      business: 0,
      personal: 0,
      other: 0,
    };
    let grandTotal = 0;

    contacts.forEach((c) => {
      c.transactions.forEach((t) => {
        const mode = t.mode === 'Online Transfer' ? 'Online Transfer' : 'Cash';
        distribution[mode] += t.amount;
        const cat = (t.category && LEDGER_CATEGORIES.includes(t.category) ? t.category : 'other') as LedgerCategory;
        ledgerCategories[cat] += t.amount;
        grandTotal += t.amount;
      });
    });

    return { distribution, ledgerCategories, grandTotal };
  }, [contacts]);

  const balanceReminders = useMemo(
    () => buildBalanceReminders(contacts, { upcomingDays: 14 }),
    [contacts]
  );

  // --- Handlers: Add/Edit Friend ---
  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) return;

    const newContactId = 'c_' + Date.now();
    const newTransactions: Transaction[] = [];

    // If initial balance is set
    const initBal = parseFloat(contactInitialBalance);
    if (!isNaN(initBal) && initBal > 0) {
      const nowIso = new Date().toISOString();
      newTransactions.push({
        id: 't_' + Date.now(),
        amount: initBal,
        type: contactInitialType === 'credit' ? 'gave' : 'got',
        remark: 'Starting Balance',
        date: nowIso.split('T')[0],
        createdAt: nowIso,
        mode: 'Cash',
      });
    }

    const newContact: Contact = {
      id: newContactId,
      name: contactName.trim(),
      phone: contactPhone.trim(),
      email: contactEmail.trim() || undefined,
      avatarSeed: contactAvatarSeed,
      transactions: newTransactions,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      });

      if (res.ok) {
        const saved = await res.json().catch(() => newContact);
        saveContactsState([{ ...newContact, ...saved }, ...contacts]);
        // Reset Form
        setContactName('');
        setContactPhone('');
        setContactEmail('');
        setContactAvatarSeed(randomAvatarPreset());
        setContactInitialBalance('');
        setContactInitialType('credit');
        setIsAddContactOpen(false);
        openContactChat(newContactId);
      } else {
        const errorData = await res.json();
        showToast(`Failed to add contact: ${errorData.error || 'Server error'}`, 'error');
      }
    } catch (err) {
      console.error('Error adding contact to backend:', err);
      showToast('An error occurred while communicating with the database.', 'error');
    }
  };

  const handleEditContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId || !contactName.trim() || !contactPhone.trim()) return;

    try {
      const res = await fetch(`/api/contacts/${selectedContactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName.trim(),
          phone: contactPhone.trim(),
          email: contactEmail.trim() || undefined,
          dueDate: contactDueDate || null,
          avatarSeed: contactAvatarSeed,
        }),
      });

      if (res.ok) {
        const updatedContact = await res.json();
        const updatedContacts = contacts.map(c =>
          c.id === selectedContactId
            ? {
                ...c,
                name: updatedContact.name,
                phone: updatedContact.phone,
                email: updatedContact.email,
                avatarSeed: updatedContact.avatarSeed || contactAvatarSeed,
                avatarLocked: updatedContact.avatarLocked,
                dueDate: updatedContact.dueDate || null,
              }
            : c
        );
        saveContactsState(updatedContacts);
        setIsEditContactOpen(false);
        showToast('Contact updated successfully', 'success');
      } else {
        const errorData = await res.json();
        showToast(`Failed to update contact: ${errorData.error || 'Server error'}`, 'error');
      }
    } catch (err) {
      console.error('Error updating contact:', err);
      showToast('An error occurred while communicating with the database.', 'error');
    }
  };

  const handleImportContacts = async (multiple: boolean = false) => {
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
      setImportStatus({ type: 'error', message: 'Not supported on this browser.' });
      return;
    }

    setIsImportingContacts(true);
    setImportStatus(null);

    try {
      const props = ['name', 'tel'];
      const opts = { multiple };

      const supportedProps = await (navigator as any).contacts.getProperties();
      if (!supportedProps.includes('name') || !supportedProps.includes('tel')) {
        throw new Error("Required contact properties not supported");
      }

      const importedContacts = await (navigator as any).contacts.select(props, opts);

      if (!importedContacts || importedContacts.length === 0) {
        setIsImportingContacts(false);
        setImportStatus({ type: 'info', message: 'No contacts selected.' });
        return;
      }

      const newContacts = [];
      for (const ic of importedContacts) {
        const name = ic.name?.[0];
        const phone = ic.tel?.[0];
        if (name && phone) {
          const newContactId = 'c_' + Date.now() + Math.random().toString(36).substr(2, 9);
          newContacts.push({
            id: newContactId,
            name: name,
            phone: phone.replace(/[^0-9+]/g, ''),
            transactions: [],
            createdAt: new Date().toISOString()
          });
        }
      }

      if (newContacts.length > 0) {
        let addedCount = 0;
        for (const c of newContacts) {
          const res = await fetch('/api/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(c),
          });
          if (res.ok) addedCount++;
        }

        saveContactsState([...newContacts, ...contacts]);
        setImportStatus({ type: 'success', message: `Imported ${addedCount} contact(s) successfully!` });
        if (addedCount > 0 && !multiple) {
          setIsAddContactOpen(false);
          openContactChat(newContacts[0].id);
        }
      } else {
        setImportStatus({ type: 'error', message: 'Selected contacts must have a name and phone number.' });
      }
    } catch (err: any) {
      console.error('Contact import error:', err);
      if (err.name === 'SecurityError' || err.name === 'NotAllowedError') {
        setImportStatus({ type: 'error', message: 'Permission denied or blocked. Enable contacts permission in browser settings.' });
      } else {
        setImportStatus({ type: 'error', message: err.message || 'Unknown error occurred during import.' });
      }
    } finally {
      setIsImportingContacts(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    const confirmed = await confirmAction({
      title: 'Delete contact?',
      message: 'This will permanently delete this contact and all their ledger history.',
      confirmLabel: 'Delete Contact',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const remaining = contacts.filter((c) => c.id !== contactId);
        saveContactsState(remaining);
        setSelectedContactId(null);
        setMobileView('list');
        replaceDashboardNav({ tab: 'ledgers', contactId: null, tripId: null });
        showToast('Contact deleted', 'success');
      } else {
        const errorData = await res.json();
        showToast(`Failed to delete contact: ${errorData.error || 'Server error'}`, 'error');
      }
    } catch (err) {
      console.error('Error deleting contact from backend:', err);
      showToast('An error occurred while deleting the contact.', 'error');
    }
  };

  // --- Handlers: Transactions ---
  const handleOpenAddTx = (type: 'gave' | 'got') => {
    setTxType(type);
    setTxAmount('');
    setTxRemark('');
    setTxMode(defaultTxMode);
    setTxCategory('other');
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxDueDate('');
    setEditingTransaction(null);
    setIsAddTransactionOpen(true);
  };

  const handleOpenEditTx = (tx: Transaction) => {
    setEditingTransaction(tx);
    setTxAmount(tx.amount.toString());
    setTxType(tx.type);
    setTxRemark(tx.remark);
    setTxMode(tx.mode);
    setTxCategory(
      tx.category && LEDGER_CATEGORIES.includes(tx.category) ? tx.category : 'other'
    );
    setTxDate(tx.date);
    setTxDueDate(tx.dueDate || '');
    setIsAddTransactionOpen(true);
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId || !txAmount) return;

    const amt = parseFloat(txAmount);
    if (isNaN(amt) || amt <= 0) return;

    const txDesc = txRemark.trim() || 'No description';

    try {
      if (editingTransaction) {
        // Edit Mode
        const res = await fetch(`/api/contacts/${selectedContactId}/transactions/${editingTransaction.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amt,
            type: txType,
            remark: txDesc,
            mode: txMode,
            category: txCategory,
            date: txDate,
            dueDate: txDueDate || null,
          }),
        });

        if (res.ok) {
          const updatedTx = await res.json();
          const updatedContacts = contacts.map((c) => {
            if (c.id !== selectedContactId) return c;
            return {
              ...c,
              transactions: c.transactions.map((t) => t.id === editingTransaction.id ? updatedTx : t),
            };
          });

          saveContactsState(updatedContacts);
          setIsAddTransactionOpen(false);
          setEditingTransaction(null);

          const updatedContact = updatedContacts.find((c) => c.id === selectedContactId);
          if (updatedContact && getContactBalance(updatedContact) === 0) {
            setTimeout(() => triggerConfetti(), 150);
          }
        } else {
          showToast('Failed to update transaction on backend.', 'error');
        }
      } else {
        // Add Mode
        const newTxId = 'tx_' + Date.now();
        const res = await fetch(`/api/contacts/${selectedContactId}/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newTxId,
            amount: amt,
            type: txType,
            remark: txDesc,
            mode: txMode,
            category: txCategory,
            date: txDate,
            dueDate: txDueDate || null,
          }),
        });

        if (res.ok) {
          const createdTx = await res.json();
          const updatedContacts = contacts.map((c) => {
            if (c.id !== selectedContactId) return c;
            return {
              ...c,
              transactions: [...c.transactions, createdTx],
            };
          });

          saveContactsState(updatedContacts);
          setIsAddTransactionOpen(false);
          setEditingTransaction(null);

          const updatedContact = updatedContacts.find((c) => c.id === selectedContactId);
          if (updatedContact && getContactBalance(updatedContact) === 0) {
            setTimeout(() => triggerConfetti(), 150);
          }
        } else {
          showToast('Failed to record transaction on backend.', 'error');
        }
      }
    } catch (err) {
      console.error('Error submitting transaction:', err);
      showToast('An error occurred while saving transaction data.', 'error');
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    const confirmed = await confirmAction({
      title: 'Delete transaction?',
      message: 'The entry is soft-deleted and kept in change history so both sides stay accountable.',
      confirmLabel: 'Delete Transaction',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/contacts/${selectedContactId}/transactions/${txId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadContacts();
        setIsAddTransactionOpen(false);
        setEditingTransaction(null);
        showToast('Transaction deleted (saved in history)', 'success');
      } else {
        showToast('Failed to delete transaction on backend.', 'error');
      }
    } catch (err) {
      console.error('Error deleting transaction:', err);
      showToast('An error occurred while deleting the transaction.', 'error');
    }
  };

  const handleRecordTripSettlement = async (
    contactId: string,
    amount: number,
    type: 'gave' | 'got',
    remark: string
  ) => {
    const newTxId = 'tx_' + Date.now();
    const today = new Date().toISOString().split('T')[0];

    try {
      const res = await fetch(`/api/contacts/${contactId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newTxId,
          amount,
          type,
          remark,
          mode: defaultTxMode || 'Online Transfer',
          category: 'travel',
          date: today,
        }),
      });

      if (res.ok) {
        const createdTx = await res.json();
        const updatedContacts = contacts.map((c) => {
          if (c.id !== contactId) return c;
          return {
            ...c,
            transactions: [...c.transactions, createdTx],
          };
        });
        saveContactsState(updatedContacts);
      } else {
        const fallbackTx: Transaction = {
          id: newTxId,
          amount,
          type,
          remark,
          mode: defaultTxMode || 'Online Transfer',
          category: 'travel',
          date: today,
          createdAt: new Date().toISOString(),
        };
        const updatedContacts = contacts.map((c) => {
          if (c.id !== contactId) return c;
          return {
            ...c,
            transactions: [...c.transactions, fallbackTx],
          };
        });
        saveContactsState(updatedContacts);
      }
    } catch {
      const fallbackTx: Transaction = {
        id: newTxId,
        amount,
        type,
        remark,
        mode: defaultTxMode || 'Online Transfer',
        category: 'travel',
        date: today,
        createdAt: new Date().toISOString(),
      };
      const updatedContacts = contacts.map((c) => {
        if (c.id !== contactId) return c;
        return {
          ...c,
          transactions: [...c.transactions, fallbackTx],
        };
      });
      saveContactsState(updatedContacts);
    }
  };

  const handleUnlinkPeer = async () => {
    if (!selectedContactId || selectedContact?.role === 'peer') return;
    const confirmed = await confirmAction({
      title: 'Unlink shared access?',
      message: 'They will lose edit access until they claim this chat again with a matching phone/email.',
      confirmLabel: 'Unlink',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/contacts/${selectedContactId}/unlink`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to unlink');
      }
      showToast('Peer unlinked', 'success');
      await loadContacts();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to unlink', 'error');
    }
  };

  const handleRestoreTransaction = async (txId: string) => {
    if (!selectedContactId) return;
    try {
      const res = await fetch(`/api/contacts/${selectedContactId}/transactions/${txId}/restore`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Restore failed');
      showToast('Transaction restored', 'success');
      setHistoryTx(null);
      await loadContacts();
    } catch {
      showToast('Could not restore transaction', 'error');
    }
  };

  const handleOpenSettlement = (mode: 'full' | 'partial') => {
    if (!selectedContact) return;
    const balance = getContactBalance(selectedContact);
    if (balance === 0) return;

    const settleAmount = Math.abs(balance);
    const settleType = balance > 0 ? 'got' : 'gave';

    setTxAmount(mode === 'full' ? settleAmount.toString() : '');
    setTxType(settleType);
    setTxRemark(mode === 'full' ? '🤝 Full Settlement' : '🤝 Partial Settlement');
    setTxMode('Cash');
    setTxCategory('personal');
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxDueDate('');
    setEditingTransaction(null);
    setIsAddTransactionOpen(true);
  };

  const getOrCreateShareUrl = async (contactId: string) => {
    const res = await fetch(`/api/contacts/${contactId}/share`, { method: 'POST' });
    if (!res.ok) {
      throw new Error('Failed to create chat link');
    }
    const data = await res.json();
    // Keep token on local contact so later shares are instant
    if (data.shareToken) {
      setContacts((prev) => {
        const next = prev.map((c) => (c.id === contactId ? { ...c, shareToken: data.shareToken } : c));
        if (userKeyRef.current) writeContactsCache(userKeyRef.current, next);
        return next;
      });
    }
    return String(data.shareUrl || '');
  };

  const buildReminderMessage = (shareUrl?: string) => {
    if (!selectedContact) return '';
    const balance = getContactBalance(selectedContact);
    if (balance === 0) return '';

    const name = selectedContact.name;
    const amount = `₹${Math.abs(balance).toLocaleString('en-IN')}`;

    let text =
      balance > 0
        ? `Hi ${name},\n\nJust reminding you — ${amount} is still left from your side.\n\nSend it whenever you can. Thank you!`
        : `Hi ${name},\n\nJust a quick note — I still have to give you ${amount}.\n\nI'll send it soon. Thanks!`;

    if (shareUrl) {
      text += `\n\nSee our chat here:\n${shareUrl}`;
    }

    return text;
  };

  const buildLedgerMessage = (option: 'all' | 'gave' | 'got', shareUrl?: string) => {
    if (!selectedContact) return '';

    const balance = getContactBalance(selectedContact);
    const name = selectedContact.name;
    let text = `Hi ${name},\n\nHere's what we have between us:\n\n`;

    const txsToShare = selectedContact.transactions
      .filter((t) => {
        if (option === 'all') return true;
        if (option === 'gave') return t.type === 'gave';
        if (option === 'got') return t.type === 'got';
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (txsToShare.length === 0) {
      text += `Nothing listed yet.\n`;
    } else {
      txsToShare.forEach((t) => {
        const isGave = t.type === 'gave';
        const formattedDate = new Date(t.date).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        });
        const amountStr = `₹${t.amount.toLocaleString('en-IN')}`;
        text += `• ${formattedDate}: ${t.remark} (${isGave ? 'I paid' : 'You paid'} ${amountStr})\n`;
      });
    }

    text += `\n`;
    if (option === 'all') {
      if (balance > 0) {
        text += `Left to clear: You need to give me ₹${balance.toLocaleString('en-IN')}\n`;
      } else if (balance < 0) {
        text += `Left to clear: I need to give you ₹${Math.abs(balance).toLocaleString('en-IN')}\n`;
      } else {
        text += `All settled. Nothing left to pay.\n`;
      }
    } else if (option === 'gave') {
      text += `These are the amounts I paid.\n`;
    } else {
      text += `These are the amounts you paid.\n`;
    }

    if (shareUrl) {
      text += `\nOpen the full chat here:\n${shareUrl}\n`;
    }

    text += `\nThank you!`;
    return text;
  };

  const copyTextToClipboard = async (text: string, successMsg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMsg, 'success');
      return true;
    } catch (err) {
      console.error('Copy failed', err);
      showToast('Could not copy message', 'error');
      return false;
    }
  };

  const handleWhatsAppReminder = async () => {
    if (!selectedContact) return;
    try {
      const shareUrl = await getOrCreateShareUrl(selectedContact.id);
      const msg = buildReminderMessage(shareUrl);
      if (!msg) return;

      const whatsappUrl = `https://api.whatsapp.com/send?phone=${selectedContact.phone.replace(/[^0-9+]/g, '')}&text=${encodeURIComponent(msg)}`;
      window.open(whatsappUrl, '_blank');
    } catch (err) {
      console.error(err);
      showToast('Could not prepare reminder link', 'error');
    }
  };

  const handleCopyReminder = async () => {
    if (!selectedContact) return;
    try {
      const shareUrl = await getOrCreateShareUrl(selectedContact.id);
      const msg = buildReminderMessage(shareUrl);
      if (!msg) return;
      await copyTextToClipboard(msg, 'Reminder copied — paste it anywhere');
    } catch (err) {
      console.error(err);
      showToast('Could not prepare reminder link', 'error');
    }
  };

  const handleCopyChatLink = async () => {
    if (!selectedContact) return;
    try {
      const shareUrl = await getOrCreateShareUrl(selectedContact.id);
      await copyTextToClipboard(shareUrl, 'Chat link copied');
    } catch (err) {
      console.error(err);
      showToast('Could not create chat link', 'error');
    }
  };

  const handleShareLedger = async (option: 'all' | 'gave' | 'got', action: 'copy' | 'share' = 'share') => {
    if (!selectedContact) return;

    try {
      const shareUrl = await getOrCreateShareUrl(selectedContact.id);
      const text = buildLedgerMessage(option, shareUrl);

      if (action === 'copy') {
        const ok = await copyTextToClipboard(text, 'Message copied — paste it in WhatsApp or anywhere');
        if (ok) setIsShareModalOpen(false);
        return;
      }

      try {
        if (navigator.share) {
          await navigator.share({
            title: `Money record with ${selectedContact.name}`,
            text,
            url: shareUrl,
          });
        } else {
          await copyTextToClipboard(text, 'Sharing not available — message copied instead');
        }
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          console.error('Share failed', err);
          showToast('Could not share message', 'error');
        }
      }
      setIsShareModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Could not prepare chat link', 'error');
    }
  };

  const formatChatDateLabel = (dateStr: string) => {
    const date = new Date(`${dateStr}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    if (target.getTime() === today.getTime()) return 'Today';
    if (target.getTime() === yesterday.getTime()) return 'Yesterday';
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatEventDate = (dateStr: string) =>
    new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const formatLoggedAt = (iso?: string) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // ─── Toast System ───────────────────────────────────────────────────────
  const [toasts, setToasts] = React.useState<{ id: number; type: 'success' | 'error' | 'info' | 'warn'; msg: string; leaving?: boolean }[]>([]);
  const toastCounter = React.useRef(0);
  const showToast = React.useCallback((msg: string, type: 'success' | 'error' | 'info' | 'warn' = 'info') => {
    const id = ++toastCounter.current;
    setToasts(prev => [...prev, { id, type, msg }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
    }, 3800);
  }, []);

  const confirmAction = React.useCallback((options: {
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: 'danger' | 'default';
    extraActions?: { label: string; onClick: () => void }[];
  }) => {
    setConfirmDialog(options);
    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve;
    });
  }, []);

  const closeConfirmDialog = React.useCallback((confirmed: boolean) => {
    confirmResolverRef.current?.(confirmed);
    confirmResolverRef.current = null;
    setConfirmDialog(null);
  }, []);

  const downloadTextFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportBackup = () => {
    const backup = {
      app: SITE_CREDIT_LINE,
      exportedAt: new Date().toISOString(),
      user: { name: userName, email: userEmail },
      settings: { theme, defaultTxMode, compactLedgerView, showBalances },
      stats,
      contacts,
    };

    downloadTextFile(
      `udharwale-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(backup, null, 2),
      'application/json'
    );
    showToast('Backup downloaded as JSON', 'success');
  };

  const handleExportCsv = () => {
    if (contacts.length === 0) {
      showToast('Add at least one contact before exporting CSV.', 'warn');
      return;
    }

    const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = [
      ['Contact', 'Phone', 'Email', 'Transaction Date', 'Logged At', 'Type', 'Mode', 'Category', 'Remark', 'Amount'],
      ...contacts.flatMap((contact) =>
        contact.transactions.length > 0
          ? contact.transactions.map((transaction) => [
            contact.name,
            contact.phone,
            contact.email || '',
            transaction.date,
            transaction.createdAt || '',
            transaction.type === 'gave' ? 'You gave' : 'You got',
            transaction.mode,
            LEDGER_CATEGORY_CONFIG[
              transaction.category && LEDGER_CATEGORIES.includes(transaction.category)
                ? transaction.category
                : 'other'
            ].label,
            transaction.remark,
            transaction.amount,
          ])
          : [[contact.name, contact.phone, contact.email || '', '', '', '', '', '', 'No transactions yet', '']]
      ),
    ];

    downloadTextFile(
      `udharwale-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((row) => row.map(escapeCsv).join(',')).join('\n'),
      'text/csv'
    );
    showToast('Ledger downloaded for Excel (.csv)', 'success');
  };

  const handleExportTxt = () => {
    if (contacts.length === 0) {
      showToast('Nothing to download yet.', 'warn');
      return;
    }

    const lines: string[] = [
      `${SITE_CREDIT_LINE} — Full ledger export`,
      `Exported: ${new Date().toLocaleString('en-IN')}`,
      `User: ${userName || 'Unknown'}${userEmail ? ` <${userEmail}>` : ''}`,
      `Contacts: ${contacts.length}`,
      '',
    ];

    contacts.forEach((contact, index) => {
      const balance = getContactBalance(contact);
      lines.push(`${index + 1}. ${contact.name}`);
      lines.push(`   Phone: ${contact.phone || '—'}`);
      if (contact.email) lines.push(`   Email: ${contact.email}`);
      lines.push(
        `   Balance: ${
          balance === 0
            ? 'Settled'
            : balance > 0
              ? `Owes you ₹${Math.abs(balance).toLocaleString('en-IN')}`
              : `You owe ₹${Math.abs(balance).toLocaleString('en-IN')}`
        }`
      );
      if (contact.transactions.length === 0) {
        lines.push('   Transactions: none');
      } else {
        lines.push('   Transactions:');
        contact.transactions.forEach((tx) => {
          const category =
            LEDGER_CATEGORY_CONFIG[
              tx.category && LEDGER_CATEGORIES.includes(tx.category) ? tx.category : 'other'
            ].label;
          lines.push(
            `   - ${tx.date} | ${tx.type === 'gave' ? 'Gave' : 'Got'} ₹${Number(tx.amount).toLocaleString('en-IN')} | ${tx.mode} | ${category} | ${tx.remark || '—'}`
          );
        });
      }
      lines.push('');
    });

    downloadTextFile(
      `udharwale-ledger-${new Date().toISOString().slice(0, 10)}.txt`,
      lines.join('\n'),
      'text/plain'
    );
    showToast('Ledger downloaded as text (.txt)', 'success');
  };

  const handleCopyLedgerSummary = async () => {
    const summary = [
      `${SITE_CREDIT_LINE} — Ledger Summary`,
      `User: ${userName || 'Unknown'}${userEmail ? ` <${userEmail}>` : ''}`,
      `Contacts: ${ledgerSummary.contactCount}`,
      `Transactions: ${ledgerSummary.transactionCount}`,
      `You'll receive: ₹${stats.totalCredit.toLocaleString('en-IN')}`,
      `You owe: ₹${stats.totalDebit.toLocaleString('en-IN')}`,
      `Net balance: ${stats.netBalance >= 0 ? '+' : '-'}₹${Math.abs(stats.netBalance).toLocaleString('en-IN')}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summary);
      showToast('Ledger summary copied', 'success');
    } catch {
      showToast('Could not copy summary', 'error');
    }
  };

  const handlePrintLedgerPdf = () => {
    const rows = contacts.flatMap((contact) =>
      contact.transactions.map((transaction) => ({
        contact: contact.name,
        phone: contact.phone,
        date: transaction.date,
        loggedAt: formatLoggedAt(transaction.createdAt) || '—',
        type: transaction.type === 'gave' ? 'You gave' : 'You got',
        mode: transaction.mode,
        category:
          LEDGER_CATEGORY_CONFIG[
            transaction.category && LEDGER_CATEGORIES.includes(transaction.category)
              ? transaction.category
              : 'other'
          ].label,
        remark: transaction.remark,
        amount: transaction.amount,
      }))
    );

    const popup = window.open('about:blank', '_blank');
    if (!popup) {
      showToast('Pop-up blocked. Allow pop-ups to print or save the PDF.', 'warn');
      return;
    }

    const escapeHtml = (value: string | number) =>
      String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    popup.document.open();
    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Udharwale Ledger Export</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
            h1 { margin: 0 0 4px; font-size: 26px; }
            button { cursor: pointer; }
            .muted { color: #64748b; font-size: 12px; }
            .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 24px 0; }
            .stat { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
            .label { color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 700; }
            .value { font-size: 18px; font-weight: 800; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border-bottom: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            th { background: #f8fafc; font-size: 10px; text-transform: uppercase; color: #475569; }
            .amount { text-align: right; font-weight: 700; }
            @media print { button { display: none; } body { margin: 20px; } }
          </style>
        </head>
        <body>
          <button onclick="window.print()" style="float:right;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;background:white;color:#111827;font-weight:700;">Print / Save PDF</button>
          <h1>Udharwale Ledger</h1>
          <div class="muted">Exported ${new Date().toLocaleString('en-IN')} · ${escapeHtml(userName || 'Account')} · ${escapeHtml(SITE_CREDIT_LINE)}</div>
          <div class="stats">
            <div class="stat"><div class="label">Contacts</div><div class="value">${ledgerSummary.contactCount}</div></div>
            <div class="stat"><div class="label">Transactions</div><div class="value">${ledgerSummary.transactionCount}</div></div>
            <div class="stat"><div class="label">Net Balance</div><div class="value">${stats.netBalance >= 0 ? '+' : '-'}₹${Math.abs(stats.netBalance).toLocaleString('en-IN')}</div></div>
          </div>
          <table>
            <thead>
              <tr><th>Transaction Date</th><th>Logged At</th><th>Contact</th><th>Type</th><th>Mode</th><th>Category</th><th>Remark</th><th class="amount">Amount</th></tr>
            </thead>
            <tbody>
              ${rows.length === 0
        ? '<tr><td colspan="8">No transactions yet.</td></tr>'
        : rows.map((row) => `
                  <tr>
                    <td>${escapeHtml(row.date)}</td>
                    <td>${escapeHtml(row.loggedAt)}</td>
                    <td>${escapeHtml(row.contact)}<div class="muted">${escapeHtml(row.phone)}</div></td>
                    <td>${escapeHtml(row.type)}</td>
                    <td>${escapeHtml(row.mode)}</td>
                    <td>${escapeHtml(row.category)}</td>
                    <td>${escapeHtml(row.remark)}</td>
                    <td class="amount">₹${row.amount.toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
          <p class="muted" style="margin-top:24px;">${escapeHtml(SITE_CREDIT_LINE)}</p>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.setTimeout(() => popup.print(), 300);
    showToast('Printable ledger opened. Choose Save as PDF in the print dialog.', 'success');
  };

  const handleRestoreBackupFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const backupContacts = parsed?.contacts;

      if (!Array.isArray(backupContacts)) {
        showToast('Invalid backup file: contacts array missing.', 'error');
        return;
      }

      const confirmed = await confirmAction({
        title: 'Restore backup?',
        message: `This will import ${backupContacts.length} contact(s). Existing duplicate IDs will be skipped by the server.`,
        confirmLabel: 'Restore Backup',
        tone: 'default',
      });
      if (!confirmed) return;

      const res = await fetch('/api/contacts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: backupContacts }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showToast(data?.error || 'Failed to restore backup.', 'error');
        return;
      }

      const data = await res.json();
      await loadContacts();
      showToast(`Restored ${data.insertedCount || 0} contact(s) from backup`, 'success');
    } catch (error) {
      console.error('Restore backup failed:', error);
      showToast('Could not read this backup file.', 'error');
    }
  };

  const openSecurityModal = (type: 'password' | 'pin' | 'answer') => {
    setSecurityModal(type);
    setSecurityCurrentPassword('');
    setSecurityPrimaryValue('');
    setSecurityConfirmValue('');
  };

  const closeSecurityModal = () => {
    if (isUpdatingSecurity) return;
    setSecurityModal(null);
    setSecurityCurrentPassword('');
    setSecurityPrimaryValue('');
    setSecurityConfirmValue('');
  };

  const getPasswordScore = (value: string) => {
    return [
      value.length >= 8,
      /[A-Z]/.test(value),
      /[0-9]/.test(value),
      /[^A-Za-z0-9]/.test(value),
    ].filter(Boolean).length;
  };

  const handleSecurityUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!securityModal) return;

    if (!securityCurrentPassword) {
      showToast('Enter your current password first.', 'warn');
      return;
    }

    if (!securityPrimaryValue) {
      showToast('Enter the new security value.', 'warn');
      return;
    }

    if (securityPrimaryValue !== securityConfirmValue) {
      showToast('Confirmation does not match.', 'warn');
      return;
    }

    const payload: {
      currentPassword: string;
      newPassword?: string;
      recoveryPin?: string;
      securityAnswer?: string;
    } = { currentPassword: securityCurrentPassword };

    if (securityModal === 'password') {
      if (securityPrimaryValue.length < 8) {
        showToast('New password must be at least 8 characters.', 'warn');
        return;
      }
      payload.newPassword = securityPrimaryValue;
    }

    if (securityModal === 'pin') {
      if (!/^\d{4}$/.test(securityPrimaryValue)) {
        showToast('Recovery PIN must be exactly 4 digits.', 'warn');
        return;
      }
      payload.recoveryPin = securityPrimaryValue;
    }

    if (securityModal === 'answer') {
      if (securityPrimaryValue.trim().length < 2) {
        showToast('Recovery answer is too short.', 'warn');
        return;
      }
      payload.securityAnswer = securityPrimaryValue;
    }

    setIsUpdatingSecurity(true);

    try {
      const res = await fetch('/api/auth/security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Could not update security settings.', 'error');
        return;
      }

      showToast('Account security updated', 'success');
      setSecurityModal(null);
      setSecurityCurrentPassword('');
      setSecurityPrimaryValue('');
      setSecurityConfirmValue('');
    } catch (error) {
      console.error('Security update failed:', error);
      showToast('Could not update security settings.', 'error');
    } finally {
      setIsUpdatingSecurity(false);
    }
  };

  const securityModalCopy = securityModal
    ? {
      password: {
        title: 'Change Password',
        description: 'Create a new password for your account. You will need your current password to confirm this change.',
        label: 'New Password',
        confirmLabel: 'Confirm New Password',
        placeholder: 'At least 8 characters',
        type: 'password',
        inputMode: undefined,
        maxLength: undefined,
        saveLabel: 'Save Password',
      },
      pin: {
        title: 'Update Recovery PIN',
        description: 'Replace the 4-digit PIN used during account recovery.',
        label: 'New Recovery PIN',
        confirmLabel: 'Confirm Recovery PIN',
        placeholder: '4 digits',
        type: 'password',
        inputMode: 'numeric' as const,
        maxLength: 4,
        saveLabel: 'Save PIN',
      },
      answer: {
        title: 'Update Recovery Answer',
        description: 'Replace your recovery answer with something memorable but hard to guess.',
        label: 'New Recovery Answer',
        confirmLabel: 'Confirm Recovery Answer',
        placeholder: 'Your private answer',
        type: 'text',
        inputMode: undefined,
        maxLength: undefined,
        saveLabel: 'Save Answer',
      },
    }[securityModal]
    : null;
  const passwordScore = getPasswordScore(securityPrimaryValue);
  const isChatOpen = activeTab === 'ledgers' && mobileView === 'ledger' && !!selectedContactId;

  // Phone/PWA back closes overlays; chat/trips use URL history (dashboard-nav)
  useHistoryLayer(!!detailTx, () => setDetailTx(null));
  useHistoryLayer(!!txSharePayload, () => setTxSharePayload(null));
  useHistoryLayer(isAddTransactionOpen, () => {
    setIsAddTransactionOpen(false);
    setEditingTransaction(null);
  });
  useHistoryLayer(isAddContactOpen, () => setIsAddContactOpen(false));
  useHistoryLayer(isEditContactOpen, () => setIsEditContactOpen(false));
  useHistoryLayer(isShareModalOpen, () => setIsShareModalOpen(false));
  useHistoryLayer(!!historyTx, () => setHistoryTx(null));
  useHistoryLayer(!!securityModal, () => setSecurityModal(null));
  useHistoryLayer(isEditProfileOpen, () => setIsEditProfileOpen(false));
  useHistoryLayer(!!confirmDialog, () => closeConfirmDialog(false));
  useHistoryLayer(isContactMenuOpen, () => setIsContactMenuOpen(false));
  useHistoryLayer(!!profileContactId, () => setProfileContactId(null));

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden relative" style={{ background: 'var(--bg-raised)', fontFamily: "'Outfit', system-ui, sans-serif", color: 'var(--text-primary)' }}>

      {/* ── Toast Container ─────────────────────────── */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}${t.leaving ? ' leaving' : ''}`}>
            <span className="shrink-0 text-base">
              {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : t.type === 'warn' ? '⚠️' : 'ℹ️'}
            </span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      {profileContact && (
        <ContactProfilePanel
          contact={profileContact}
          balance={getContactBalance(profileContact)}
          showBalances={showBalances}
          onToggleBalances={() => setShowBalances((v) => !v)}
          onClose={closeContactProfile}
          onMessage={() => {
            const id = profileContact.id;
            closeContactProfile();
            openContactChat(id);
          }}
          onEdit={
            profileContact.role === 'peer'
              ? undefined
              : () => {
                  setContactName(profileContact.name);
                  setContactPhone(profileContact.phone);
                  setContactEmail(profileContact.email || '');
                  setContactDueDate(profileContact.dueDate || '');
                  setContactAvatarSeed(
                    (profileContact.avatarSeed as AvatarPresetId) ||
                      presetFromFallback(profileContact.id)
                  );
                  if (selectedContactId !== profileContact.id) {
                    setSelectedContactId(profileContact.id);
                  }
                  closeContactProfile();
                  setIsEditContactOpen(true);
                }
          }
          onCopyPhone={
            profileContact.phone
              ? async () => {
                  try {
                    await navigator.clipboard.writeText(profileContact.phone);
                    showToast('Phone copied', 'success');
                  } catch {
                    showToast('Could not copy phone', 'error');
                  }
                }
              : undefined
          }
          onCall={
            profileContact.phone && !profileContact.isSample
              ? () => {
                  window.location.href = `tel:${profileContact.phone.replace(/[^\d+]/g, '')}`;
                }
              : undefined
          }
          onShareChat={
            profileContact.role === 'peer'
              ? undefined
              : () => {
                  if (selectedContactId !== profileContact.id) {
                    openContactChat(profileContact.id);
                  }
                  closeContactProfile();
                  setIsShareModalOpen(true);
                }
          }
          onCopyChatLink={
            profileContact.role === 'peer'
              ? undefined
              : async () => {
                  try {
                    const shareUrl = await getOrCreateShareUrl(profileContact.id);
                    await copyTextToClipboard(shareUrl, 'Chat link copied');
                    closeContactProfile();
                  } catch {
                    showToast('Could not create chat link', 'error');
                  }
                }
          }
          onSettleFull={
            getContactBalance(profileContact) !== 0
              ? () => {
                  const id = profileContact.id;
                  const balance = getContactBalance(profileContact);
                  closeContactProfile();
                  openContactChat(id);
                  const settleAmount = Math.abs(balance);
                  setTxAmount(settleAmount.toString());
                  setTxType(balance > 0 ? 'got' : 'gave');
                  setTxRemark('🤝 Full Settlement');
                  setTxMode('Cash');
                  setTxCategory('personal');
                  setTxDate(new Date().toISOString().split('T')[0]);
                  setTxDueDate('');
                  setEditingTransaction(null);
                  setIsAddTransactionOpen(true);
                }
              : undefined
          }
          onSettlePartial={
            getContactBalance(profileContact) !== 0
              ? () => {
                  const id = profileContact.id;
                  const balance = getContactBalance(profileContact);
                  closeContactProfile();
                  openContactChat(id);
                  setTxAmount('');
                  setTxType(balance > 0 ? 'got' : 'gave');
                  setTxRemark('🤝 Partial Settlement');
                  setTxMode('Cash');
                  setTxCategory('personal');
                  setTxDate(new Date().toISOString().split('T')[0]);
                  setTxDueDate('');
                  setEditingTransaction(null);
                  setIsAddTransactionOpen(true);
                }
              : undefined
          }
          onUnlink={
            (profileContact.role === 'owner' || !profileContact.role) && profileContact.peerLinked
              ? async () => {
                  const id = profileContact.id;
                  closeContactProfile();
                  setSelectedContactId(id);
                  // handleUnlinkPeer reads selectedContactId; open after state flush
                  await Promise.resolve();
                  setSelectedContactId(id);
                  const confirmed = await confirmAction({
                    title: 'Unlink shared access?',
                    message: 'They will lose edit access until they claim this chat again with a matching phone/email.',
                    confirmLabel: 'Unlink',
                    tone: 'danger',
                  });
                  if (!confirmed) return;
                  try {
                    const res = await fetch(`/api/contacts/${id}/unlink`, { method: 'POST' });
                    if (!res.ok) {
                      const body = await res.json().catch(() => ({}));
                      throw new Error(body.error || 'Failed to unlink');
                    }
                    await loadContacts();
                    showToast('Shared access unlinked', 'success');
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : 'Failed to unlink', 'error');
                  }
                }
              : undefined
          }
          onDelete={
            profileContact.role === 'peer'
              ? undefined
              : async () => {
                  const id = profileContact.id;
                  closeContactProfile();
                  await handleDeleteContact(id);
                }
          }
        />
      )}

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          tone={confirmDialog.tone}
          extraActions={confirmDialog.extraActions}
          onCancel={() => closeConfirmDialog(false)}
          onConfirm={() => closeConfirmDialog(true)}
        />
      )}

      <TransactionShareSheet
        open={!!txSharePayload}
        data={txSharePayload}
        onClose={() => setTxSharePayload(null)}
        showToast={showToast}
      />

      {detailTx && selectedContact && (() => {
        const isGave = detailTx.type === 'gave';
        const accent = isGave ? 'var(--emerald)' : 'var(--rose)';
        const cat =
          LEDGER_CATEGORY_CONFIG[
            detailTx.category && LEDGER_CATEGORIES.includes(detailTx.category)
              ? detailTx.category
              : 'other'
          ];
        const actions = [
          {
            key: 'share',
            label: 'Share',
            icon: Share2,
            color: 'var(--primary)',
            onClick: () => {
              const tx = detailTx;
              const contact = selectedContact;
              setDetailTx(null);
              void (async () => {
                let chatLink: string | null = null;
                try {
                  chatLink = await getOrCreateShareUrl(contact.id);
                } catch {
                  chatLink = null;
                }
                setTxSharePayload({
                  transaction: tx,
                  contactName: contact.name,
                  userName: userName || 'You',
                  contactPhone: contact.phone || null,
                  chatLink,
                });
              })();
            },
          },
          {
            key: 'edit',
            label: 'Edit',
            icon: Pencil,
            color: 'var(--text-secondary)',
            onClick: () => {
              handleOpenEditTx(detailTx);
              setDetailTx(null);
            },
          },
          {
            key: 'history',
            label: 'History',
            icon: History,
            color: 'var(--text-muted)',
            onClick: () => {
              setHistoryTx(detailTx);
              setDetailTx(null);
            },
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: Trash2,
            color: 'var(--rose)',
            onClick: () => {
              const id = detailTx.id;
              setDetailTx(null);
              void handleDeleteTransaction(id);
            },
          },
        ] as const;

        return (
          <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center">
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.45)' }}
              onClick={() => setDetailTx(null)}
            />
            <div
              className="relative w-full max-w-md rounded-t-[20px] sm:rounded-[20px] overflow-hidden animate-slide-up"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
            >
              <div
                className="flex items-start justify-between gap-3 px-5 pt-4 pb-3"
                style={{ borderBottom: '1px solid var(--border-soft)' }}
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: accent }}>
                    {isGave ? 'You gave' : 'You got'} · {selectedContact.name}
                  </p>
                  <p className="text-3xl font-bold tabular-nums mt-1 leading-none" style={{ color: accent }}>
                    ₹{detailTx.amount.toLocaleString('en-IN')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailTx(null)}
                  className="h-9 w-9 rounded-xl inline-flex items-center justify-center shrink-0"
                  style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-3">
                {detailTx.remark ? (
                  <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {detailTx.remark}
                  </p>
                ) : null}

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: 'Date', value: formatEventDate(detailTx.date) },
                    { label: 'Mode', value: detailTx.mode === 'Online Transfer' ? 'Online' : 'Cash' },
                    { label: 'Category', value: cat.label },
                    {
                      label: 'Due',
                      value: detailTx.dueDate ? formatEventDate(detailTx.dueDate) : '—',
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="rounded-xl px-3 py-2.5"
                      style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)' }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        {row.label}
                      </p>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                        {row.value}
                      </p>
                    </div>
                  ))}
                </div>

                {detailTx.dueDate ? (
                  <p className="text-xs inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Clock3 className="w-3.5 h-3.5" />
                    Due {formatEventDate(detailTx.dueDate)}
                  </p>
                ) : null}
              </div>

              <div
                className="grid grid-cols-4 gap-2 px-4 pt-2"
                style={{
                  borderTop: '1px solid var(--border-soft)',
                  paddingBottom: 'max(0.85rem, env(safe-area-inset-bottom))',
                }}
              >
                {actions.map(({ key, label, icon: Icon, color, onClick }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={onClick}
                    className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl active:opacity-80"
                    style={{ background: 'var(--bg-raised)' }}
                  >
                    <span
                      className="h-10 w-10 rounded-full inline-flex items-center justify-center"
                      style={{
                        background: key === 'delete' ? 'rgba(194,59,74,0.1)' : 'var(--bg-surface)',
                        color,
                        border: '1px solid var(--border-soft)',
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {securityModal && securityModalCopy && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
            onClick={closeSecurityModal}
          />
          <div
            className="relative w-full max-w-md animate-slide-up rounded-t-3xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', boxShadow: '0 24px 80px rgba(0,0,0,0.32)', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="flex items-start justify-between gap-4 px-5 py-4" style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--primary)' }}>Security Center</p>
                <h3 className="mt-1 text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>{securityModalCopy.title}</h3>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{securityModalCopy.description}</p>
              </div>
              <button
                type="button"
                onClick={closeSecurityModal}
                disabled={isUpdatingSecurity}
                className="p-1.5 rounded-xl transition-colors disabled:opacity-50"
                style={{ color: 'var(--text-muted)', background: 'var(--bg-raised)' }}
                aria-label="Close security dialog"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSecurityUpdate} className="p-5 space-y-4">
              <div className="rounded-2xl p-3 text-xs leading-relaxed" style={{ background: 'rgba(15,118,110,0.08)', border: '1px solid rgba(15,118,110,0.18)', color: 'var(--text-secondary)' }}>
                Confirming your current password keeps sensitive recovery settings from being changed from an unattended session.
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Current Password</label>
                <input
                  type="password"
                  autoFocus
                  value={securityCurrentPassword}
                  onChange={(event) => setSecurityCurrentPassword(event.target.value)}
                  className="input-field"
                  placeholder="Required to continue"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{securityModalCopy.label}</label>
                <input
                  type={securityModalCopy.type}
                  inputMode={securityModalCopy.inputMode}
                  maxLength={securityModalCopy.maxLength}
                  value={securityPrimaryValue}
                  onChange={(event) => {
                    const nextValue = securityModal === 'pin'
                      ? event.target.value.replace(/[^0-9]/g, '')
                      : event.target.value;
                    setSecurityPrimaryValue(nextValue);
                  }}
                  className="input-field"
                  placeholder={securityModalCopy.placeholder}
                />
              </div>

              {securityModal === 'password' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-1">
                    {[0, 1, 2, 3].map((index) => (
                      <div
                        key={index}
                        className="h-1.5 rounded-full"
                        style={{ background: index < passwordScore ? '#34d399' : 'var(--bg-raised)' }}
                      />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Stronger passwords use 8+ characters with a mix of uppercase letters, numbers, and symbols.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{securityModalCopy.confirmLabel}</label>
                <input
                  type={securityModalCopy.type}
                  inputMode={securityModalCopy.inputMode}
                  maxLength={securityModalCopy.maxLength}
                  value={securityConfirmValue}
                  onChange={(event) => {
                    const nextValue = securityModal === 'pin'
                      ? event.target.value.replace(/[^0-9]/g, '')
                      : event.target.value;
                    setSecurityConfirmValue(nextValue);
                  }}
                  className="input-field"
                  placeholder="Re-enter to confirm"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={closeSecurityModal} disabled={isUpdatingSecurity}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdatingSecurity}>
                  {isUpdatingSecurity ? 'Saving...' : securityModalCopy.saveLabel}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSS Confetti Canvas */}
      {/* ── Confetti ─────────────────────────────── */}
      {particles.map((p) => (
        <div key={p.id} className="fixed pointer-events-none z-[60] rounded-sm"
          style={{ left: p.x, top: p.y, width: p.size, height: p.size, backgroundColor: p.color, transform: `rotate(${p.rotation}deg)`, opacity: 0.95 }} />
      ))}

      {/* ══════════════════════════════════════════════════════════
          PHONE APP SHELL (centered on desktop)
      ══════════════════════════════════════════════════════════ */}
      <div className="flex min-h-0 flex-1 justify-center overflow-hidden">
        <div
          className="relative flex h-full min-h-0 w-full max-w-md flex-col overflow-hidden"
          style={{ background: 'var(--bg-base)', borderLeft: '1px solid var(--border-soft)', borderRight: '1px solid var(--border-soft)' }}
        >
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">

            {/* Cold-start skeleton — skipped when local cache is warm */}
            {showBootSkeleton && activeTab !== 'settings' && activeTab !== 'trips' && (
              <FriendsListSkeleton />
            )}

            {/* Error state */}
            {showBootError && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-sm font-semibold"
                  style={{ background: 'rgba(194,59,74,0.08)', border: '1px solid rgba(194,59,74,0.15)', color: 'var(--rose)' }}>Offline</div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Couldn't load your data</h3>
                  <p className="text-sm max-w-xs" style={{ color: 'var(--text-secondary)' }}>Check your internet connection and try again.</p>
                </div>
                <button onClick={() => loadContacts()} className="btn-primary px-8">Retry</button>
              </div>
            )}

            {/* ── FRIENDS LIST (full screen) ─────────────────── */}
            {appReady && activeTab === 'ledgers' && !isChatOpen && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* App bar */}
                <div className="px-4 pt-3 pb-2 shrink-0" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-soft)' }}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => goToTab('settings')}
                        className="shrink-0 rounded-full"
                        aria-label="Open account"
                        title="Account"
                      >
                        <PersonAvatar
                          name={userName || 'You'}
                          seed={userAvatarSeed || userEmail || userPhone || userName || 'you'}
                          size="md"
                        />
                      </button>
                      <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Friends</h1>
                        <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                          {isRefreshing || dbStatus === 'connecting'
                            ? 'Updating…'
                            : dbStatus === 'error'
                              ? 'Offline copy'
                              : 'Synced'}
                          {' · '}
                          {userName || 'You'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setShowBalances(!showBalances)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: showBalances ? 'var(--accent)' : 'var(--bg-raised)', border: '1px solid var(--border-soft)', color: showBalances ? 'var(--primary)' : 'var(--text-muted)' }}
                        aria-label={showBalances ? 'Hide balances' : 'Show balances'}>
                        {showBalances
                          ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.71-1.581c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 3.029m-5.858-.908a3 3 0 00-4.243-4.243M9.878 9.878l-3.29-3.29" /></svg>}
                      </button>
                      <button onClick={() => {
                        setIsAddContactOpen(true);
                        setImportStatus(null);
                        setContactAvatarSeed(randomAvatarPreset());
                      }}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white"
                        style={{ background: 'linear-gradient(135deg,var(--primary),var(--primary))' }}
                        aria-label="Add contact">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input type="text" placeholder="Search friends…" value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 text-xs rounded-full font-medium outline-none"
                      style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)' }} />
                  </div>
                </div>

                {contacts.some((c) => c.isSample) ? (
                  <div
                    className="mx-4 mb-1 rounded-xl px-3 py-2.5"
                    style={{
                      background: 'rgba(180,83,9,0.1)',
                      border: '1px dashed rgba(180,83,9,0.35)',
                    }}
                  >
                    <p className="text-[11px] font-bold" style={{ color: '#b45309' }}>
                      Practice examples — not real people
                    </p>
                    <p className="text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
                      Tap around to learn the app. Remove them anytime from Account.
                    </p>
                  </div>
                ) : null}

                {/* Filter chips */}
                <div className="px-4 py-2 shrink-0 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  {(['all', 'credit', 'debit', 'settled'] as const).map(f => (
                    <button key={f} onClick={() => setStatusFilter(f)}
                      className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all"
                      style={{
                        background: statusFilter === f
                          ? f === 'credit' ? 'rgba(16,185,129,0.15)' : f === 'debit' ? 'rgba(244,63,94,0.15)' : f === 'settled' ? 'rgba(15,118,110,0.15)' : 'rgba(15,118,110,0.15)'
                          : 'var(--bg-raised)',
                        color: statusFilter === f
                          ? f === 'credit' ? '#6ee7b7' : f === 'debit' ? '#fda4af' : f === 'settled' ? 'var(--primary)' : 'var(--primary)'
                          : 'var(--text-muted)',
                        border: `1px solid ${statusFilter === f ? 'rgba(255,255,255,0.1)' : 'var(--border-muted)'}`,
                      }}>
                      {f === 'all' ? 'All' : f === 'credit' ? "You'll get" : f === 'debit' ? 'You owe' : 'Settled'}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full outline-none cursor-pointer"
                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)', color: 'var(--text-muted)' }}>
                    <option value="recent">Recent</option>
                    <option value="name">Name</option>
                    <option value="balance">Balance</option>
                  </select>
                </div>

                {/* Contact list */}
                <div className="flex-1 overflow-y-auto scrollbar-thin">
                  {contacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
                      <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl animate-fade-slide-up"
                        style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)' }}>📖</div>
                      <div className="space-y-1 animate-fade-slide-up" style={{ animationDelay: '0.1s' }}>
                        <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>No contacts yet</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Add a friend to start tracking shared balances</p>
                      </div>
                      <button onClick={() => { setContactAvatarSeed(randomAvatarPreset()); setIsAddContactOpen(true); }} className="btn-primary text-sm px-6 animate-fade-slide-up" style={{ animationDelay: '0.2s' }}>
                        ➕ Add First Contact
                      </button>
                    </div>
                  ) : (() => {
                    const filtered = contacts.filter(c => {
                      const bal = getContactBalance(c);
                      if (statusFilter === 'credit' && bal <= 0) return false;
                      if (statusFilter === 'debit' && bal >= 0) return false;
                      if (statusFilter === 'settled' && bal !== 0) return false;
                      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !c.phone.includes(searchQuery)) return false;
                      return true;
                    }).sort((a, b) => {
                      if (sortBy === 'name') return a.name.localeCompare(b.name);
                      if (sortBy === 'balance') return Math.abs(getContactBalance(b)) - Math.abs(getContactBalance(a));
                      const lastA = a.transactions.length ? new Date(a.transactions[a.transactions.length - 1].date).getTime() : new Date(a.createdAt).getTime();
                      const lastB = b.transactions.length ? new Date(b.transactions[b.transactions.length - 1].date).getTime() : new Date(b.createdAt).getTime();
                      return lastB - lastA;
                    });

                    return filtered.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
                        <div className="text-3xl">🔍</div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>No contacts match your filter</p>
                      </div>
                    ) : (
                      <div className="py-2">
                        {filtered.map(contact => {
                          const balance = getContactBalance(contact);
                          const isSelected = selectedContactId === contact.id;
                          const isPeekingThis = peekingContactId === contact.id;
                          const revealed = showBalances || isPeekingThis;
                          const balanceColor = balance > 0 ? '#10b981' : balance < 0 ? '#f43f5e' : 'var(--text-muted)';
                          const borderColor = balance > 0 ? '#10b981' : balance < 0 ? '#f43f5e' : 'transparent';
                          const dueReminder = balanceReminders.find((r) => r.contactId === contact.id);

                          return (
                            <div key={contact.id}
                              className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all duration-150`}
                              style={{
                                background: isSelected ? 'rgba(15,118,110,0.08)' : 'transparent',
                                borderLeft: `3px solid ${isSelected ? 'var(--primary)' : borderColor}`,
                              }}
                              onClick={() => openContactChat(contact.id)}>

                              <button
                                type="button"
                                className="shrink-0 rounded-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openContactProfile(contact.id);
                                }}
                                aria-label={`${contact.name} profile`}
                              >
                                <PersonAvatar
                                  name={contact.name}
                                  seed={contact.avatarSeed || contact.id}
                                  size="md"
                                  ring={isSelected}
                                />
                              </button>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{contact.name}</p>
                                  {contact.isSample && (
                                    <span
                                      className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                                      style={{
                                        background: 'rgba(180,83,9,0.14)',
                                        color: '#b45309',
                                        border: '1px dashed rgba(180,83,9,0.4)',
                                      }}
                                    >
                                      Sample
                                    </span>
                                  )}
                                  {(contact.role === 'peer' || contact.peerLinked) && (
                                    <span
                                      className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                                      style={{
                                        background: contact.role === 'peer' ? 'rgba(6,182,212,0.15)' : 'rgba(15,118,110,0.15)',
                                        color: contact.role === 'peer' ? '#22d3ee' : 'var(--primary)',
                                      }}
                                    >
                                      {contact.role === 'peer' ? 'Linked' : 'Shared'}
                                    </span>
                                  )}
                                  {dueReminder && (
                                    <span
                                      className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                                      style={{
                                        background:
                                          dueReminder.urgency === 'overdue'
                                            ? 'rgba(244,63,94,0.15)'
                                            : 'rgba(245,158,11,0.15)',
                                        color: dueReminder.urgency === 'overdue' ? '#fb7185' : '#fbbf24',
                                      }}
                                    >
                                      {dueReminder.urgency === 'overdue' ? 'Overdue' : 'Due'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                                  {dueReminder
                                    ? formatReminderLabel(dueReminder)
                                    : contact.role === 'peer'
                                      ? `From ${contact.ownerName || 'someone'} · both can edit`
                                      : contact.phone || 'No phone'}
                                </p>
                              </div>

                              {/* Balance + peek */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className="text-right">
                                  {balance !== 0 && (
                                    <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                      {balance > 0 ? "you'll get" : 'you owe'}
                                    </p>
                                  )}
                                  <p className="text-sm font-bold" style={{ color: balanceColor }}>
                                    {balance === 0 ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}>Settled</span>
                                    ) : revealed ? (
                                      `${balance > 0 ? '+' : '-'}₹${Math.abs(balance).toLocaleString('en-IN')}`
                                    ) : '•••'}
                                  </p>
                                </div>
                                {balance !== 0 && (
                                  <button
                                    onMouseDown={e => { e.stopPropagation(); setPeekingContactId(contact.id); }}
                                    onMouseUp={e => { e.stopPropagation(); setPeekingContactId(null); }}
                                    onMouseLeave={() => setPeekingContactId(null)}
                                    onTouchStart={e => { e.stopPropagation(); setPeekingContactId(contact.id); }}
                                    onTouchEnd={e => { e.stopPropagation(); setPeekingContactId(null); }}
                                    className="p-1 rounded-md transition-all select-none"
                                    title="Hold to peek"
                                    style={{ color: isPeekingThis ? 'var(--primary)' : 'var(--text-muted)' }}>
                                    {isPeekingThis
                                      ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                      : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.71-1.581c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 3.029m-5.858-.908a3 3 0 00-4.243-4.243M9.878 9.878l-3.29-3.29" /></svg>
                                    }
                                  </button>
                                )}
                              </div>

                            </div>
                          );
                        })}

                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ── CHAT (full screen) ─────────────────────────── */}
            {appReady && activeTab === 'ledgers' && isChatOpen && selectedContact && (() => {
              const contactBal = getContactBalance(selectedContact);

              return (
                <div className="relative flex-1 flex flex-col overflow-hidden animate-scale-in" style={{ background: 'var(--bg-base)' }}>
                  {/* Floating chat controls (no solid header/footer chrome) */}
                  <div className="absolute top-0 inset-x-0 z-20 pointer-events-none">
                    <div className="pointer-events-auto px-3 pt-3 pb-2 flex items-center gap-2">
                      <button
                        onClick={closeContactChat}
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 backdrop-blur-md"
                        style={{ background: 'color-mix(in srgb, var(--bg-surface) 88%, transparent)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)' }}
                        aria-label="Back to friends"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() => openContactProfile(selectedContact.id)}
                        className="min-w-0 flex-1 rounded-full px-3 py-1.5 backdrop-blur-md text-left"
                        style={{ background: 'color-mix(in srgb, var(--bg-surface) 88%, transparent)', border: '1px solid var(--border-soft)' }}
                        aria-label={`${selectedContact.name} profile`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <PersonAvatar
                            name={selectedContact.name}
                            seed={selectedContact.avatarSeed || selectedContact.id}
                            size="xs"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="font-bold text-xs truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                                {selectedContact.name}
                              </p>
                              {selectedContact.isSample && (
                                <span
                                  className="shrink-0 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded"
                                  style={{
                                    background: 'rgba(180,83,9,0.14)',
                                    color: '#b45309',
                                    border: '1px dashed rgba(180,83,9,0.4)',
                                  }}
                                >
                                  Sample
                                </span>
                              )}
                              {(selectedContact.role === 'peer' || selectedContact.peerLinked) && (
                                <span className="shrink-0 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                                  style={{ background: 'rgba(6,182,212,0.18)', color: '#22d3ee' }}>
                                  Both edit
                                </span>
                              )}
                            </div>
                            <p
                              className="text-[10px] font-semibold truncate leading-tight"
                              style={{
                                color:
                                  contactBal > 0 ? '#34d399' : contactBal < 0 ? '#fb7185' : 'var(--text-muted)',
                              }}
                            >
                              {contactBal === 0
                                ? 'Settled'
                                : contactBal > 0
                                  ? `Owes you ₹${contactBal.toLocaleString('en-IN')}`
                                  : `You owe ₹${Math.abs(contactBal).toLocaleString('en-IN')}`}
                            </p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => setIsLedgerSearchOpen((open) => !open)}
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 backdrop-blur-md"
                        style={{
                          background: 'color-mix(in srgb, var(--bg-surface) 88%, transparent)',
                          border: '1px solid var(--border-soft)',
                          color: isLedgerSearchOpen || ledgerSearchQuery ? 'var(--primary)' : 'var(--text-muted)',
                        }}
                        aria-label="Search in chat"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>

                      <div className="relative shrink-0">
                        <button
                          onClick={() => setIsContactMenuOpen(!isContactMenuOpen)}
                          className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md"
                          style={{ background: 'color-mix(in srgb, var(--bg-surface) 88%, transparent)', border: '1px solid var(--border-soft)', color: 'var(--text-muted)' }}
                          aria-label="More options"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        {isContactMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsContactMenuOpen(false)} />
                            <div
                              className="absolute right-0 mt-2 w-56 rounded-xl py-1.5 z-20 animate-fade-slide-down"
                              style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-card)' }}
                            >
                              <div className="px-4 py-2.5 mb-1" style={{ borderBottom: '1px solid var(--border-soft)' }}>
                                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                  {selectedContact.role === 'peer' ? 'Shared ledger' : 'Contact'}
                                </p>
                                <p className="text-xs font-semibold mt-1 truncate" style={{ color: 'var(--text-primary)' }}>
                                  {selectedContact.role === 'peer'
                                    ? (selectedContact.ownerName || 'Owner')
                                    : selectedContact.phone}
                                </p>
                                {selectedContact.role !== 'peer' && selectedContact.email ? (
                                  <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                                    {selectedContact.email}
                                  </p>
                                ) : null}
                                {(selectedContact.peerLinked || selectedContact.role === 'peer') && (
                                  <p className="text-[10px] mt-1 font-semibold" style={{ color: '#22d3ee' }}>
                                    Both parties can edit · changes are logged
                                  </p>
                                )}
                              </div>

                              {contactBal !== 0 && (
                                <button onClick={() => { setIsContactMenuOpen(false); handleOpenSettlement('full'); }}
                                  className="w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors"
                                  style={{ color: '#10b981' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.08)'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                  🤝 Settle in full
                                </button>
                              )}

                              {contactBal !== 0 && (
                                <button onClick={() => { setIsContactMenuOpen(false); handleOpenSettlement('partial'); }}
                                  className="w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors"
                                  style={{ color: '#22d3ee' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(6,182,212,0.08)'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                  ✂️ Settle partly
                                </button>
                              )}

                              {contactBal !== 0 && selectedContact.role !== 'peer' && (
                                <button onClick={() => { setIsContactMenuOpen(false); handleWhatsAppReminder(); }}
                                  className="w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors"
                                  style={{ color: 'var(--primary)' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(15,118,110,0.08)'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                  💬 WhatsApp reminder
                                </button>
                              )}

                              {contactBal !== 0 && (
                                <button onClick={() => { setIsContactMenuOpen(false); handleCopyReminder(); }}
                                  className="w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors"
                                  style={{ color: '#38bdf8' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(56,189,248,0.08)'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                  📋 Copy reminder
                                </button>
                              )}

                              {selectedContact.role !== 'peer' && (
                                <button onClick={() => { setIsContactMenuOpen(false); handleCopyChatLink(); }}
                                  className="w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors"
                                  style={{ color: '#a78bfa' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(15,118,110,0.08)'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                  🔗 Copy chat link
                                </button>
                              )}

                              {selectedContact.role !== 'peer' && (
                                <button onClick={() => { setIsContactMenuOpen(false); setIsShareModalOpen(true); }}
                                  className="w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors"
                                  style={{ color: 'var(--primary)' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(15,118,110,0.08)'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                  Share / copy record
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setIsContactMenuOpen(false);
                                  openContactProfile(selectedContact.id);
                                }}
                                className="w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors"
                                style={{ color: 'var(--text-primary)' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                View profile
                              </button>

                              {selectedContact.role !== 'peer' && (
                                <button onClick={() => {
                                  setIsContactMenuOpen(false);
                                  setContactName(selectedContact.name);
                                  setContactPhone(selectedContact.phone);
                                  setContactEmail(selectedContact.email || '');
                                  setContactDueDate(selectedContact.dueDate || '');
                                  setContactAvatarSeed(
                                    (selectedContact.avatarSeed as AvatarPresetId) ||
                                      presetFromFallback(selectedContact.id)
                                  );
                                  setIsEditContactOpen(true);
                                }}
                                  className="w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors"
                                  style={{ color: 'var(--text-primary)' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                  Edit contact
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setIsContactMenuOpen(false);
                                  const deleted = (selectedContact.allTransactions || []).filter((t) => t.deletedAt);
                                  const withHistory = (selectedContact.allTransactions || []).filter(
                                    (t) => (t.history && t.history.length > 0) || t.deletedAt
                                  );
                                  if (withHistory.length === 0) {
                                    showToast('No change history in this chat yet', 'info');
                                    return;
                                  }
                                  setHistoryTx(deleted[0] || withHistory[withHistory.length - 1]);
                                }}
                                className="w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors"
                                style={{ color: '#94a3b8' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                Change history
                              </button>

                              {(selectedContact.role === 'owner' || !selectedContact.role) && selectedContact.peerLinked && (
                                <button onClick={() => { setIsContactMenuOpen(false); handleUnlinkPeer(); }}
                                  className="w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors"
                                  style={{ color: '#fbbf24' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(251,191,36,0.08)'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                  Unlink shared access
                                </button>
                              )}

                              {selectedContact.role !== 'peer' && (
                                <button onClick={() => { setIsContactMenuOpen(false); handleDeleteContact(selectedContact.id); }}
                                  className="w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors"
                                  style={{ color: '#f43f5e' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(244,63,94,0.08)'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  Delete contact
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {isLedgerSearchOpen && (
                      <div className="pointer-events-auto px-3 pb-2">
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            autoFocus
                            placeholder="Search remarks, amount, mode…"
                            value={ledgerSearchQuery}
                            onChange={(e) => setLedgerSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-9 py-2 text-xs rounded-full outline-none backdrop-blur-md"
                            style={{ background: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)' }}
                          />
                          {ledgerSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setLedgerSearchQuery('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full"
                              style={{ color: 'var(--text-muted)' }}
                              aria-label="Clear search"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Full-bleed payment chat */}
                  <div
                    ref={chatScrollRef}
                    className="flex-1 overflow-y-auto scrollbar-thin px-3 pt-16 pb-24 md:px-5"
                    style={{
                      background: 'var(--bg-base)',
                      backgroundImage: 'radial-gradient(rgba(148,163,184,0.08) 1px, transparent 1px)',
                      backgroundSize: '18px 18px',
                    }}
                  >
                    {selectedContact.isSample ? (
                      <div
                        className="mb-3 rounded-xl px-3 py-2.5"
                        style={{
                          background: 'rgba(180,83,9,0.1)',
                          border: '1px dashed rgba(180,83,9,0.35)',
                        }}
                      >
                        <p className="text-[11px] font-bold" style={{ color: '#b45309' }}>
                          Sample friend — practice only
                        </p>
                        <p className="text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
                          These payments are examples so you can learn the chat ledger. Not real money.
                        </p>
                      </div>
                    ) : null}
                    {filteredTransactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}>💬</div>
                        <div>
                          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>No payments yet</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Add a record — it will appear here like a chat</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 pb-2">
                        {chatTransactionGroups.map((group) => (
                          <div key={group.date} className="flex flex-col gap-2.5">
                            <div className="sticky top-1 z-10 flex justify-center py-1">
                              <span
                                className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wide shadow-sm"
                                style={{
                                  background: 'var(--bg-surface)',
                                  color: 'var(--text-secondary)',
                                  border: '1px solid var(--border-soft)',
                                }}
                              >
                                {formatChatDateLabel(group.date)}
                              </span>
                            </div>

                            {group.items.map((tx) => {
                              const isGave = tx.type === 'gave';
                              return (
                                <div
                                  key={tx.id}
                                  className={`flex w-full ${isGave ? 'justify-end' : 'justify-start'} animate-fade-slide-up`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => setDetailTx(tx)}
                                    className="max-w-[85%] rounded-2xl px-4 py-3 text-left active:opacity-90 transition-opacity"
                                    style={{
                                      background: isGave
                                        ? 'rgba(16,185,129,0.14)'
                                        : 'rgba(244,63,94,0.12)',
                                      border: `1px solid ${isGave ? 'rgba(16,185,129,0.28)' : 'rgba(244,63,94,0.28)'}`,
                                    }}
                                  >
                                    <p
                                      className="text-[11px] font-bold"
                                      style={{ color: isGave ? '#34d399' : '#fb7185' }}
                                    >
                                      {isGave ? 'You gave' : 'You got'}
                                    </p>
                                    <p
                                      className={`${compactLedgerView ? 'text-xl' : 'text-2xl'} font-bold tabular-nums mt-0.5 leading-none`}
                                      style={{ color: isGave ? '#10b981' : '#f43f5e' }}
                                    >
                                      ₹{tx.amount.toLocaleString('en-IN')}
                                    </p>
                                    {tx.remark ? (
                                      <p
                                        className="text-sm mt-2 font-medium leading-snug"
                                        style={{ color: 'var(--text-primary)' }}
                                      >
                                        {tx.remark}
                                      </p>
                                    ) : null}
                                    <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                                      {formatEventDate(tx.date)}
                                      {' · '}
                                      {tx.mode === 'Online Transfer' ? 'Online' : 'Cash'}
                                      {' · '}
                                      {LEDGER_CATEGORY_CONFIG[tx.category && LEDGER_CATEGORIES.includes(tx.category) ? tx.category : 'other'].label}
                                      {tx.dueDate ? ` · Due ${formatEventDate(tx.dueDate)}` : ''}
                                    </p>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Floating Gave / Got dock */}
                  <div className="absolute bottom-5 inset-x-0 z-20 flex justify-center px-4 pointer-events-none">
                    <div
                      className="pointer-events-auto flex items-center gap-2 p-1.5 rounded-full backdrop-blur-xl"
                      style={{
                        background: 'color-mix(in srgb, var(--bg-surface) 88%, transparent)',
                        border: '1px solid var(--border-soft)',
                        boxShadow: '0 14px 44px rgba(0,0,0,0.32)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenAddTx('got')}
                        className="flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full text-sm font-bold active:scale-[0.97] transition-all"
                        style={{
                          background: 'rgba(194,59,74,0.08)',
                          border: '1px solid rgba(251,113,133,0.35)',
                          color: '#fb7185',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                        }}
                      >
                        <span
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-base font-bold leading-none"
                          style={{ background: 'var(--rose)' }}
                        >
                          ↓
                        </span>
                        Got
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenAddTx('gave')}
                        className="flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full text-sm font-bold active:scale-[0.97] transition-all"
                        style={{
                          background: 'rgba(4,120,87,0.08)',
                          border: '1px solid rgba(52,211,153,0.35)',
                          color: '#34d399',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                        }}
                      >
                        <span
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-base font-bold leading-none"
                          style={{ background: 'var(--emerald)' }}
                        >
                          ↑
                        </span>
                        Gave
                      </button>
                    </div>
                  </div>

                </div>
              );
            })()}

            {/* ── TRIP EXPENSES TAB ──────────────────────────── */}
            {activeTab === 'trips' && (
              <TripExpensesView
                contacts={contacts}
                userName={userName || 'You'}
                userAvatarSeed={userAvatarSeed || undefined}
                onOpenAccount={() => goToTab('settings')}
                onRecordToLedger={handleRecordTripSettlement}
                showToast={showToast}
              />
            )}

            {/* ── ACTIVITY TAB ─────────────────────────────── */}
            {appReady && (activeTab === 'activity' || activeTab === 'insights') && (
              <ActivityFeed
                contacts={contacts}
                netBalance={stats.netBalance}
                totalCredit={stats.totalCredit}
                totalDebit={stats.totalDebit}
                showBalances={showBalances}
                userName={userName || 'You'}
                userAvatarSeed={userAvatarSeed || undefined}
                onToggleBalances={() => setShowBalances((v) => !v)}
                onOpenAccount={() => goToTab('settings')}
                onOpenContact={(id) => openContactChat(id)}
                onOpenTrip={(tripId) => {
                  pushDashboardNav({ tab: 'trips', tripId, contactId: null });
                  setActiveTab('trips');
                  setMobileView('list');
                }}
              />
            )}

            {/* ── ACCOUNT TAB ──────────────────────────────── */}
            {showBootSkeleton && activeTab === 'settings' ? <AccountPanelSkeleton /> : null}
            {appReady && activeTab === 'settings' && (
              <AccountPanel
                userName={userName}
                userEmail={userEmail}
                userPhone={userPhone}
                userId={userEmail || userPhone || userName}
                avatarSeed={userAvatarSeed || undefined}
                contactCount={ledgerSummary.contactCount}
                transactionCount={ledgerSummary.transactionCount}
                lastActivityLabel={
                  ledgerSummary.lastActivity
                    ? ledgerSummary.lastActivity.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                    : '—'
                }
                theme={theme}
                defaultTxMode={defaultTxMode}
                showBalances={showBalances}
                compactLedgerView={compactLedgerView}
                hasContacts={contacts.length > 0}
                restoreInputRef={restoreInputRef}
                onBack={() => goToTab('ledgers')}
                onEditProfile={openEditProfile}
                onLogout={handleLogout}
                onToggleTheme={toggleTheme}
                onSetDefaultTxMode={setDefaultTxMode}
                onToggleShowBalances={() => setShowBalances((current) => !current)}
                onToggleCompactLedger={() => setCompactLedgerView((current) => !current)}
                onExportBackup={handleExportBackup}
                onExportCsv={handleExportCsv}
                onPrintPdf={handlePrintLedgerPdf}
                onRestoreClick={() => restoreInputRef.current?.click()}
                onRestoreFile={handleRestoreBackupFile}
                onCopySummary={handleCopyLedgerSummary}
                onOpenSecurity={openSecurityModal}
                hasSampleData={contacts.some((c) => c.isSample)}
                onClearSample={async () => {
                  const confirmed = await confirmAction({
                    title: 'Remove sample examples?',
                    message: 'This deletes only the practice friends and sample trip. Your real data stays.',
                    confirmLabel: 'Remove samples',
                  });
                  if (confirmed) await handleClearSampleData();
                }}
                onWipeData={async () => {
                  const confirmed = await confirmAction({
                    title: 'Wipe all data?',
                    message:
                      'This permanently deletes all contacts and transactions. Download a local copy first if you may need it later.',
                    confirmLabel: 'Wipe All Data',
                    tone: 'danger',
                    extraActions: [
                      {
                        label: 'Download Excel (.csv)',
                        onClick: () => handleExportCsv(),
                      },
                      {
                        label: 'Download text (.txt)',
                        onClick: () => handleExportTxt(),
                      },
                    ],
                  });
                  if (confirmed) await handleWipeData();
                }}
              />
            )}

          </main>

          {/* App bottom nav — hidden on chat & account */}
          {!isChatOpen && activeTab !== 'settings' && (
            <nav
              className="z-40 flex h-16 shrink-0 items-stretch"
              style={{ background: 'var(--bg-glass)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border-soft)' }}
            >
              {([
                {
                  tab: 'ledgers' as const, label: 'Friends', icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'ledgers' ? 2.5 : 2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  )
                },
                {
                  tab: 'trips' as const, label: 'Trips', icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'trips' ? 2.5 : 2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )
                },
                {
                  tab: 'activity' as const, label: 'Activity', icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'activity' ? 2.5 : 2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )
                },
              ] as const).map(({ tab, label, icon }) => (
                <button key={tab} onClick={() => goToTab(tab)}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors relative"
                  style={{ color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {activeTab === tab && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary" />
                  )}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
                  <span className="text-[10px] font-semibold">{label}</span>
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          ADD CONTACT MODAL
      ══════════════════════════════════════════════════════ */}
      {isAddContactOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => setIsAddContactOpen(false)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-t-3xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <h3 className="font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>Add Contact</h3>
              <button onClick={() => setIsAddContactOpen(false)} className="p-1.5 rounded-xl transition-colors" style={{ color: 'var(--text-muted)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddContactSubmit} className="p-5 space-y-4">
              {/* Mobile contact sync */}
              <div className="p-4 rounded-2xl space-y-3" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold text-primary" style={{ background: 'var(--accent)' }}>Sync</div>
                  <div>
                    <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Import from phone</h4>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sync contacts on supported browsers</p>
                  </div>
                </div>

                {!isMobileDevice ? (
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <p className="text-xs font-medium" style={{ color: '#fcd34d' }}>Open on Android Chrome to import contacts automatically.</p>
                  </div>
                ) : contactsSupported ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button type="button" disabled={isImportingContacts} onClick={() => handleImportContacts(false)}
                        className="btn-primary flex-1 text-xs px-2 py-2.5">
                        {isImportingContacts ? (
                          <>
                            <svg className="w-3 h-3 animate-spin inline-block mr-1" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                            Opening…
                          </>
                        ) : '👤 Select Single'}
                      </button>
                      <button type="button" disabled={isImportingContacts} onClick={() => handleImportContacts(true)}
                        className="btn-primary flex-1 text-xs px-2 py-2.5">
                        {isImportingContacts ? (
                          <>
                            <svg className="w-3 h-3 animate-spin inline-block mr-1" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                            Opening…
                          </>
                        ) : '👥 Select Multiple'}
                      </button>
                    </div>
                    {importStatus && (
                      <div className="flex items-start gap-2 p-3 rounded-xl"
                        style={{
                          background: importStatus.type === 'success' ? 'rgba(16,185,129,0.08)' : importStatus.type === 'info' ? 'rgba(15,118,110,0.08)' : 'rgba(244,63,94,0.08)',
                          border: `1px solid ${importStatus.type === 'success' ? 'rgba(16,185,129,0.2)' : importStatus.type === 'info' ? 'rgba(15,118,110,0.2)' : 'rgba(244,63,94,0.2)'}`,
                        }}>
                        <span className="shrink-0 text-sm">{importStatus.type === 'success' ? '✅' : importStatus.type === 'info' ? 'ℹ️' : '⚠️'}</span>
                        <p className="text-xs font-medium leading-relaxed"
                          style={{ color: importStatus.type === 'success' ? '#6ee7b7' : importStatus.type === 'info' ? 'var(--primary)' : '#fda4af' }}>
                          {importStatus.message}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <p className="text-xs font-medium" style={{ color: '#fcd34d' }}>Contact syncing requires Chrome on Android. Use the manual form below.</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1" style={{ background: 'var(--border-soft)' }} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>or add manually</span>
                <div className="h-px flex-1" style={{ background: 'var(--border-soft)' }} />
              </div>

              <AvatarPicker
                name={contactName || 'Friend'}
                value={contactAvatarSeed}
                onChange={setContactAvatarSeed}
                columns={4}
                size="sm"
                label="Avatar"
                hint="Only you see this — they can pick their own if they join Udharwale."
              />

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Friend&apos;s Name *</label>
                <input type="text" required value={contactName} onChange={e => setContactName(e.target.value)}
                  className="input-field" placeholder="e.g. Aarav Sharma" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Phone Number *</label>
                <input type="tel" required value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                  className="input-field" placeholder="+91 98765 43210" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Email (optional)</label>
                <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                  className="input-field" placeholder="friend@email.com" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Opening Balance (optional)</label>
                <div className="flex gap-2">
                  <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-soft)' }}>
                    {(['credit', 'debit'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setContactInitialType(t)}
                        className="px-3 py-2 text-xs font-bold transition-all"
                        style={{
                          background: contactInitialType === t ? (t === 'credit' ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)') : 'var(--bg-raised)',
                          color: contactInitialType === t ? (t === 'credit' ? '#6ee7b7' : '#fda4af') : 'var(--text-muted)',
                        }}>
                        {t === 'credit' ? 'They owe you' : 'You owe them'}
                      </button>
                    ))}
                  </div>
                  <input type="number" min="0" step="0.01" value={contactInitialBalance}
                    onChange={e => setContactInitialBalance(e.target.value)}
                    className="input-field flex-1" placeholder={`₹ 0.00`} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsAddContactOpen(false)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all"
                  style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border-soft)' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">Add Contact</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          ADD / EDIT TRANSACTION MODAL
      ══════════════════════════════════════════════════════ */}
      {isAddTransactionOpen && (() => {
        const isGot = txType === 'got';
        const accent = isGot ? '#f43f5e' : '#10b981';
        const accentSoft = isGot ? '#fb7185' : '#34d399';
        const sheetBg = 'var(--bg-surface)';

        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }}
              onClick={() => setIsAddTransactionOpen(false)} />
            <div className="relative w-full max-w-md animate-slide-up rounded-t-[20px] overflow-hidden"
              style={{ background: sheetBg, border: '1px solid var(--border-soft)', maxHeight: '92vh', overflowY: 'auto' }}>

              {/* Handle + header */}
              <div className="relative px-5 pt-3 pb-2" style={{ borderTop: `3px solid ${accent}` }}>
                <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: 'var(--border-bright)' }} />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: accentSoft }}>
                      {editingTransaction ? 'Edit entry' : 'New entry'}
                    </p>
                    <h3 className="mt-1 text-xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {editingTransaction ? 'Edit Transaction' : isGot ? 'You got money' : 'You gave money'}
                    </h3>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {isGot ? 'Someone paid you or you borrowed' : 'You lent or paid for someone'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddTransactionOpen(false)}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)', border: '1px solid var(--border-soft)' }}
                    aria-label="Close"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleTransactionSubmit} className="relative px-5 pb-6 pt-2 space-y-5">
                {/* Type toggle */}
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { val: 'got' as const, label: 'Got', hint: 'Received', arrow: '↓', color: '#fb7185', grad: 'linear-gradient(135deg, #fb7185, #e11d48)' },
                    { val: 'gave' as const, label: 'Gave', hint: 'Paid out', arrow: '↑', color: '#34d399', grad: 'linear-gradient(135deg, #34d399, #059669)' },
                  ] as const).map(({ val, label, hint, arrow, color, grad }) => {
                    const active = txType === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTxType(val)}
                        className="flex items-center gap-3 p-3 rounded-2xl text-left transition-all active:scale-[0.98]"
                        style={{
                          background: active
                            ? `color-mix(in srgb, ${color} 16%, var(--bg-raised))`
                            : 'var(--bg-raised)',
                          border: `1px solid ${active ? `${color}55` : 'var(--border-soft)'}`,
                          boxShadow: active ? `0 8px 24px ${color}22` : 'none',
                        }}
                      >
                        <span
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold"
                          style={{
                            background: active ? grad : 'var(--bg-overlay)',
                            color: active ? 'white' : 'var(--text-muted)',
                            opacity: active ? 1 : 0.7,
                          }}
                        >
                          {arrow}
                        </span>
                        <span>
                          <span className="block text-sm font-bold" style={{ color: active ? color : 'var(--text-primary)' }}>{label}</span>
                          <span className="block text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>{hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Amount hero */}
                <div
                  className="rounded-3xl px-4 py-5 text-center"
                  style={{
                    background: isGot ? 'rgba(244,63,94,0.08)' : 'rgba(16,185,129,0.08)',
                    border: `1px solid ${isGot ? 'rgba(244,63,94,0.2)' : 'rgba(16,185,129,0.2)'}`,
                  }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: accentSoft }}>Amount</p>
                  <div className="relative inline-flex items-center justify-center gap-1.5 w-full">
                    <span className="text-3xl font-bold" style={{ color: accentSoft }}>₹</span>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      autoFocus
                      value={txAmount}
                      onChange={e => setTxAmount(e.target.value)}
                      className="w-full max-w-[220px] bg-transparent text-center text-4xl font-bold outline-none tabular-nums"
                      style={{ color: 'var(--text-primary)' }}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>For what?</label>
                  <input type="text" required value={txRemark} onChange={e => setTxRemark(e.target.value)}
                    className="input-field rounded-2xl" placeholder="e.g. Dinner, cab share, rent…" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Category</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {LEDGER_CATEGORIES.map((cat) => {
                      const cfg = LEDGER_CATEGORY_CONFIG[cat];
                      const selected = txCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setTxCategory(cat)}
                          className="rounded-xl px-2 py-2 text-[11px] font-bold transition-all"
                          style={{
                            background: selected
                              ? `color-mix(in srgb, ${cfg.tone} 18%, var(--bg-raised))`
                              : 'var(--bg-raised)',
                            color: selected ? cfg.tone : 'var(--text-muted)',
                            border: `1px solid ${selected ? `${cfg.tone}55` : 'var(--border-soft)'}`,
                          }}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Date</label>
                    <input type="date" required value={txDate} onChange={e => setTxDate(e.target.value)}
                      className="input-field rounded-2xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Mode</label>
                    <div className="grid grid-cols-2 gap-1.5 h-[42px]">
                      {([
                        { mode: 'Cash' as const, label: 'Cash' },
                        { mode: 'Online Transfer' as const, label: 'Online' },
                      ]).map(({ mode, label }) => {
                        const selected = txMode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setTxMode(mode)}
                            title={mode}
                            className="rounded-xl text-xs font-semibold transition-all"
                            style={{
                              background: selected
                                ? `color-mix(in srgb, ${accent} 18%, var(--bg-raised))`
                                : 'var(--bg-raised)',
                              color: selected ? accentSoft : 'var(--text-muted)',
                              border: `1px solid ${selected ? `${accent}44` : 'var(--border-soft)'}`,
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Due date <span style={{ opacity: 0.55 }}>(Optional)</span>
                    </label>
                    {txDueDate && (
                      <button
                        type="button"
                        onClick={() => setTxDueDate('')}
                        className="text-[10px] font-bold"
                        style={{ color: '#fda4af' }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="date"
                    value={txDueDate}
                    onChange={(e) => setTxDueDate(e.target.value)}
                    className="input-field rounded-2xl"
                  />
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Reminds you on Overview before this repayment gets awkward.
                  </p>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setIsAddTransactionOpen(false)}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-sm"
                    style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border-soft)' }}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[1.4] py-3.5 rounded-2xl font-bold text-sm text-white active:scale-[0.98] transition-transform"
                    style={{
                      background: isGot ? 'var(--rose)' : 'var(--emerald)',
                    }}
                  >
                    {editingTransaction ? 'Save changes' : isGot ? 'Record Got' : 'Record Gave'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      <ChatShareSheet
        open={isShareModalOpen && !!selectedContact}
        contactName={selectedContact?.name || ''}
        onClose={() => setIsShareModalOpen(false)}
        onCopyLink={async () => {
          await handleCopyChatLink();
        }}
        onShareLedger={handleShareLedger}
      />


      {/* ── EDIT CONTACT MODAL ───────────────────────── */}
      {isEditContactOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setIsEditContactOpen(false)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-t-3xl overflow-hidden flex flex-col max-h-[90vh]"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>

            <div className="px-5 py-4 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Edit Contact</h3>
              <button onClick={() => setIsEditContactOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto scrollbar-thin">
              <form id="edit-contact-form" onSubmit={handleEditContactSubmit} className="space-y-4">
                {selectedContact?.avatarLocked ? (
                  <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)' }}>
                    <PersonAvatar
                      name={contactName || selectedContact.name}
                      seed={selectedContact.avatarSeed || selectedContact.id}
                      size="md"
                    />
                    <p className="text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>
                      This friend is on Udharwale — their account avatar is shown. You can&apos;t change it for them.
                    </p>
                  </div>
                ) : (
                  <AvatarPicker
                    name={contactName || 'Friend'}
                    value={contactAvatarSeed}
                    onChange={setContactAvatarSeed}
                    columns={4}
                    size="sm"
                    label="Avatar"
                    hint="Local look for this friend — only on your ledger."
                  />
                )}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Name <span className="text-rose-500">*</span></label>
                  <input type="text" required value={contactName} onChange={e => setContactName(e.target.value)}
                    className="input-field w-full" placeholder="e.g. Rahul Sharma" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Phone <span className="text-rose-500">*</span></label>
                  <input type="tel" required value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                    className="input-field w-full" placeholder="e.g. +91 98765 43210" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Email <span style={{ opacity: 0.5 }}>(Optional)</span></label>
                  <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                    className="input-field w-full" placeholder="e.g. rahul@example.com" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Balance due date <span style={{ opacity: 0.5 }}>(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={contactDueDate}
                    onChange={(e) => setContactDueDate(e.target.value)}
                    className="input-field w-full"
                  />
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Surfaces on Overview reminders while this contact still has an open balance.
                  </p>
                  {contactDueDate && (
                    <button
                      type="button"
                      onClick={() => setContactDueDate('')}
                      className="text-[11px] font-bold"
                      style={{ color: '#fda4af' }}
                    >
                      Clear due date
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="p-5 shrink-0" style={{ background: 'var(--bg-raised)', borderTop: '1px solid var(--border-soft)' }}>
              <button type="submit" form="edit-contact-form" className="btn-primary w-full ">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT PROFILE SHEET ───────────────────────── */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => !isSavingProfile && setIsEditProfileOpen(false)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-t-3xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--primary)' }}>Profile</p>
                <h3 className="font-extrabold text-base mt-0.5" style={{ color: 'var(--text-primary)' }}>Edit account</h3>
              </div>
              <button type="button" disabled={isSavingProfile} onClick={() => setIsEditProfileOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }} aria-label="Close">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="p-5 space-y-4">
              <div className="flex justify-center">
                <PersonAvatar
                  name={profileName || userName || 'You'}
                  seed={profileAvatarSeed}
                  size="xl"
                />
              </div>
              <AvatarPicker
                name={profileName || userName || 'You'}
                value={profileAvatarSeed}
                onChange={setProfileAvatarSeed}
                columns={4}
                size="sm"
                label="Your avatar"
                hint="Friends who link with you will see this look."
              />
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Display name</label>
                <input type="text" required value={profileName} onChange={(e) => setProfileName(e.target.value)}
                  className="input-field rounded-2xl" placeholder="Your name" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Phone</label>
                <input type="tel" required value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)}
                  className="input-field rounded-2xl" placeholder="9876543210" />
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Used to find chats others already started with you.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Email</label>
                <input type="email" disabled value={userEmail}
                  className="input-field rounded-2xl opacity-70" />
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Email can’t be changed here.</p>
              </div>
              <button type="submit" disabled={isSavingProfile} className="btn-primary w-full py-3.5 rounded-2xl">
                {isSavingProfile ? 'Saving…' : 'Save profile'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── TRANSACTION HISTORY SHEET ─────────────────── */}
      {historyTx && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => setHistoryTx(null)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-t-3xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', maxHeight: '80vh' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--primary)' }}>Change log</p>
                <h3 className="font-extrabold text-base mt-0.5" style={{ color: 'var(--text-primary)' }}>
                  ₹{historyTx.amount.toLocaleString('en-IN')} · {historyTx.remark}
                </h3>
              </div>
              <button type="button" onClick={() => setHistoryTx(null)} className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }} aria-label="Close history">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3" style={{ maxHeight: '55vh' }}>
              {historyTx.deletedAt && (
                <div className="rounded-2xl p-3 text-xs" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', color: '#fda4af' }}>
                  Soft-deleted {new Date(historyTx.deletedAt).toLocaleString('en-IN')}
                  <button type="button" onClick={() => handleRestoreTransaction(historyTx.id)}
                    className="mt-2 w-full py-2 rounded-xl font-bold text-xs text-white"
                    style={{ background: 'linear-gradient(135deg,#34d399,#059669)' }}>
                    Restore entry
                  </button>
                </div>
              )}
              {(historyTx.history && historyTx.history.length > 0) ? (
                [...historyTx.history].reverse().map((entry, idx) => (
                  <div key={`${entry.at}-${idx}`} className="rounded-2xl p-3" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--primary)' }}>
                        {entry.action}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {new Date(entry.at).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                      By user · {entry.byUserId?.slice(-6) || 'unknown'}
                    </p>
                    {entry.after && typeof entry.after === 'object' && (
                      <p className="text-[11px] mt-1.5 font-medium" style={{ color: 'var(--text-primary)' }}>
                        {(entry.after as any).type ? `${(entry.after as any).type} · ` : ''}
                        {(entry.after as any).amount != null ? `₹${Number((entry.after as any).amount).toLocaleString('en-IN')}` : ''}
                        {(entry.after as any).remark ? ` · ${(entry.after as any).remark}` : ''}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                  No change history on this entry yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
