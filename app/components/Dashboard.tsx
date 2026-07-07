'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Contact, Transaction, ModeType, ActiveTab } from './types';
import UpcomingFeatures from './UpcomingFeatures';

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

export default function Dashboard() {
  // --- Persistent State ---
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');

  // Database connection status: connecting, connected, or error
  const [dbStatus, setDbStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  // --- UI Navigation State ---
  const [activeTab, setActiveTab] = useState<ActiveTab>('ledgers');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'ledger'>('list'); // 'list' or 'ledger' for mobile

  // --- Filtering & Sorting State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'credit' | 'debit' | 'settled'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'balance'>('recent');
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');

  // --- Modals Toggle ---
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isContactMenuOpen, setIsContactMenuOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showBalances, setShowBalances] = useState(false);
  const [peekingContactId, setPeekingContactId] = useState<string | null>(null);

  // --- Add Transaction Form State ---
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<'gave' | 'got'>('gave');
  const [txRemark, setTxRemark] = useState('');
  const [txMode, setTxMode] = useState<ModeType>('Cash');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);

  // --- Add Contact Form State ---
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactInitialBalance, setContactInitialBalance] = useState('');
  const [contactInitialType, setContactInitialType] = useState<'credit' | 'debit'>('credit');
  const [isImportingContacts, setIsImportingContacts] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [contactsSupported, setContactsSupported] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // --- Confetti Particle System ---
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);
  const confettiInterval = useRef<NodeJS.Timeout | null>(null);

  // --- Fetch Contacts Function (Component Scope for Retry) ---
  const loadContacts = async () => {
    setDbStatus('connecting');
    try {
      const res = await fetch('/api/contacts');
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
        setDbStatus('connected');
      } else {
        setDbStatus('error');
      }
    } catch (err) {
      console.error('Failed to load contacts from database:', err);
      setDbStatus('error');
    }
  };

  // --- Load Initial Data ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobileDevice(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
      setContactsSupported('contacts' in navigator && typeof (navigator as any).contacts?.select === 'function');
      // Check session profile on mount
      fetch('/api/auth/me')
        .then((res) => {
          if (res.status === 401) {
            window.location.href = '/login';
            return null;
          }
          if (!res.ok) throw new Error('API session load failed');
          return res.json();
        })
        .then((data) => {
          if (data && data.authenticated) {
            setUserName(data.user.name);
            setUserEmail(data.user.email);
            loadContacts();
          }
        })
        .catch((err) => {
          console.error('Session authentication check failed:', err);
          window.location.href = '/login';
        });

    }
  }, []);


  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/login';
      } else {
        alert('Failed to log out.');
      }
    } catch (e) {
      console.error(e);
      alert('An error occurred during log out.');
    }
  };

  // --- Save Contacts & Configurations ---
  // Note: Contacts are now written directly to Mongoose backend via API endpoints.
  // This helper updates local React state for instantaneous UI responsiveness.
  const saveContactsState = (newContacts: Contact[]) => {
    setContacts(newContacts);
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

  // --- Wipe All Data ---
  const handleWipeData = async () => {
    try {
      const res = await fetch('/api/db/wipe', { method: 'POST' });
      if (res.ok) {
        saveContactsState([]);
        setSelectedContactId(null);
        setDbStatus('connected');
      } else {
        alert('Failed to wipe database on backend.');
      }
    } catch (err) {
      console.error('Error modifying database state:', err);
      alert('An error occurred while connecting to the database server.');
    }
  };

  // --- Selected Contact Ledger Logic ---
  const selectedContact = useMemo(() => {
    return contacts.find((c) => c.id === selectedContactId) || null;
  }, [contacts, selectedContactId]);

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

  // --- Filtered transactions within selected contact ---
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
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first
  }, [selectedContact, ledgerSearchQuery]);

  // --- Mode-wise Transaction Distribution top-level hook ---
  const categoryDistribution = useMemo(() => {
    const distribution: Record<ModeType, number> = {
      'Cash': 0, 'Online Transfer': 0
    };
    let grandTotal = 0;

    contacts.forEach(c => {
      c.transactions.forEach(t => {
        distribution[t.mode] += t.amount;
        grandTotal += t.amount;
      });
    });

    return { distribution, grandTotal };
  }, [contacts]);

  // --- Handlers: Add/Edit Friend ---
  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) return;

    const newContactId = 'c_' + Date.now();
    const newTransactions: Transaction[] = [];

    // If initial balance is set
    const initBal = parseFloat(contactInitialBalance);
    if (!isNaN(initBal) && initBal > 0) {
      newTransactions.push({
        id: 't_' + Date.now(),
        amount: initBal,
        type: contactInitialType === 'credit' ? 'gave' : 'got',
        remark: 'Starting Balance',
        date: new Date().toISOString().split('T')[0],
        mode: 'Cash',
      });
    }

    const newContact: Contact = {
      id: newContactId,
      name: contactName.trim(),
      phone: contactPhone.trim(),
      email: contactEmail.trim() || undefined,
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
        saveContactsState([newContact, ...contacts]);
        setSelectedContactId(newContactId);
        setMobileView('ledger');

        // Reset Form
        setContactName('');
        setContactPhone('');
        setContactEmail('');
        setContactInitialBalance('');
        setContactInitialType('credit');
        setIsAddContactOpen(false);
      } else {
        const errorData = await res.json();
        alert(`Failed to add contact: ${errorData.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Error adding contact to backend:', err);
      alert('An error occurred while communicating with the database.');
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
        }),
      });

      if (res.ok) {
        const updatedContact = await res.json();
        const updatedContacts = contacts.map(c =>
          c.id === selectedContactId ? { ...c, name: updatedContact.name, phone: updatedContact.phone, email: updatedContact.email } : c
        );
        saveContactsState(updatedContacts);
        setIsEditContactOpen(false);
        showToast('Contact updated successfully', 'success');
      } else {
        const errorData = await res.json();
        alert(`Failed to update contact: ${errorData.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Error updating contact:', err);
      alert('An error occurred while communicating with the database.');
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
          setSelectedContactId(newContacts[0].id);
          setIsAddContactOpen(false);
          setMobileView('ledger');
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
    if (confirm('Are you sure you want to delete this contact and all their ledger history?')) {
      try {
        const res = await fetch(`/api/contacts/${contactId}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          const remaining = contacts.filter((c) => c.id !== contactId);
          saveContactsState(remaining);
          setSelectedContactId(null);
          setMobileView('list');
        } else {
          const errorData = await res.json();
          alert(`Failed to delete contact: ${errorData.error || 'Server error'}`);
        }
      } catch (err) {
        console.error('Error deleting contact from backend:', err);
        alert('An error occurred while deleting the contact.');
      }
    }
  };

  // --- Handlers: Transactions ---
  const handleOpenAddTx = (type: 'gave' | 'got') => {
    setTxType(type);
    setTxAmount('');
    setTxRemark('');
    setTxMode('Cash');
    setTxDate(new Date().toISOString().split('T')[0]);
    setEditingTransaction(null);
    setIsAddTransactionOpen(true);
  };

  const handleOpenEditTx = (tx: Transaction) => {
    setEditingTransaction(tx);
    setTxAmount(tx.amount.toString());
    setTxType(tx.type);
    setTxRemark(tx.remark);
    setTxMode(tx.mode);
    setTxDate(tx.date);
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
            date: txDate,
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
          alert('Failed to update transaction on backend.');
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
            date: txDate,
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
          alert('Failed to record transaction on backend.');
        }
      }
    } catch (err) {
      console.error('Error submitting transaction:', err);
      alert('An error occurred while saving transaction data.');
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (confirm('Delete this transaction? This will permanently modify the balance.')) {
      try {
        const res = await fetch(`/api/contacts/${selectedContactId}/transactions/${txId}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          const updatedContacts = contacts.map((c) => {
            if (c.id !== selectedContactId) return c;
            return {
              ...c,
              transactions: c.transactions.filter((t) => t.id !== txId),
            };
          });
          saveContactsState(updatedContacts);
          setIsAddTransactionOpen(false);
          setEditingTransaction(null);
        } else {
          alert('Failed to delete transaction on backend.');
        }
      } catch (err) {
        console.error('Error deleting transaction:', err);
        alert('An error occurred while deleting the transaction.');
      }
    }
  };

  const handleSettleFullBalance = async () => {
    if (!selectedContact) return;
    const balance = getContactBalance(selectedContact);
    if (balance === 0) return;

    const settleAmount = Math.abs(balance);
    const settleType = balance > 0 ? 'got' : 'gave';

    setTxAmount(settleAmount.toString());
    setTxType(settleType);
    setTxRemark('🤝 Settlement');
    setTxMode('Cash');
    setTxDate(new Date().toISOString().split('T')[0]);
    setEditingTransaction(null);
    setIsAddTransactionOpen(true);
  };

  // --- Share Ledger Template on WhatsApp ---
  const handleWhatsAppReminder = () => {
    if (!selectedContact) return;
    const balance = getContactBalance(selectedContact);
    if (balance === 0) return;

    const cleanName = selectedContact.name;
    const formattedAmt = `$₹${Math.abs(balance).toLocaleString('en-IN')}`;
    let msg = '';

    if (balance > 0) {
      msg = `Hello ${cleanName},\n\nThis is a gentle reminder regarding an outstanding balance of ${formattedAmt}. Please let me know when you might be able to settle this.\n\nThank you for your prompt attention.\n\n—\nTracked transparently via Udharwale by Naeem Navjivan 🚀\nYour smart digital ledger for seamless balance tracking.`;
    } else {
      msg = `Hello ${cleanName},\n\nI am writing to confirm that I currently owe you ${formattedAmt}. I will ensure this balance is settled with you as soon as possible.\n\nThank you for your patience.\n\n—\nTracked transparently via Udharwale by Naeem Navjivan 🚀\nYour smart digital ledger for seamless balance tracking.`;
    }

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${selectedContact.phone.replace(/[^0-9+]/g, '')}&text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShareLedger = async (option: 'all' | 'gave' | 'got') => {
    if (!selectedContact) return;

    let text = `📊 Ledger Summary with ${selectedContact.name}\n\n`;
    text += `Current Position: ${getContactBalance(selectedContact) > 0 ? `To Receive: $₹${getContactBalance(selectedContact).toLocaleString('en-IN')}` : getContactBalance(selectedContact) < 0 ? `To Pay: $₹${Math.abs(getContactBalance(selectedContact)).toLocaleString('en-IN')}` : 'Settled 🎉'}\n\n`;
    text += `--- Transaction History ---\n`;

    const txsToShare = selectedContact.transactions.filter(t => {
      if (option === 'all') return true;
      if (option === 'gave') return t.type === 'gave';
      if (option === 'got') return t.type === 'got';
      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // chronological

    let runningTotal = 0;
    txsToShare.forEach(t => {
      const isGave = t.type === 'gave';
      const formattedDate = new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const amountStr = `$₹${t.amount.toLocaleString('en-IN')}`;
      runningTotal += isGave ? t.amount : -t.amount;
      text += `• ${formattedDate}: ${t.remark} (${isGave ? 'Lent' : 'Borrowed'} ${amountStr})\n`;
    });

    if (option === 'all') {
      text += `\nNet Balance: ${runningTotal > 0 ? `+$₹${runningTotal.toLocaleString('en-IN')}` : `-$₹${Math.abs(runningTotal).toLocaleString('en-IN')}`}\n\n`;
    } else {
      text += `\n`;
    }
    
    text += `—\nPowered by Udharwale by Naeem Navjivan 🚀\nStart tracking your own balances smartly and securely today!`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Ledger with ${selectedContact.name}`,
          text: text,
        });
      } else {
        await navigator.clipboard.writeText(text);
        alert('Ledger copied to clipboard!');
      }
    } catch (err) {
      console.error('Share failed', err);
    }
    setIsShareModalOpen(false);
  };

  // --- Seed Avatar Visual Gradient Creator ---
  const getAvatarGradient = (name: string) => {
    const gradients = [
      'from-emerald-400 to-teal-600',
      'from-indigo-400 to-indigo-600',
      'from-rose-400 to-rose-600',
      'from-amber-400 to-orange-500',
      'from-fuchsia-400 to-purple-600',
      'from-sky-400 to-blue-600',
      'from-pink-400 to-rose-500',
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    return gradients[sum % gradients.length];
  };

  const getInitials = (name: string) => {
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
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

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden relative" style={{ background: 'var(--bg-base)', fontFamily: "'Outfit', system-ui, sans-serif", color: 'var(--text-primary)' }}>

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

      {/* CSS Confetti Canvas */}
      {/* ── Confetti ─────────────────────────────── */}
      {particles.map((p) => (
        <div key={p.id} className="fixed pointer-events-none z-[60] rounded-sm"
          style={{ left: p.x, top: p.y, width: p.size, height: p.size, backgroundColor: p.color, transform: `rotate(${p.rotation}deg)`, opacity: 0.95 }} />
      ))}

      {/* ══════════════════════════════════════════════════════════
          MAIN SHELL
      ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Desktop Sidebar ──────────────────────────────────── */}
        <aside className="hidden md:flex flex-col shrink-0 overflow-hidden"
          style={{ width: '260px', background: 'var(--bg-surface)', borderRight: '1px solid var(--border-soft)' }}>

          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-5 shrink-0" style={{ borderBottom: '1px solid var(--border-soft)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
              🧾
            </div>
            <div>
              <div className="flex flex-col">
                <span className="font-branding text-2xl tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>Udharwale</span>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">By Naeem Navjivan</span>
              </div>
              <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Smart Debt Ledger</p>
            </div>
            {/* Sync dot */}
            <div className="ml-auto">
              <div className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'animate-pulse' : ''}`}
                style={{ background: dbStatus === 'connected' ? '#10b981' : dbStatus === 'connecting' ? '#f59e0b' : '#f43f5e' }}
                title={dbStatus === 'connected' ? 'Synced' : dbStatus === 'connecting' ? 'Syncing…' : 'Offline'} />
            </div>
          </div>

          {/* User card */}
          <div className="mx-3 mt-4 mb-1 flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)' }}>
            <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-black text-sm text-white"
              style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}>
              {getInitials(userName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{userName}</p>
              <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{userEmail}</p>
            </div>
            <button onClick={handleLogout} title="Sign out"
              className="p-1.5 rounded-lg transition-colors shrink-0"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f43f5e'; (e.currentTarget as HTMLElement).style.background = 'rgba(244,63,94,0.08)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = ''; }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>

          {/* Nav */}
          <nav className="px-3 py-3 space-y-1 flex-1">
            {([
              {
                tab: 'ledgers' as const, label: 'Friends & Khata', badge: contacts.length, icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                )
              },
              {
                tab: 'insights' as const, label: 'Insights & Flow', badge: null, icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                )
              },
              {
                tab: 'settings' as const, label: 'Ledger Settings', badge: null, icon: (
                  <>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </>
                )
              },
            ] as const).map(({ tab, label, badge, icon }) => (
              <button key={tab} onClick={() => { setActiveTab(tab); setMobileView('list'); }}
                className={`nav-item${activeTab === tab ? ' active' : ''}`}>
                <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
                <span className="flex-1 text-left">{label}</span>
                {badge !== null && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Sidebar footer */}
          <div className="px-4 py-4 shrink-0" style={{ borderTop: '1px solid var(--border-soft)' }}>
            <div className="flex items-center gap-2 text-[11px] font-semibold"
              style={{ color: dbStatus === 'connected' ? '#10b981' : dbStatus === 'connecting' ? '#f59e0b' : '#f43f5e' }}>
              <span className={`w-1.5 h-1.5 rounded-full ${dbStatus === 'connecting' ? 'animate-pulse' : ''}`}
                style={{ background: 'currentColor' }} />
              {dbStatus === 'connected' ? 'All data saved' : dbStatus === 'connecting' ? 'Syncing…' : 'Connection lost'}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              <span>Crafted by</span>
              <a href="https://github.com/Naeem-gg" target="_blank" rel="noreferrer" className="flex items-center gap-1 font-bold hover:text-indigo-400 transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                Naeem Navjivan
              </a>
            </div>
          </div>
        </aside>

        {/* ── Mobile Top Header ────────────────────────────────── */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="md:hidden flex items-center justify-between px-4 py-3 shrink-0"
            style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-soft)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-sm"
                style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>🧾</div>
              <div>
                <div className="flex flex-col">
                  <span className="font-branding text-2xl tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>Udharwale</span>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">By Naeem Navjivan</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${dbStatus === 'connecting' ? 'animate-pulse' : ''}`}
                    style={{ background: dbStatus === 'connected' ? '#10b981' : dbStatus === 'connecting' ? '#f59e0b' : '#f43f5e' }} />
                  <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                    {dbStatus === 'connected' ? 'Saved' : dbStatus === 'connecting' ? 'Syncing…' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)' }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center font-black text-white text-[9px]"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}>
                  {getInitials(userName)}
                </div>
                <span className="text-xs font-semibold max-w-[70px] truncate" style={{ color: 'var(--text-primary)' }}>{userName}</span>
              </div>
              <button onClick={handleLogout} className="p-2 rounded-xl transition-colors"
                style={{ color: 'var(--text-muted)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </header>

          {/* ══════════════════════════════════════════════════════
            MAIN CONTENT
        ══════════════════════════════════════════════════════ */}
          <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">

            {/* Loading skeleton */}
            {dbStatus === 'connecting' && (
              <div className="flex-1 flex flex-col p-6 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}>
                    <div className="skeleton w-11 h-11 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-3 rounded-full w-2/5" />
                      <div className="skeleton h-2.5 rounded-full w-1/3" />
                    </div>
                    <div className="skeleton h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            )}

            {/* Error state */}
            {dbStatus === 'error' && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
                  style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)' }}>🔌</div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Couldn't load your data</h3>
                  <p className="text-sm max-w-xs" style={{ color: 'var(--text-secondary)' }}>Check your internet connection and try again.</p>
                </div>
                <button onClick={loadContacts} className="btn-primary px-8">Retry</button>
              </div>
            )}

            {/* ── LEDGERS TAB ──────────────────────────────── */}
            {dbStatus === 'connected' && activeTab === 'ledgers' && (
              <div className="flex-1 flex overflow-hidden">

                {/* Left panel: contact list */}
                <div className={`flex flex-col shrink-0 overflow-hidden w-full md:w-[320px] md:max-w-[320px] ${mobileView === 'ledger' ? 'hidden md:flex' : 'flex'}`}
                  style={{ borderRight: '1px solid var(--border-soft)' }}>
                  <div className="flex flex-col overflow-hidden flex-1"
                    style={{ width: '100%' }}>

                    {/* Search + filter bar */}
                    <div className="p-4 space-y-3 shrink-0" style={{ borderBottom: '1px solid var(--border-soft)' }}>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <input type="text" placeholder="Search contacts…" value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl font-medium outline-none transition-all"
                            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)' }} />
                        </div>
                        <button onClick={() => { setIsAddContactOpen(true); setImportStatus(null); }}
                          className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-lg transition-all"
                          style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 2px 12px rgba(99,102,241,0.3)' }}
                          title="Add contact">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>

                        {/* Global balance toggle */}
                        <button onClick={() => setShowBalances(!showBalances)}
                          className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                          style={{ background: showBalances ? 'rgba(99,102,241,0.15)' : 'var(--bg-raised)', border: `1px solid ${showBalances ? 'rgba(99,102,241,0.3)' : 'var(--border-soft)'}`, color: showBalances ? '#818cf8' : 'var(--text-muted)' }}
                          title={showBalances ? 'Hide all balances' : 'Show all balances'}>
                          {showBalances
                            ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.71-1.581c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 3.029m-5.858-.908a3 3 0 00-4.243-4.243M9.878 9.878l-3.29-3.29" /></svg>
                          }
                        </button>
                      </div>

                      {/* Filter chips */}
                      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                        {(['all', 'credit', 'debit', 'settled'] as const).map(f => (
                          <button key={f} onClick={() => setStatusFilter(f)}
                            className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all"
                            style={{
                              background: statusFilter === f
                                ? f === 'credit' ? 'rgba(16,185,129,0.15)' : f === 'debit' ? 'rgba(244,63,94,0.15)' : f === 'settled' ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.15)'
                                : 'var(--bg-raised)',
                              color: statusFilter === f
                                ? f === 'credit' ? '#6ee7b7' : f === 'debit' ? '#fda4af' : f === 'settled' ? '#a5b4fc' : '#a5b4fc'
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
                          <button onClick={() => setIsAddContactOpen(true)} className="btn-primary text-sm px-6 animate-fade-slide-up" style={{ animationDelay: '0.2s' }}>
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
                              const avatarGradient = getAvatarGradient(contact.name);
                              const balanceColor = balance > 0 ? '#10b981' : balance < 0 ? '#f43f5e' : 'var(--text-muted)';
                              const borderColor = balance > 0 ? '#10b981' : balance < 0 ? '#f43f5e' : 'transparent';

                              return (
                                <div key={contact.id}
                                  className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all duration-150`}
                                  style={{
                                    background: isSelected ? 'rgba(99,102,241,0.08)' : 'transparent',
                                    borderLeft: `3px solid ${isSelected ? '#6366f1' : borderColor}`,
                                  }}
                                  onClick={() => { setSelectedContactId(contact.id); setMobileView('ledger'); }}>

                                  {/* Avatar */}
                                  <div className={`w-11 h-11 rounded-full shrink-0 bg-gradient-to-tr ${avatarGradient} flex items-center justify-center font-black text-sm text-white`}
                                    style={{ boxShadow: isSelected ? `0 0 0 2px #6366f1` : 'none' }}>
                                    {getInitials(contact.name)}
                                  </div>

                                  {/* Info */}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{contact.name}</p>
                                    <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{contact.phone || 'No phone'}</p>
                                  </div>

                                  {/* Balance + peek */}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <div className="text-right">
                                      {balance !== 0 && (
                                        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                          {balance > 0 ? "you'll get" : 'you owe'}
                                        </p>
                                      )}
                                      <p className="text-sm font-black" style={{ color: balanceColor }}>
                                        {balance === 0 ? (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}>Settled</span>
                                        ) : revealed ? (
                                          `${balance > 0 ? '+' : '-'}$₹${Math.abs(balance).toLocaleString('en-IN')}`
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
                                        style={{ color: isPeekingThis ? '#818cf8' : 'var(--text-muted)' }}>
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
                </div>

                {/* Right panel: ledger detail */}
                <div className={`flex-1 flex flex-col overflow-hidden ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}
                  style={{ background: 'var(--bg-base)' }}>
                  {selectedContact ? (() => {
                    const contactBal = getContactBalance(selectedContact);
                    const filteredTxs = selectedContact.transactions
                      .filter(t => !ledgerSearchQuery || t.remark.toLowerCase().includes(ledgerSearchQuery.toLowerCase()))
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    return (
                      <div className="flex-1 flex flex-col overflow-hidden animate-scale-in">
                        {/* Contact header */}
                        <div className="px-5 py-4 shrink-0" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-soft)' }}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3.5 min-w-0">
                              {/* Mobile back */}
                              <button onClick={() => setMobileView('list')} className="md:hidden p-1.5 rounded-xl shrink-0" style={{ color: 'var(--text-muted)' }}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                              <div className={`w-12 h-12 rounded-2xl shrink-0 bg-gradient-to-tr ${getAvatarGradient(selectedContact.name)} flex items-center justify-center font-black text-base text-white shadow-lg`}>
                                {getInitials(selectedContact.name)}
                              </div>
                              <div className="min-w-0">
                                <h2 className="font-extrabold text-base truncate" style={{ color: 'var(--text-primary)' }}>{selectedContact.name}</h2>
                                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{selectedContact.phone}{selectedContact.email && ` · ${selectedContact.email}`}</p>
                              </div>
                            </div>

                            {/* Quick actions */}
                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                              {/* More menu */}
                              <div className="relative">
                                <button onClick={() => setIsContactMenuOpen(!isContactMenuOpen)}
                                  className="p-2 rounded-xl transition-all"
                                  style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)', border: '1px solid var(--border-soft)' }}>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                  </svg>
                                </button>
                                {isContactMenuOpen && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsContactMenuOpen(false)} />
                                    <div className="absolute right-0 mt-2 w-44 rounded-xl py-1.5 z-20 animate-fade-slide-down"
                                      style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-card)' }}>
                                      
                                      {contactBal !== 0 && (
                                        <button onClick={() => { setIsContactMenuOpen(false); handleSettleFullBalance(); }}
                                          className="w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors"
                                          style={{ color: '#10b981' }}
                                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.08)'}
                                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                          🤝 Settle Balance
                                        </button>
                                      )}
                                      
                                      {contactBal !== 0 && (
                                        <button onClick={() => { setIsContactMenuOpen(false); handleWhatsAppReminder(); }}
                                          className="w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors"
                                          style={{ color: '#6366f1' }}
                                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.08)'}
                                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                          💬 Send Reminder
                                        </button>
                                      )}

                                      <button onClick={() => { setIsContactMenuOpen(false); setIsShareModalOpen(true); }}
                                        className="w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors"
                                        style={{ color: '#8b5cf6' }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.08)'}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                        Share Ledger
                                      </button>
                                      

                                      <button onClick={() => {
                                        setIsContactMenuOpen(false);
                                        setContactName(selectedContact.name);
                                        setContactPhone(selectedContact.phone);
                                        setContactEmail(selectedContact.email || '');
                                        setIsEditContactOpen(true);
                                      }}
                                        className="w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors"
                                        style={{ color: 'var(--text-primary)' }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)'}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        Edit Contact
                                      </button>
                                      <button onClick={() => { setIsContactMenuOpen(false); handleDeleteContact(selectedContact.id); }}
                                        className="w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors"
                                        style={{ color: '#f43f5e' }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(244,63,94,0.08)'}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        Delete Account
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Balance banner */}
                          <div className="flex items-center justify-between mt-4 px-4 py-3 rounded-2xl"
                            style={{
                              background: contactBal > 0 ? 'rgba(16,185,129,0.07)' : contactBal < 0 ? 'rgba(244,63,94,0.07)' : 'var(--bg-raised)',
                              border: `1px solid ${contactBal > 0 ? 'rgba(16,185,129,0.15)' : contactBal < 0 ? 'rgba(244,63,94,0.15)' : 'var(--border-soft)'}`,
                            }}>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Current Balance</p>
                              {contactBal === 0 ? (
                                <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-secondary)' }}>All settled up 🤝</p>
                              ) : (
                                <p className="text-sm font-bold mt-0.5" style={{ color: contactBal > 0 ? '#6ee7b7' : '#fda4af' }}>
                                  {contactBal > 0
                                    ? `${selectedContact.name} owes you ₹${contactBal.toLocaleString('en-IN')}`
                                    : `You owe ${selectedContact.name} $₹${Math.abs(contactBal).toLocaleString('en-IN')}`}
                                </p>
                              )}
                            </div>

                            {/* Search inside ledger */}
                            <div className="relative w-36">
                              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                              </div>
                              <input type="text" placeholder="Search…" value={ledgerSearchQuery}
                                onChange={e => setLedgerSearchQuery(e.target.value)}
                                className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg outline-none transition-all"
                                style={{ background: 'var(--bg-base)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)' }} />
                            </div>
                          </div>
                        </div>

                        {/* Transaction timeline */}
                        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 md:px-5 md:py-4 space-y-2 md:space-y-3">
                          {filteredTxs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}>📭</div>
                              <div>
                                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>No transactions yet</p>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Use the buttons below to record the first one</p>
                              </div>
                            </div>
                          ) : filteredTxs.map((tx, idx) => {
                            const isGave = tx.type === 'gave';
                            const catIcons: Record<string, string> = {
                              'Cash': '💵',
                              'Online Transfer': '🏦'
                            };
                            const formattedDate = new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

                            return (
                              <div key={tx.id} className="group flex items-center gap-2.5 md:gap-3.5 p-2.5 md:p-4 rounded-2xl transition-all duration-150 animate-fade-slide-up"
                                style={{
                                  animationDelay: `${Math.min(idx * 0.04, 0.3)}s`,
                                  background: 'var(--bg-surface)',
                                  border: `1px solid var(--border-soft)`,
                                  borderLeft: `3px solid ${isGave ? '#10b981' : '#f43f5e'}`,
                                }}>
                                {/* Icon */}
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl shrink-0 flex items-center justify-center text-sm md:text-lg"
                                  style={{ background: isGave ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)' }}>
                                  {catIcons[tx.mode] || '📦'}
                                </div>
                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[9px] md:text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.25 md:px-2 md:py-0.5 rounded-full"
                                      style={{ background: isGave ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)', color: isGave ? '#6ee7b7' : '#fda4af' }}>
                                      {isGave ? '↗ Gave (Lent)' : '↙ Got (Borrowed)'}
                                    </span>
                                    <span className="text-[9px] md:text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{formattedDate}</span>
                                  </div>
                                  <p className="font-bold text-xs md:text-sm mt-0.5 md:mt-1.5" style={{ color: 'var(--text-primary)' }}>{tx.remark}</p>
                                  <p className="text-[9px] md:text-[10px] mt-0.5 font-medium" style={{ color: 'var(--text-muted)' }}>{tx.mode}</p>
                                </div>
                                {/* Amount + actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-sm md:text-base font-black tabular-nums" style={{ color: isGave ? '#10b981' : '#f43f5e' }}>
                                    {isGave ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                                  </span>
                                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150">
                                    <button onClick={() => handleOpenEditTx(tx)}
                                      className="p-1 md:p-1.5 rounded-lg transition-colors"
                                      style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </button>
                                    <button onClick={() => handleDeleteTransaction(tx.id)}
                                      className="p-1 md:p-1.5 rounded-lg transition-colors"
                                      style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>

                              </div>
                            );
                          })}
                        </div>

                        {/* Bottom CTA */}
                        <div className="shrink-0 px-5 py-4"
                          style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-soft)' }}>
                          <button onClick={() => handleOpenAddTx('gave')}
                            className="w-full py-4 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm text-white"
                            style={{ background: 'var(--primary-color)' }}>
                            <span className="text-lg">➕</span>
                            <span>ADD RECORD</span>
                          </button>
                        </div>

                      </div>
                    );
                  })() : (
                    // No contact selected
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-5">
                      <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl animate-fade-slide-up"
                        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.2)' }}>
                        {contacts.length === 0 ? '📖' : '📇'}
                      </div>
                      <div className="space-y-2 animate-fade-slide-up" style={{ animationDelay: '0.1s' }}>
                        <h3 className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>
                          {contacts.length === 0 ? 'Welcome to Udharwale by Naeem Navjivan!' : 'Pick a contact'}
                        </h3>
                        <p className="text-sm max-w-xs" style={{ color: 'var(--text-secondary)' }}>
                          {contacts.length === 0
                            ? 'Start by adding a friend to track shared balances and transactions.'
                            : 'Select someone from the list to see their full transaction history.'}
                        </p>
                      </div>
                      {contacts.length === 0 && (
                        <button onClick={() => setIsAddContactOpen(true)} className="btn-primary animate-fade-slide-up" style={{ animationDelay: '0.2s' }}>
                          ➕ Add First Contact
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── INSIGHTS TAB ──────────────────────────────── */}
            {dbStatus === 'connected' && activeTab === 'insights' && (
              <div className="flex-1 overflow-y-auto scrollbar-thin p-5 md:p-8 space-y-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Insights & Flow</h2>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>A complete picture of your balances</p>
                </div>

                {/* Main wallet card */}
                <div className="relative p-6 rounded-3xl overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(79,70,229,0.06) 100%)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', transform: 'translate(20%,-20%)' }} />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(165,180,252,0.7)' }}>NET WALLET BALANCE</p>
                        <div className="flex items-baseline gap-2 mt-2">
                          <h2 className="text-4xl font-black tabular-nums"
                            style={{ color: showBalances ? (stats.netBalance >= 0 ? '#6ee7b7' : '#fda4af') : 'var(--text-primary)' }}>
                            {showBalances
                              ? `${stats.netBalance >= 0 ? '+' : '-'}$₹${Math.abs(stats.netBalance).toLocaleString('en-IN')}`
                              : '****'}
                          </h2>
                        </div>
                        <p className="text-xs mt-1" style={{ color: 'rgba(165,180,252,0.6)' }}>
                          {stats.netBalance > 0 ? 'You are owed more than you owe' : stats.netBalance < 0 ? 'You owe more than you are owed' : 'Everything balanced'}
                        </p>
                      </div>
                      <button onClick={() => setShowBalances(!showBalances)}
                        className="p-2 rounded-xl transition-all"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#a5b4fc' }}>
                        {showBalances
                          ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.71-1.581c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 3.029m-5.858-.908a3 3 0 00-4.243-4.243M9.878 9.878l-3.29-3.29" /></svg>
                        }
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                      {[
                        { label: 'You\'ll Receive', value: stats.totalCredit, color: '#10b981', glow: 'rgba(16,185,129,0.1)' },
                        { label: 'You Owe', value: stats.totalDebit, color: '#f43f5e', glow: 'rgba(244,63,94,0.1)' },
                      ].map(({ label, value, color, glow }) => (
                        <div key={label} className="p-3 rounded-2xl" style={{ background: glow, border: `1px solid ${color}20` }}>
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: `${color}99` }}>{label}</p>
                          <p className="text-xl font-black tabular-nums mt-1" style={{ color }}>
                            {showBalances ? `$₹${value.toLocaleString('en-IN')}` : '****'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Contact breakdown */}
                {contacts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Contact Breakdown</h3>
                    <div className="space-y-2">
                      {contacts
                        .map(c => ({ c, bal: getContactBalance(c) }))
                        .filter(({ bal }) => bal !== 0)
                        .sort((a, b) => Math.abs(b.bal) - Math.abs(a.bal))
                        .map(({ c, bal }) => (
                          <button key={c.id} onClick={() => { setSelectedContactId(c.id); setActiveTab('ledgers'); setMobileView('ledger'); }}
                            className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all hover:translate-x-1"
                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}>
                            <div className={`w-9 h-9 rounded-xl shrink-0 bg-gradient-to-tr ${getAvatarGradient(c.name)} flex items-center justify-center font-black text-xs text-white`}>
                              {getInitials(c.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {c.transactions.length} transaction{c.transactions.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <p className="font-black text-sm tabular-nums shrink-0" style={{ color: bal > 0 ? '#10b981' : '#f43f5e' }}>
                              {bal > 0 ? '+' : '-'}₹{Math.abs(bal).toLocaleString('en-IN')}
                            </p>
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-muted)' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {contacts.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="text-5xl">📊</div>
                    <p className="font-bold" style={{ color: 'var(--text-secondary)' }}>No data yet — add your first contact to see insights</p>
                  </div>
                )}
              </div>
            )}

            {/* ── SETTINGS TAB ──────────────────────────────── */}
            {dbStatus === 'connected' && activeTab === 'settings' && (
              <div className="flex-1 overflow-y-auto scrollbar-thin p-5 md:p-8 space-y-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Settings</h2>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage your ledger preferences</p>
                </div>

                {/* Account */}
                <div className="card p-5 space-y-4" style={{ background: 'var(--bg-surface)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(99,102,241,0.1)' }}>👤</div>
                    <div>
                      <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Account</h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{userEmail}</p>
                    </div>
                  </div>
                  <button onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all"
                    style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', color: '#f43f5e' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>

                {/* Danger zone */}
                <div className="card p-5 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(244,63,94,0.15)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(244,63,94,0.1)' }}>⚠️</div>
                    <div>
                      <h3 className="font-bold text-sm" style={{ color: '#f43f5e' }}>Danger Zone</h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Irreversible actions — proceed carefully</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('This will permanently delete ALL your contacts and transactions. This cannot be undone. Continue?')) {
                        handleWipeData();
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all"
                    style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', color: '#f43f5e' }}>
                    🗑️ Wipe All Data
                  </button>
                </div>

                <UpcomingFeatures />
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MOBILE BOTTOM NAV
      ══════════════════════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
        style={{ background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border-soft)' }}>
        {([
          {
            tab: 'ledgers' as const, label: 'Friends', icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'ledgers' ? 2.5 : 2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            )
          },
          {
            tab: 'insights' as const, label: 'Overview', icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'insights' ? 2.5 : 2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            )
          },
          {
            tab: 'settings' as const, label: 'Settings', icon: (
              <>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'settings' ? 2.5 : 2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'settings' ? 2.5 : 2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </>
            )
          },
        ] as const).map(({ tab, label, icon }) => (
          <button key={tab} onClick={() => { setActiveTab(tab); setMobileView('list'); }}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all"
            style={{ color: activeTab === tab ? '#818cf8' : 'var(--text-muted)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
            <span className="text-[10px] font-bold">{label}</span>
          </button>
        ))}
      </nav>

      {/* ══════════════════════════════════════════════════════
          ADD CONTACT MODAL
      ══════════════════════════════════════════════════════ */}
      {isAddContactOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => setIsAddContactOpen(false)} />
          <div className="relative w-full md:max-w-md animate-slide-up md:animate-scale-in rounded-t-3xl md:rounded-2xl overflow-hidden"
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
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(99,102,241,0.1)' }}>📱</div>
                  <div>
                    <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Import from Phone</h4>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sync your contacts instantly</p>
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
                        className="btn-primary flex-1 text-xs px-2 py-2.5" style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)' }}>
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
                          background: importStatus.type === 'success' ? 'rgba(16,185,129,0.08)' : importStatus.type === 'info' ? 'rgba(99,102,241,0.08)' : 'rgba(244,63,94,0.08)',
                          border: `1px solid ${importStatus.type === 'success' ? 'rgba(16,185,129,0.2)' : importStatus.type === 'info' ? 'rgba(99,102,241,0.2)' : 'rgba(244,63,94,0.2)'}`,
                        }}>
                        <span className="shrink-0 text-sm">{importStatus.type === 'success' ? '✅' : importStatus.type === 'info' ? 'ℹ️' : '⚠️'}</span>
                        <p className="text-xs font-medium leading-relaxed"
                          style={{ color: importStatus.type === 'success' ? '#6ee7b7' : importStatus.type === 'info' ? '#a5b4fc' : '#fda4af' }}>
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
                    className="input-field flex-1" placeholder={`$₹ 0.00`} />
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
      {isAddTransactionOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => setIsAddTransactionOpen(false)} />
          <div className="relative w-full md:max-w-md animate-slide-up md:animate-scale-in rounded-t-3xl md:rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', maxHeight: '90vh', overflowY: 'auto' }}>

            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <h3 className="font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>
                {editingTransaction ? 'Edit Transaction' : 'Record Transaction'}
              </h3>
              <button onClick={() => setIsAddTransactionOpen(false)} className="p-1.5 rounded-xl" style={{ color: 'var(--text-muted)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleTransactionSubmit} className="p-5 space-y-4">
              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl" style={{ background: 'var(--bg-raised)' }}>
                {([
                  { val: 'got' as const, label: '↙️ I GOT (Borrowed)', color: '#f43f5e', bg: 'rgba(244,63,94,0.15)' },
                  { val: 'gave' as const, label: '↗️ I GAVE (Lent)', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
                ] as const).map(({ val, label, color, bg }) => (
                  <button key={val} type="button" onClick={() => setTxType(val)}
                    className="py-3 rounded-xl font-bold text-sm transition-all"
                    style={{ background: txType === val ? bg : 'transparent', color: txType === val ? color : 'var(--text-muted)', border: txType === val ? `1px solid ${color}33` : '1px solid transparent' }}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Amount *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm" style={{ color: 'var(--text-muted)' }}>₹</span>
                  <input type="number" required min="0.01" step="0.01" value={txAmount}
                    onChange={e => setTxAmount(e.target.value)}
                    className="input-field pl-8 text-lg font-black" placeholder="0.00" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Remarks *</label>
                <input type="text" required value={txRemark} onChange={e => setTxRemark(e.target.value)}
                  className="input-field" placeholder="e.g. Dinner at rooftop café" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Date</label>
                <input type="date" required value={txDate} onChange={e => setTxDate(e.target.value)}
                  className="input-field" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Mode</label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)' }}>
                  {(['Cash', 'Online Transfer'] as const).map(mode => {
                    const isSelected = txMode === mode;
                    const icons: Record<string, string> = { Cash: '💵', 'Online Transfer': '🏦' };
                    return (
                      <button key={mode} type="button" onClick={() => setTxMode(mode)}
                        className="py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                        style={{
                          background: isSelected ? 'rgba(124,58,237,0.15)' : 'transparent',
                          color: isSelected ? 'var(--violet-bright)' : 'var(--text-muted)',
                          border: isSelected ? '1px solid rgba(124,58,237,0.25)' : '1px solid transparent'
                        }}>
                        <span>{icons[mode]}</span>
                        <span>{mode}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsAddTransactionOpen(false)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                  style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border-soft)' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingTransaction ? 'Save Changes' : 'Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SHARE LEDGER MODAL
      ══════════════════════════════════════════════════════ */}
      {isShareModalOpen && selectedContact && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => setIsShareModalOpen(false)} />
          <div className="relative w-full md:max-w-md animate-slide-up md:animate-scale-in rounded-t-3xl md:rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}>

            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <div>
                <h3 className="font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>Share Ledger</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>with {selectedContact.name}</p>
              </div>
              <button onClick={() => setIsShareModalOpen(false)} className="p-1.5 rounded-xl" style={{ color: 'var(--text-muted)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-2.5">
              {([
                { opt: 'all' as const, icon: '📋', label: 'Full Ledger', desc: 'Complete history + net balance', color: '#818cf8', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)' },
                { opt: 'gave' as const, icon: '↗️', label: 'Only What You Gave', desc: 'Share what you lent them', color: '#6ee7b7', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
                { opt: 'got' as const, icon: '↙️', label: 'Only What You Got', desc: 'Share what you borrowed', color: '#fda4af', bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.2)' },
              ] as const).map(({ opt, icon, label, desc, color, bg, border }) => (
                <button key={opt} onClick={() => handleShareLedger(opt)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all hover:scale-[1.01]"
                  style={{ background: bg, border: `1px solid ${border}` }}>
                  <span className="text-2xl">{icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-sm" style={{ color }}>{label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                  </div>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-muted)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    
      {/* ── EDIT CONTACT MODAL ───────────────────────── */}
      {isEditContactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsEditContactOpen(false)} />
          <div className="relative w-full max-w-sm rounded-3xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            
            <div className="px-5 py-4 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <h3 className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>Edit Contact</h3>
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
              </form>
            </div>

            <div className="p-5 shrink-0" style={{ background: 'var(--bg-raised)', borderTop: '1px solid var(--border-soft)' }}>
              <button type="submit" form="edit-contact-form" className="btn-primary w-full shadow-lg shadow-indigo-500/25">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
</div>
  );
}
