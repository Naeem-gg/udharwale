import { Contact } from './types';

/**
 * Demo ledger dataset for viva / teacher presentations.
 * Each transaction has:
 * - date: when the money moved (user-selected)
 * - createdAt: when the record was logged in the app
 */
export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'c1',
    name: 'Aarav Sharma',
    phone: '+91 98765 43210',
    email: 'aarav.sharma@example.com',
    createdAt: '2026-07-10T12:00:00.000Z',
    transactions: [
      {
        id: 't1',
        amount: 1500,
        type: 'gave',
        remark: 'Dinner at Punjabi Rasoi',
        date: '2026-08-10',
        createdAt: '2026-08-10T20:15:00.000Z',
        mode: 'Cash'
      },
      {
        id: 't2',
        amount: 500,
        type: 'got',
        remark: 'Cab fare share',
        date: '2026-08-12',
        createdAt: '2026-08-13T09:40:00.000Z',
        mode: 'Online Transfer'
      },
      {
        id: 't3',
        amount: 800,
        type: 'gave',
        remark: 'Movie tickets',
        date: '2026-09-05',
        createdAt: '2026-09-05T22:05:00.000Z',
        mode: 'Online Transfer'
      }
    ]
  },
  {
    id: 'c2',
    name: 'Priya Patel',
    phone: '+91 87654 32109',
    email: 'priya.patel@example.com',
    createdAt: '2026-07-15T09:30:00.000Z',
    transactions: [
      {
        id: 't4',
        amount: 3000,
        type: 'got',
        remark: 'Apartment electricity bill share',
        date: '2026-08-02',
        createdAt: '2026-08-02T18:20:00.000Z',
        mode: 'Online Transfer'
      },
      {
        id: 't5',
        amount: 1000,
        type: 'gave',
        remark: 'Grocery shopping share',
        date: '2026-08-18',
        createdAt: '2026-08-18T11:05:00.000Z',
        mode: 'Cash'
      },
      {
        id: 't6',
        amount: 500,
        type: 'gave',
        remark: 'Partial repayment — UPI',
        date: '2026-09-20',
        createdAt: '2026-09-21T08:12:00.000Z',
        mode: 'Online Transfer'
      }
    ]
  },
  {
    id: 'c3',
    name: 'Amit Verma',
    phone: '+91 76543 21098',
    email: 'amit.verma@example.com',
    createdAt: '2026-07-20T15:45:00.000Z',
    transactions: [
      {
        id: 't7',
        amount: 5000,
        type: 'gave',
        remark: 'Advance loan for bike repair',
        date: '2026-08-01',
        createdAt: '2026-08-01T16:30:00.000Z',
        mode: 'Online Transfer'
      },
      {
        id: 't8',
        amount: 5000,
        type: 'got',
        remark: '🤝 Full Settlement',
        date: '2026-09-14',
        createdAt: '2026-09-14T19:45:00.000Z',
        mode: 'Online Transfer'
      }
    ]
  },
  {
    id: 'c4',
    name: 'Rohan Gupta',
    phone: '+91 91234 56789',
    email: 'rohan.g@example.com',
    createdAt: '2026-08-01T11:20:00.000Z',
    transactions: [
      {
        id: 't9',
        amount: 1200,
        type: 'got',
        remark: 'Concert ticket booking',
        date: '2026-09-16',
        createdAt: '2026-09-16T21:10:00.000Z',
        mode: 'Online Transfer'
      }
    ]
  },
  {
    id: 'c5',
    name: 'Sneha Iyer',
    phone: '+91 99887 76655',
    email: 'sneha.iyer@example.com',
    createdAt: '2026-08-12T08:00:00.000Z',
    transactions: [
      {
        id: 't10',
        amount: 2500,
        type: 'gave',
        remark: 'College project print & binding',
        date: '2026-09-01',
        createdAt: '2026-09-01T14:25:00.000Z',
        mode: 'Cash'
      },
      {
        id: 't11',
        amount: 750,
        type: 'got',
        remark: 'Partial return via GPay',
        date: '2026-09-22',
        createdAt: '2026-09-22T17:50:00.000Z',
        mode: 'Online Transfer'
      }
    ]
  },
  {
    id: 'c6',
    name: 'Local Kirana Store',
    phone: '+91 98111 22334',
    email: '',
    createdAt: '2026-06-01T10:00:00.000Z',
    transactions: [
      {
        id: 't12',
        amount: 840,
        type: 'got',
        remark: 'Monthly ration on udhar',
        date: '2026-09-03',
        createdAt: '2026-09-03T19:00:00.000Z',
        mode: 'Cash'
      },
      {
        id: 't13',
        amount: 320,
        type: 'got',
        remark: 'Milk & bread — week 2',
        date: '2026-09-10',
        createdAt: '2026-09-10T08:30:00.000Z',
        mode: 'Cash'
      },
      {
        id: 't14',
        amount: 1160,
        type: 'gave',
        remark: 'Cleared shop khata',
        date: '2026-09-28',
        createdAt: '2026-09-28T20:15:00.000Z',
        mode: 'Cash'
      }
    ]
  },
  {
    id: 'c7',
    name: 'Meera Kapoor',
    phone: '+91 90001 11222',
    email: 'meera.k@example.com',
    createdAt: '2026-09-01T14:00:00.000Z',
    transactions: [
      {
        id: 't15',
        amount: 4500,
        type: 'gave',
        remark: 'Emergency medical help',
        date: '2026-09-08',
        createdAt: '2026-09-08T11:40:00.000Z',
        mode: 'Online Transfer'
      }
    ]
  }
];
