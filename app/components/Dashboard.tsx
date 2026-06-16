'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Contact, Transaction, CategoryType, CURRENCIES, CurrencyConfig, ActiveTab } from './types';

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
  const [currency, setCurrency] = useState<CurrencyConfig>(CURRENCIES[0]);
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
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isContactMenuOpen, setIsContactMenuOpen] = useState(false);

  // --- Add Transaction Form State ---
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<'gave' | 'got'>('gave');
  const [txDescription, setTxDescription] = useState('');
  const [txCategory, setTxCategory] = useState<CategoryType>('Cash');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);

  // --- Add Contact Form State ---
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactInitialBalance, setContactInitialBalance] = useState('');
  const [contactInitialType, setContactInitialType] = useState<'credit' | 'debit'>('credit');

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

      const storedCurrency = localStorage.getItem('udhar_currency');
      if (storedCurrency) {
        try {
          setCurrency(JSON.parse(storedCurrency));
        } catch (e) {}
      }
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

  const handleCurrencyChange = (curr: CurrencyConfig) => {
    setCurrency(curr);
    localStorage.setItem('udhar_currency', JSON.stringify(curr));
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
          t.description.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query) ||
          t.amount.toString().includes(query)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first
  }, [selectedContact, ledgerSearchQuery]);

  // --- Category-wise Transaction Distribution top-level hook ---
  const categoryDistribution = useMemo(() => {
    const distribution: Record<CategoryType, number> = {
      Food: 0, Shopping: 0, Travel: 0, Rent: 0, Cash: 0, Business: 0, Other: 0
    };
    let grandTotal = 0;

    contacts.forEach(c => {
      c.transactions.forEach(t => {
        distribution[t.category] += t.amount;
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
        description: 'Starting Balance',
        date: new Date().toISOString().split('T')[0],
        category: 'Other',
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
    setTxDescription('');
    setTxCategory('Cash');
    setTxDate(new Date().toISOString().split('T')[0]);
    setEditingTransaction(null);
    setIsAddTransactionOpen(true);
  };

  const handleOpenEditTx = (tx: Transaction) => {
    setEditingTransaction(tx);
    setTxAmount(tx.amount.toString());
    setTxType(tx.type);
    setTxDescription(tx.description);
    setTxCategory(tx.category);
    setTxDate(tx.date);
    setIsAddTransactionOpen(true);
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId || !txAmount) return;

    const amt = parseFloat(txAmount);
    if (isNaN(amt) || amt <= 0) return;

    const txDesc = txDescription.trim() || 'No description';

    try {
      if (editingTransaction) {
        // Edit Mode
        const res = await fetch(`/api/contacts/${selectedContactId}/transactions/${editingTransaction.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amt,
            type: txType,
            description: txDesc,
            category: txCategory,
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
            description: txDesc,
            category: txCategory,
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
    const settleTxId = 'tx_settle_' + Date.now();

    try {
      const res = await fetch(`/api/contacts/${selectedContact.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: settleTxId,
          amount: settleAmount,
          type: settleType,
          description: '🤝 Fully Settled Account Balance',
          date: new Date().toISOString().split('T')[0],
          category: 'Cash',
        }),
      });

      if (res.ok) {
        const createdTx = await res.json();
        const updatedContacts = contacts.map((c) => {
          if (c.id !== selectedContact.id) return c;
          return {
            ...c,
            transactions: [...c.transactions, createdTx],
          };
        });

        saveContactsState(updatedContacts);
        setTimeout(() => triggerConfetti(), 100);
      } else {
        alert('Failed to record settlement transaction on backend.');
      }
    } catch (err) {
      console.error('Error recording settlement:', err);
      alert('An error occurred during settlement.');
    }
  };

  // --- Share Ledger Template on WhatsApp ---
  const handleWhatsAppReminder = () => {
    if (!selectedContact) return;
    const balance = getContactBalance(selectedContact);
    if (balance === 0) return;

    const cleanName = selectedContact.name;
    const formattedAmt = `${currency.symbol}${Math.abs(balance).toLocaleString('en-IN')}`;
    let msg = '';

    if (balance > 0) {
      msg = `Hi ${cleanName}, standard reminder that there is a pending balance of ${formattedAmt} to be paid to me on UdharWale. Let me know when you can settle it! Thank you.`;
    } else {
      msg = `Hi ${cleanName}, I just wanted to let you know I owe you ${formattedAmt} as tracked on my UdharWale ledger. I will settle this with you as soon as possible!`;
    }

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${selectedContact.phone.replace(/[^0-9+]/g, '')}&text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
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

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100 relative">
      
      {/* CSS Confetti Canvas */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="fixed pointer-events-none z-50 rounded-sm"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`,
            opacity: 0.95,
            transition: 'transform 0.05s linear',
          }}
        />
      ))}

      {/* Main Container */}
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden relative">
        
        {/* ==================================================== */}
        {/* MOBILE TOP HEADER (visible on mobile only) */}
        {/* ==================================================== */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-base">U</span>
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight text-white leading-none">UdharWale</h1>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  dbStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : dbStatus === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-rose-400'
                }`} />
                <span className={`text-[10px] font-semibold ${
                  dbStatus === 'connected' ? 'text-emerald-400' : dbStatus === 'connecting' ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {dbStatus === 'connected' ? 'All saved' : dbStatus === 'connecting' ? 'Syncing...' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-zinc-800/60 rounded-full px-2.5 py-1.5">
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center font-bold text-white text-[9px]">
                {getInitials(userName)}
              </div>
              <span className="text-xs font-semibold text-zinc-300 max-w-[80px] truncate">{userName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Log Out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </header>
        
        {/* ==================================================== */}
        {/* DESKTOP SIDEBAR / MOBILE NAVIGATION BRAND HEADER */}
        {/* ==================================================== */}
        <aside className="hidden md:w-64 md:flex bg-zinc-900 border-r border-zinc-800 flex-col justify-between shrink-0">
          
          <div className="flex flex-col">
            {/* Brand Logo Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <span className="text-white font-bold text-lg">U</span>
                </div>
                <div className="flex flex-col">
                  <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5 leading-none">
                    UdharWale
                  </h1>
                  <p className="text-[10px] text-zinc-500 font-medium mt-1">Smart Debt Ledger</p>
                </div>
              </div>
              
              {/* Dynamic Connection Status badge in Header */}
              <div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold flex items-center gap-1 ${
                  dbStatus === 'connected' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' 
                    : dbStatus === 'connecting'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/10 animate-pulse'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/10'
                }`}>
                  <span className={`w-1 h-1 rounded-full ${
                    dbStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : dbStatus === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-rose-400'
                  }`} />
                  {dbStatus === 'connected' ? 'LIVE' : dbStatus === 'connecting' ? 'SYNC...' : 'OFFLINE'}
                </span>
              </div>
              
              {/* Currency Picker in Header for quick access */}
              <div className="relative group md:hidden">
                <button className="flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-1 px-2 rounded border border-zinc-700">
                  <span>{currency.symbol}</span>
                  <span className="text-[10px] text-zinc-500">{currency.code}</span>
                </button>
              </div>
            </div>

            {/* Profile Card */}
            <div className="p-4 mx-3 my-4 bg-zinc-950/40 border border-zinc-800/80 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 border border-indigo-400/25 flex items-center justify-center font-bold text-white shadow-inner shrink-0">
                  {getInitials(userName)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">ACTIVE PROFILE</p>
                  <h3 className="font-bold text-sm text-zinc-100 truncate">{userName}</h3>
                  <p className="text-xs text-zinc-500 truncate">{userEmail}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                title="Log Out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>

            {/* Navigation Tabs */}
            <nav className="px-3 space-y-1">
              <button
                onClick={() => { setActiveTab('ledgers'); setMobileView('list'); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'ledgers'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>Friends & Khata</span>
                <span className="ml-auto text-xs bg-zinc-950/60 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-850">
                  {contacts.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('insights')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'insights'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Insights & Flow</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'settings'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Ledger Settings</span>
              </button>
            </nav>
          </div>

          {/* Footer Brand Info (Desktop Only) */}
          <div className="hidden md:flex flex-col p-4 border-t border-zinc-800 gap-1.5">
            <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">SYNC STATUS</div>
            <div className={`flex items-center gap-2 text-xs font-bold py-1 px-2 rounded border ${
              dbStatus === 'connected'
                ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10'
                : dbStatus === 'connecting'
                ? 'bg-amber-500/5 text-amber-500 border-amber-500/10 animate-pulse'
                : 'bg-rose-500/5 text-rose-500 border-rose-500/10'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                dbStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : dbStatus === 'connecting' ? 'bg-amber-500' : 'bg-rose-500'
              }`} />
              {dbStatus === 'connected'
                ? 'All saved'
                : dbStatus === 'connecting'
                ? 'Syncing...'
                : 'Offline'}
            </div>
          </div>
        </aside>

        {/* ==================================================== */}
        {/* MAIN DISPLAY CONTAINER */}
        {/* ==================================================== */}
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950 pb-16 md:pb-0">
          {dbStatus === 'connecting' ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-4 border-zinc-800" />
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-sm font-bold text-zinc-200">Loading your data...</h3>
                <p className="text-xs text-zinc-500">Just a moment, hang tight</p>
              </div>
            </div>
          ) : dbStatus === 'error' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 text-3xl shadow-lg shadow-rose-500/5">
                🔌
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-extrabold text-zinc-200">Couldn't load your data</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Something went wrong while loading. Please check your internet connection and try again.
                </p>
              </div>
              <button
                onClick={loadContacts}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-indigo-600/10 active:scale-[0.98]"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <>
              {/* LEDGERS TAB */}
              {activeTab === 'ledgers' && (
            <div className="flex-1 flex overflow-hidden relative">
              
              {/* LEDGER SPLIT PANE: CONTACTS SIDEBAR */}
              <div className={`w-full md:w-96 border-r border-zinc-900 flex flex-col bg-zinc-950/60 overflow-hidden shrink-0 ${
                mobileView === 'ledger' && selectedContactId ? 'hidden md:flex' : 'flex'
              }`}>
                
                {/* 1. Global Stat Summary Mini Hero */}
                <div className="p-4 border-b border-zinc-900 space-y-3">
                  
                  {/* Balance Widget Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 shadow-xl relative overflow-hidden">
                    {/* Glowing highlight gradients */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full" />
                    
                    <p className="text-xs text-zinc-500 font-semibold tracking-wider uppercase">NET WALLET BALANCE</p>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <h2 className={`text-2xl font-black ${
                        stats.netBalance > 0 ? 'text-emerald-500' : stats.netBalance < 0 ? 'text-rose-500' : 'text-zinc-300'
                      }`}>
                        {stats.netBalance > 0 ? '+' : stats.netBalance < 0 ? '-' : ''}
                        {currency.symbol}{Math.abs(stats.netBalance).toLocaleString('en-IN')}
                      </h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-zinc-850">
                      <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">YOU&apos;LL GET</p>
                        <p className="text-sm font-extrabold text-emerald-500">
                          {currency.symbol}{stats.totalCredit.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="border-l border-zinc-850 pl-3">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">YOU OWE</p>
                        <p className="text-sm font-extrabold text-rose-500">
                          {currency.symbol}{stats.totalDebit.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Add Friend Trigger */}
                  <button
                    onClick={() => setIsAddContactOpen(true)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-indigo-600/10 active:scale-[0.98]"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Add New Friend / Ledger</span>
                  </button>
                </div>

                {/* 2. Contacts Search, Sort & Filters Toolbar */}
                <div className="px-4 py-3 border-b border-zinc-900 space-y-2.5 bg-zinc-950/90 sticky top-0 z-10">
                  
                  {/* Search Field & Sort Inline Row */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        placeholder="Search friend/phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl px-2 shrink-0">
                      <span className="text-[10px] text-zinc-500 font-medium">Sort:</span>
                      <select
                        value={sortBy}
                        onChange={(e: any) => setSortBy(e.target.value)}
                        className="bg-transparent text-zinc-300 font-bold border-none outline-none focus:ring-0 cursor-pointer text-[10px] p-0 pr-4"
                      >
                        <option value="recent">Active</option>
                        <option value="name">Name</option>
                        <option value="balance">Balance</option>
                      </select>
                    </div>
                  </div>

                  {/* Category Status Filters & Counter Row */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex gap-1 overflow-x-auto scrollbar-none">
                      {(['all', 'credit', 'debit', 'settled'] as const).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setStatusFilter(filter)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap capitalize transition-all border ${
                            statusFilter === filter
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                          }`}
                        >
                          {filter === 'credit' ? "Get" : filter === 'debit' ? 'Owe' : filter}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-zinc-500 font-bold shrink-0 whitespace-nowrap">
                      {filteredContacts.length} total
                    </span>
                  </div>
                </div>

                {/* 3. Friend Cards List view scroll area */}
                <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/60 scrollbar-thin scrollbar-thumb-zinc-800">
                  {contacts.length === 0 ? (
                    <div className="p-6 text-center space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-xl mx-auto shadow-inner">
                        📖
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-extrabold text-zinc-200">No Friends Found</p>
                        <p className="text-xs text-zinc-500 leading-relaxed">Add a friend to start tracking your ledgers and shared debts.</p>
                      </div>
                      <div className="flex flex-col gap-2 pt-1.5">
                        <button
                          onClick={() => setIsAddContactOpen(true)}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all duration-200 active:scale-[0.98] shadow-md shadow-indigo-600/10"
                        >
                          ➕ Add Friend / Ledger
                        </button>
                      </div>
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <p className="text-sm text-zinc-500 font-medium">No contacts match the criteria.</p>
                      <button
                        onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                        className="text-xs text-indigo-400 font-bold hover:underline"
                      >
                        Clear Filters
                      </button>
                    </div>
                  ) : (
                    filteredContacts.map((contact) => {
                      const balance = getContactBalance(contact);
                      const isSelected = selectedContactId === contact.id;
                      const initials = getInitials(contact.name);
                      const avatarGradient = getAvatarGradient(contact.name);

                      return (
                        <div
                          key={contact.id}
                          onClick={() => {
                            setSelectedContactId(contact.id);
                            setMobileView('ledger');
                          }}
                          className={`p-4 flex items-center justify-between cursor-pointer transition-all duration-150 ${
                            isSelected
                              ? 'bg-zinc-900 border-l-4 border-indigo-500'
                              : 'hover:bg-zinc-900/40 active:bg-zinc-900/60'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Colorful Initials Avatar */}
                            <div className={`w-11 h-11 rounded-full shrink-0 bg-gradient-to-tr ${avatarGradient} flex items-center justify-center font-black text-sm text-white border border-white/10 shadow`}>
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-zinc-100 truncate">{contact.name}</h4>
                              <p className="text-xs text-zinc-500 mt-0.5 truncate">{contact.phone}</p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 pl-2">
                            {balance > 0 ? (
                              <div>
                                <p className="text-[10px] text-zinc-500 font-bold leading-none uppercase">YOU&apos;LL GET</p>
                                <p className="text-sm font-extrabold text-emerald-500 mt-1">
                                  +{currency.symbol}{balance.toLocaleString('en-IN')}
                                </p>
                              </div>
                            ) : balance < 0 ? (
                              <div>
                                <p className="text-[10px] text-zinc-500 font-bold leading-none uppercase">YOU OWE</p>
                                <p className="text-sm font-extrabold text-rose-500 mt-1">
                                  -{currency.symbol}{Math.abs(balance).toLocaleString('en-IN')}
                                </p>
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-zinc-900 text-zinc-500 border border-zinc-800">
                                Settled
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* LEDGER SPLIT PANE: DETAILED HISTORY SHEET */}
              <div className={`flex-1 flex flex-col bg-zinc-950 overflow-hidden ${
                mobileView === 'list' ? 'hidden md:flex' : 'flex'
              }`}>
                {selectedContact ? (
                  <div className="flex-1 flex flex-col overflow-hidden relative">
                    
                    {/* Header Panel */}
                    <div className="p-4 md:p-6 bg-zinc-900/60 border-b border-zinc-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
                      
                      {/* Contact Info Detail */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Mobile Back Button */}
                        <button
                          onClick={() => setMobileView('list')}
                          className="md:hidden p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        
                        <div className={`w-12 h-12 rounded-full shrink-0 bg-gradient-to-tr ${getAvatarGradient(selectedContact.name)} flex items-center justify-center font-black text-base text-white shadow border border-white/10`}>
                          {getInitials(selectedContact.name)}
                        </div>
                        <div className="min-w-0">
                          <h2 className="font-extrabold text-base text-white truncate">{selectedContact.name}</h2>
                          <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                            <span>{selectedContact.phone}</span>
                            {selectedContact.email && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-zinc-600" />
                                <span className="truncate">{selectedContact.email}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Header Main Actions Row */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Settle Up Action */}
                        {getContactBalance(selectedContact) !== 0 && (
                          <button
                            onClick={handleSettleFullBalance}
                            className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold py-1.5 px-3 rounded-xl text-xs border border-emerald-500/20 transition-all duration-200 cursor-pointer active:scale-95"
                          >
                            <span>🤝 Settle Balance</span>
                          </button>
                        )}

                        {/* WhatsApp reminder */}
                        {getContactBalance(selectedContact) !== 0 && (
                          <button
                            onClick={handleWhatsAppReminder}
                            className="flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold py-1.5 px-3 rounded-xl text-xs border border-indigo-500/20 transition-all duration-200 cursor-pointer active:scale-95"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.59 1.977 14.113.953 11.999.953c-5.439 0-9.866 4.37-9.87 9.8a9.697 9.697 0 0 0 1.511 5.176l-.99 3.616 3.791-.977c1.554.896 3.12 1.39 4.606 1.39z"/>
                            </svg>
                            <span>Send Reminder</span>
                          </button>
                        )}

                        {/* More Actions Dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setIsContactMenuOpen(!isContactMenuOpen)}
                            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl border border-zinc-800 transition-colors cursor-pointer active:scale-95"
                            title="More Options"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          
                          {isContactMenuOpen && (
                            <>
                              {/* Backdrop click overlay to close dropdown */}
                              <div className="fixed inset-0 z-10" onClick={() => setIsContactMenuOpen(false)} />
                              
                              <div className="absolute right-0 mt-2 w-44 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-20 py-1.5 animate-in fade-in slide-in-from-top-2 duration-100">
                                <button
                                  onClick={() => {
                                    setIsContactMenuOpen(false);
                                    handleDeleteContact(selectedContact.id);
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete Account
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Summary Balance Strip */}
                    <div className="px-4 py-3 bg-zinc-900/20 border-b border-zinc-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">CURRENT POSITION:</span>
                        {getContactBalance(selectedContact) > 0 ? (
                          <span className="text-xs bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                            {selectedContact.name} owes you {currency.symbol}{getContactBalance(selectedContact).toLocaleString('en-IN')}
                          </span>
                        ) : getContactBalance(selectedContact) < 0 ? (
                          <span className="text-xs bg-rose-500/10 text-rose-400 font-bold px-2 py-0.5 rounded border border-rose-500/20">
                            You owe {selectedContact.name} {currency.symbol}{Math.abs(getContactBalance(selectedContact)).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-xs bg-zinc-900 text-zinc-400 font-bold px-2 py-0.5 rounded border border-zinc-800">
                            Ledger Fully Balanced 🤝
                          </span>
                        )}
                      </div>

                      {/* Small Search inside Ledger */}
                      <div className="relative w-40 sm:w-56">
                        <input
                          type="text"
                          placeholder="Search transactions..."
                          value={ledgerSearchQuery}
                          onChange={(e) => setLedgerSearchQuery(e.target.value)}
                          className="w-full pl-7 pr-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                        <span className="absolute inset-y-0 left-2 flex items-center pointer-events-none text-zinc-600">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </span>
                      </div>
                    </div>

                    {/* Transaction Feed */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
                      {filteredTransactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
                          <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl">
                            📖
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-300">No transactions recorded.</p>
                            <p className="text-xs text-zinc-500 mt-1">Use the big action buttons below to add payments.</p>
                          </div>
                        </div>
                      ) : (
                        filteredTransactions.map((tx) => {
                          const isCredit = tx.type === 'gave';
                          const dateObj = new Date(tx.date);
                          const formattedDate = dateObj.toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          });

                          // Custom Category Icon mapping
                          const catIcons: Record<CategoryType, string> = {
                            Food: '🍔',
                            Shopping: '🛒',
                            Travel: '🚗',
                            Rent: '🏠',
                            Cash: '💵',
                            Business: '💼',
                            Other: '📦',
                          };

                          return (
                            <div
                              key={tx.id}
                              className={`group relative flex items-start justify-between p-4 rounded-xl bg-zinc-900/40 hover:bg-zinc-900 border-y border-r transition-all duration-150 ${
                                isCredit 
                                  ? 'border-l-4 border-l-emerald-500 border-y-zinc-800/60 border-r-zinc-800/60 shadow-lg shadow-emerald-950/5' 
                                  : 'border-l-4 border-l-rose-500 border-y-zinc-800/60 border-r-zinc-800/60 shadow-lg shadow-rose-950/5'
                              }`}
                            >
                              <div className="flex items-start gap-3.5 min-w-0">
                                {/* Category Icon Wrapper */}
                                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center text-lg shadow-inner shrink-0 mt-0.5">
                                  {catIcons[tx.category] || '📦'}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                      isCredit 
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    }`}>
                                      {isCredit ? '↗️ GAVE (Lent)' : '↙️ GOT (Borrowed)'}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 font-semibold">{formattedDate}</span>
                                  </div>
                                  <h4 className="font-bold text-sm text-zinc-200 mt-1.5 break-words">
                                    {tx.description}
                                  </h4>
                                  <p className="text-xs text-zinc-500 mt-1 font-medium italic">Category: {tx.category}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 ml-3">
                                <span className={`text-base font-black tracking-tight ${
                                  isCredit ? 'text-emerald-500' : 'text-rose-500'
                                }`}>
                                  {isCredit ? '+' : '-'}{currency.symbol}{tx.amount.toLocaleString('en-IN')}
                                </span>
                                
                                {/* Edit/Delete actions: always visible on mobile/touch, hover only on desktop */}
                                <div className="md:opacity-0 md:group-hover:opacity-100 flex items-center gap-1 transition-opacity duration-150">
                                  <button
                                    onClick={() => handleOpenEditTx(tx)}
                                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                                    title="Edit Transaction"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTransaction(tx.id)}
                                    className="p-1.5 bg-zinc-800 hover:bg-rose-500/20 rounded-md border border-zinc-700 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                                    title="Delete Transaction"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Bottom Action CTA Strip */}
                    <div className="p-4 bg-zinc-900/80 border-t border-zinc-900 grid grid-cols-2 gap-3 shrink-0">
                      <button
                        onClick={() => handleOpenAddTx('got')}
                        className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all duration-150 active:scale-[0.98] shadow-lg shadow-rose-600/10"
                      >
                        <span className="text-base leading-none">↙️</span>
                        <span>I GOT (Borrowed)</span>
                      </button>

                      <button
                        onClick={() => handleOpenAddTx('gave')}
                        className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all duration-150 active:scale-[0.98] shadow-lg shadow-emerald-600/10"
                      >
                        <span className="text-base leading-none">↗️</span>
                        <span>I GAVE (Lent)</span>
                      </button>
                    </div>

                  </div>
                ) : (
                  // Select Friend Placeholder View
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-zinc-950">
                    <div className="max-w-md space-y-4">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center text-5xl mx-auto shadow-2xl animate-bounce">
                        {contacts.length === 0 ? '📖' : '📇'}
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-extrabold text-zinc-200">
                          {contacts.length === 0 ? 'Welcome to UdharWale!' : 'No Contact Selected'}
                        </h3>
                        <p className="text-sm text-zinc-500 leading-relaxed">
                          {contacts.length === 0 
                            ? 'Get started by creating a new friend account to track shared bills, outstanding balances, and debts.' 
                            : 'Select a friend from the sidebar ledger list to view their transaction history, outstanding payments, send notifications, or record new items.'}
                        </p>
                      </div>
                      <div className="pt-2 flex justify-center gap-3">
                        <button
                          onClick={() => setIsAddContactOpen(true)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-colors shadow-md shadow-indigo-600/10"
                        >
                          ➕ Add Friend Account
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* INSIGHTS & ANALYTICS TAB */}
          {activeTab === 'insights' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
              
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white">Overview</h2>
                <p className="text-sm text-zinc-400">A summary of all your balances and spending patterns.</p>
              </div>

              {/* Financial Health Summary Widget */}
              <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-xl relative overflow-hidden">
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">TOTAL TO RECEIVE</p>
                  <h3 className="text-3xl font-black text-emerald-500">
                    {currency.symbol}{stats.totalCredit.toLocaleString('en-IN')}
                  </h3>
                  <p className="text-xs text-zinc-500">From {contacts.filter(c => getContactBalance(c) > 0).length} people</p>
                </div>

                <div className="space-y-2 border-t md:border-t-0 md:border-l border-zinc-800 pt-4 md:pt-0 md:pl-6">
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">TOTAL YOU OWE</p>
                  <h3 className="text-3xl font-black text-rose-500">
                    {currency.symbol}{stats.totalDebit.toLocaleString('en-IN')}
                  </h3>
                  <p className="text-xs text-zinc-500">To {contacts.filter(c => getContactBalance(c) < 0).length} people</p>
                </div>

                <div className="space-y-2 border-t md:border-t-0 md:border-l border-zinc-800 pt-4 md:pt-0 md:pl-6">
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">NET CASHFLOW RATIO</p>
                  
                  {/* Ledger Progress ratio bar */}
                  {stats.totalCredit + stats.totalDebit > 0 ? (
                    <div className="space-y-2.5 pt-1">
                      <div className="w-full h-3 rounded-full bg-zinc-800 overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-500"
                          style={{
                            width: `${(stats.totalCredit / (stats.totalCredit + stats.totalDebit)) * 100}%`,
                          }}
                        />
                        <div
                          className="h-full bg-rose-500"
                          style={{
                            width: `${(stats.totalDebit / (stats.totalCredit + stats.totalDebit)) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-400 font-extrabold leading-none">
                        <span>{Math.round((stats.totalCredit / (stats.totalCredit + stats.totalDebit)) * 100)}% Recv</span>
                        <span>{Math.round((stats.totalDebit / (stats.totalCredit + stats.totalDebit)) * 100)}% Pay</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400">All balances are completely settled!</p>
                  )}
                </div>
              </div>

              {/* Split Breakdown grids: Debtors & Creditors */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Top Debtors (Who owes you money) */}
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col gap-4">
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      Top Debtors (You&apos;ll Get From)
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">People with largest outstanding payments to you.</p>
                  </div>

                  <div className="divide-y divide-zinc-850">
                    {contacts.filter(c => getContactBalance(c) > 0).length === 0 ? (
                      <p className="text-xs text-zinc-500 py-6 text-center">Nobody currently owes you anything. Great!</p>
                    ) : (
                      contacts
                        .filter(c => getContactBalance(c) > 0)
                        .sort((a, b) => getContactBalance(b) - getContactBalance(a))
                        .slice(0, 5)
                        .map((contact) => {
                          const bal = getContactBalance(contact);
                          return (
                            <div key={contact.id} className="py-3 flex items-center justify-between text-sm">
                              <span className="font-bold text-zinc-300">{contact.name}</span>
                              <span className="font-black text-emerald-500">
                                {currency.symbol}{bal.toLocaleString('en-IN')}
                              </span>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

                {/* 2. Top Creditors (Whom you owe money) */}
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col gap-4">
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      Top Creditors (You Owe To)
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">People you borrowed the most money from.</p>
                  </div>

                  <div className="divide-y divide-zinc-850">
                    {contacts.filter(c => getContactBalance(c) < 0).length === 0 ? (
                      <p className="text-xs text-zinc-500 py-6 text-center">You don&apos;t owe money to anyone! Outstanding.</p>
                    ) : (
                      contacts
                        .filter(c => getContactBalance(c) < 0)
                        .sort((a, b) => getContactBalance(a) - getContactBalance(b)) // sorting negative balances
                        .slice(0, 5)
                        .map((contact) => {
                          const bal = Math.abs(getContactBalance(contact));
                          return (
                            <div key={contact.id} className="py-3 flex items-center justify-between text-sm">
                              <span className="font-bold text-zinc-300">{contact.name}</span>
                              <span className="font-black text-rose-500">
                                {currency.symbol}{bal.toLocaleString('en-IN')}
                              </span>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

              </div>

              {/* Category-wise Transaction Distribution insights */}
              <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <h3 className="font-extrabold text-sm text-zinc-200 uppercase tracking-wider">
                  🛒 Distribution by Category
                </h3>
                
                {categoryDistribution.grandTotal === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-4">Create some transactions to view distribution charts.</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(categoryDistribution.distribution)
                      .filter(([_, value]) => value > 0)
                      .sort((a, b) => b[1] - a[1])
                      .map(([category, value]) => {
                        const percentage = Math.round((value / categoryDistribution.grandTotal) * 100);
                        const icons: Record<CategoryType, string> = {
                          Food: '🍔', Shopping: '🛒', Travel: '🚗', Rent: '🏠', Cash: '💵', Business: '💼', Other: '📦'
                        };
                        return (
                          <div key={category} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold text-zinc-300">
                              <span className="flex items-center gap-1.5">
                                <span>{icons[category as CategoryType] || '📦'}</span>
                                {category}
                              </span>
                              <span className="font-bold">
                                {currency.symbol}{value.toLocaleString('en-IN')} ({percentage}%)
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-zinc-950 overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-3xl scrollbar-thin scrollbar-thumb-zinc-800">
              
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white">Settings</h2>
                <p className="text-sm text-zinc-400">Manage your profile, currency, and data.</p>
              </div>

              {/* 1. Profile card */}
              <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4 shadow-lg">
                <h3 className="font-extrabold text-sm text-zinc-200 uppercase tracking-wider">👤 Your Profile</h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    alert('Profile saved!');
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-500 font-bold uppercase">NAME</label>
                      <input
                        type="text"
                        readOnly
                        value={userName}
                        className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-900 rounded-xl text-sm text-zinc-400 cursor-not-allowed focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-500 font-bold uppercase">EMAIL</label>
                      <input
                        type="text"
                        readOnly
                        value={userEmail}
                        className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-900 rounded-xl text-sm text-zinc-400 cursor-not-allowed focus:outline-none"
                      />
                    </div>
                  </div>
                </form>
              </div>

              {/* 2. Currency setup card */}
              <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4 shadow-lg">
                <h3 className="font-extrabold text-sm text-zinc-200 uppercase tracking-wider">🪙 Currency</h3>
                <p className="text-xs text-zinc-500">Choose the currency used across all your balances.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => handleCurrencyChange(c)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        currency.code === c.code
                          ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400 font-bold'
                          : 'bg-zinc-950 hover:bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <span className="block text-lg font-black">{c.symbol}</span>
                      <span className="block text-xs uppercase tracking-wider font-bold mt-1">{c.code}</span>
                      <span className="block text-[10px] text-zinc-650 truncate mt-0.5">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Data management card */}
              <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5 shadow-lg">
                <h3 className="font-extrabold text-sm text-zinc-200 uppercase tracking-wider text-rose-400">⚠️ Data Management</h3>
                <p className="text-xs text-zinc-500">Clear all your saved data. This cannot be undone.</p>
                
                <div className="flex flex-wrap items-center gap-3">
                  {/* Wipe All Data completely */}
                  <button
                    onClick={() => {
                      if (confirm('Are you sure? This will permanently delete all your contacts and transaction history.')) {
                        handleWipeData();
                        alert('Everything has been cleared.');
                      }
                    }}
                    className="px-4 py-2.5 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 font-bold rounded-xl text-xs border border-rose-500/20 transition-colors"
                  >
                    🗑️ Clear All Data
                  </button>
                </div>
              </div>

              {/* 4. App Information Sheet */}
              <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
                <h3 className="font-bold text-xs text-zinc-400 uppercase tracking-wider">ABOUT UDHARWALE</h3>
                <div className="space-y-1.5 text-xs text-zinc-500 leading-relaxed font-semibold">
                  <p>Version 1.2.0</p>
                  <p className="text-indigo-400">Your personal khata book — track who owes you, and who you owe, all in one place.</p>
                </div>
              </div>

            </div>
          )}
            </>
          )}
        </main>
      </div>

      {/* ==================================================== */}
      {/* ADD / EDIT CONTACT MODAL FORM */}
      {/* ==================================================== */}
      {isAddContactOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-zinc-850 flex items-center justify-between">
              <h3 className="font-extrabold text-base text-white">Create New Ledger Account</h3>
              <button
                onClick={() => setIsAddContactOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddContactSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-500 font-bold uppercase">FRIEND&apos;S NAME *</label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="e.g. Aarav Sharma"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-500 font-bold uppercase">PHONE NUMBER *</label>
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-500 font-bold uppercase">EMAIL ADDRESS (OPTIONAL)</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="e.g. aarav@gmail.com"
                />
              </div>

              <div className="pt-2 border-t border-zinc-850 space-y-3">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">OPTIONAL STARTING POSITION</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold">INITIAL BALANCE</label>
                    <input
                      type="number"
                      value={contactInitialBalance}
                      onChange={(e) => setContactInitialBalance(e.target.value)}
                      className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-indigo-500"
                      placeholder="0.00"
                      min="0"
                    />
                  </div>
                  
                  {/* Select whether you owe or get */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-bold">POSITION TYPE</label>
                    <div className="grid grid-cols-2 h-[38px] rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setContactInitialType('credit')}
                        className={`text-xs font-semibold transition-all ${
                          contactInitialType === 'credit'
                            ? 'bg-emerald-600/20 text-emerald-400 font-bold'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        You&apos;ll Get
                      </button>
                      <button
                        type="button"
                        onClick={() => setContactInitialType('debit')}
                        className={`text-xs font-semibold transition-all ${
                          contactInitialType === 'debit'
                            ? 'bg-rose-600/20 text-rose-400 font-bold'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        You Owe
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddContactOpen(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold py-2.5 rounded-xl text-sm border border-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* ADD / EDIT TRANSACTION MODAL FORM */}
      {/* ==================================================== */}
      {isAddTransactionOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-zinc-850 flex items-center justify-between">
              <h3 className="font-extrabold text-base text-white">
                {editingTransaction ? 'Edit Transaction Details' : `Record ${txType === 'gave' ? 'Money GAVE (Lent)' : 'Money GOT (Borrowed)'}`}
              </h3>
              <button
                onClick={() => setIsAddTransactionOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleTransactionSubmit} className="p-5 space-y-4">
              
              {/* Type Switcher inside transaction */}
              {!editingTransaction && (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase">TRANSACTION DIRECTION</label>
                  <div className="grid grid-cols-2 h-11 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setTxType('got')}
                      className={`rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        txType === 'got'
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <span>↙️ Got (Borrowed)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('gave')}
                      className={`rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        txType === 'gave'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <span>↗️ Gave (Lent)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Amount Field (Giant Number Layout) */}
              <div className="space-y-1.5 text-center">
                <label className="text-xs text-zinc-500 font-bold uppercase block text-left">AMOUNT ({currency.code}) *</label>
                <div className="relative flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 focus-within:border-indigo-500">
                  <span className="text-2xl font-black text-zinc-500 pr-2">{currency.symbol}</span>
                  <input
                    type="number"
                    required
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full bg-transparent text-2xl font-black text-white focus:outline-none placeholder-zinc-700"
                    placeholder="0.00"
                    min="0.01"
                    step="any"
                    autoFocus
                  />
                </div>
              </div>

              {/* Description Input */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-500 font-bold uppercase">DESCRIPTION / REMARKS *</label>
                <input
                  type="text"
                  required
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="e.g. Lunch sharing bill, advanced cash..."
                />
              </div>

              {/* Category Pills Grid */}
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 font-bold uppercase block">SELECT CATEGORY</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {(['Food', 'Shopping', 'Travel', 'Rent', 'Cash', 'Business', 'Other'] as CategoryType[]).map((cat) => {
                    const icons: Record<CategoryType, string> = {
                      Food: '🍔', Shopping: '🛒', Travel: '🚗', Rent: '🏠', Cash: '💵', Business: '💼', Other: '📦'
                    };
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setTxCategory(cat)}
                        className={`py-2 px-1 rounded-xl border text-center transition-all ${
                          txCategory === cat
                            ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400 font-bold'
                            : 'bg-zinc-950 hover:bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-350'
                        }`}
                      >
                        <span className="block text-base leading-none">{icons[cat]}</span>
                        <span className="block text-[10px] mt-1 font-semibold">{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Input */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-500 font-bold uppercase">TRANSACTION DATE</label>
                <input
                  type="date"
                  required
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Actions Row */}
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddTransactionOpen(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold py-2.5 rounded-xl text-sm border border-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                >
                  {editingTransaction ? 'Save Changes' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MOBILE BOTTOM NAV BAR */}
      {/* ==================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/95 border-t border-zinc-800 backdrop-blur-xl flex items-stretch">
        <button
          onClick={() => { setActiveTab('ledgers'); setMobileView('list'); }}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all ${
            activeTab === 'ledgers' ? 'text-indigo-400' : 'text-zinc-500'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'ledgers' ? 2.5 : 2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[10px] font-bold">Friends</span>
        </button>

        <button
          onClick={() => setActiveTab('insights')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all ${
            activeTab === 'insights' ? 'text-indigo-400' : 'text-zinc-500'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'insights' ? 2.5 : 2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-[10px] font-bold">Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all ${
            activeTab === 'settings' ? 'text-indigo-400' : 'text-zinc-500'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'settings' ? 2.5 : 2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'settings' ? 2.5 : 2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[10px] font-bold">Settings</span>
        </button>
      </nav>

    </div>
  );
}
