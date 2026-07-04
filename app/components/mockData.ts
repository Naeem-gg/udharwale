import { Contact } from './types';

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'c1',
    name: 'Aarav Sharma',
    phone: '+91 98765 43210',
    email: 'aarav.sharma@example.com',
    createdAt: '2026-04-10T12:00:00.000Z',
    transactions: [
      {
        id: 't1',
        amount: 1500,
        type: 'gave', // you gave Aarav money, so he owes you
        remark: 'Dinner at Punjabi Rasoi',
        date: '2026-05-10',
        mode: 'Cash'
      },
      {
        id: 't2',
        amount: 500,
        type: 'got', // you got from Aarav, so you deduct from his credit
        remark: 'Cab fare share',
        date: '2026-05-12',
        mode: 'Cash'
      },
      {
        id: 't3',
        amount: 800,
        type: 'gave', // you gave Aarav money again
        remark: 'Movie tickets (Avengers)',
        date: '2026-05-15',
        mode: 'Cash'
      }
    ]
  },
  {
    id: 'c2',
    name: 'Priya Patel',
    phone: '+91 87654 32109',
    email: 'priya.patel@example.com',
    createdAt: '2026-04-15T09:30:00.000Z',
    transactions: [
      {
        id: 't4',
        amount: 3000,
        type: 'got', // you got from Priya, so you owe her
        remark: 'Apartment electricity bill share',
        date: '2026-05-02',
        mode: 'Cash'
      },
      {
        id: 't5',
        amount: 1000,
        type: 'gave', // you gave Priya, reducing what you owe her
        remark: 'Grocery shopping share',
        date: '2026-05-05',
        mode: 'Cash'
      }
    ]
  },
  {
    id: 'c3',
    name: 'Amit Verma',
    phone: '+91 76543 21098',
    email: 'amit.verma@example.com',
    createdAt: '2026-04-20T15:45:00.000Z',
    transactions: [
      {
        id: 't6',
        amount: 5000,
        type: 'gave', // you lent him
        remark: 'Advance loan for bike repair',
        date: '2026-04-28',
        mode: 'Cash'
      },
      {
        id: 't7',
        amount: 5000,
        type: 'got', // he returned it, so it's fully settled
        remark: 'Returned full amount via UPI',
        date: '2026-05-14',
        mode: 'Cash'
      }
    ]
  },
  {
    id: 'c4',
    name: 'Rohan Gupta',
    phone: '+91 91234 56789',
    email: 'rohan.g@example.com',
    createdAt: '2026-05-01T11:20:00.000Z',
    transactions: [
      {
        id: 't8',
        amount: 1200,
        type: 'got', // you borrowed
        remark: 'Concert ticket booking',
        date: '2026-05-16',
        mode: 'Cash'
      }
    ]
  }
];
