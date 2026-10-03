/**
 * Seeds a demo account + sample ledger for viva / teacher demos.
 *
 * Usage: node scripts/seed-demo.mjs
 *
 * Credentials printed at the end (also listed below).
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnvLocal() {
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('Missing .env.local — need MONGODB_URI');
  }
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

const DEMO = {
  name: 'Demo User',
  email: 'demo@udharwale.com',
  password: 'Demo@1234',
  recoveryPin: '2468',
  securityAnswer: 'mumbai',
};

const DEMO_CONTACTS = [
  {
    id: 'demo-c1',
    name: 'Aarav Sharma',
    phone: '+91 98765 43210',
    email: 'aarav.sharma@example.com',
    createdAt: '2026-07-10T12:00:00.000Z',
    transactions: [
      { id: 'demo-t1', amount: 1500, type: 'gave', remark: 'Dinner at Punjabi Rasoi', date: '2026-08-10', mode: 'Cash' },
      { id: 'demo-t2', amount: 500, type: 'got', remark: 'Cab fare share', date: '2026-08-12', mode: 'Online Transfer' },
      { id: 'demo-t3', amount: 800, type: 'gave', remark: 'Movie tickets', date: '2026-09-05', mode: 'Online Transfer' },
    ],
  },
  {
    id: 'demo-c2',
    name: 'Priya Patel',
    phone: '+91 87654 32109',
    email: 'priya.patel@example.com',
    createdAt: '2026-07-15T09:30:00.000Z',
    transactions: [
      { id: 'demo-t4', amount: 3000, type: 'got', remark: 'Apartment electricity bill share', date: '2026-08-02', mode: 'Online Transfer' },
      { id: 'demo-t5', amount: 1000, type: 'gave', remark: 'Grocery shopping share', date: '2026-08-18', mode: 'Cash' },
      { id: 'demo-t6', amount: 500, type: 'gave', remark: 'Partial repayment — UPI', date: '2026-09-20', mode: 'Online Transfer' },
    ],
  },
  {
    id: 'demo-c3',
    name: 'Amit Verma',
    phone: '+91 76543 21098',
    email: 'amit.verma@example.com',
    createdAt: '2026-07-20T15:45:00.000Z',
    transactions: [
      { id: 'demo-t7', amount: 5000, type: 'gave', remark: 'Advance loan for bike repair', date: '2026-08-01', mode: 'Online Transfer' },
      { id: 'demo-t8', amount: 5000, type: 'got', remark: '🤝 Full Settlement', date: '2026-09-14', mode: 'Online Transfer' },
    ],
  },
  {
    id: 'demo-c4',
    name: 'Rohan Gupta',
    phone: '+91 91234 56789',
    email: 'rohan.g@example.com',
    createdAt: '2026-08-01T11:20:00.000Z',
    transactions: [
      { id: 'demo-t9', amount: 1200, type: 'got', remark: 'Concert ticket booking', date: '2026-09-16', mode: 'Online Transfer' },
    ],
  },
  {
    id: 'demo-c5',
    name: 'Sneha Iyer',
    phone: '+91 99887 76655',
    email: 'sneha.iyer@example.com',
    createdAt: '2026-08-12T08:00:00.000Z',
    transactions: [
      { id: 'demo-t10', amount: 2500, type: 'gave', remark: 'College project print & binding', date: '2026-09-01', mode: 'Cash' },
      { id: 'demo-t11', amount: 750, type: 'got', remark: 'Partial return via GPay', date: '2026-09-22', mode: 'Online Transfer' },
    ],
  },
  {
    id: 'demo-c6',
    name: 'Local Kirana Store',
    phone: '+91 98111 22334',
    email: '',
    createdAt: '2026-06-01T10:00:00.000Z',
    transactions: [
      { id: 'demo-t12', amount: 840, type: 'got', remark: 'Monthly ration on udhar', date: '2026-09-03', mode: 'Cash' },
      { id: 'demo-t13', amount: 320, type: 'got', remark: 'Milk & bread — week 2', date: '2026-09-10', mode: 'Cash' },
      { id: 'demo-t14', amount: 1160, type: 'gave', remark: 'Cleared shop khata', date: '2026-09-28', mode: 'Cash' },
    ],
  },
  {
    id: 'demo-c7',
    name: 'Meera Kapoor',
    phone: '+91 90001 11222',
    email: 'meera.k@example.com',
    createdAt: '2026-09-01T14:00:00.000Z',
    transactions: [
      { id: 'demo-t15', amount: 4500, type: 'gave', remark: 'Emergency medical help', date: '2026-09-08', mode: 'Online Transfer' },
    ],
  },
];

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    recoveryPin: String,
    securityAnswer: String,
  },
  { timestamps: true }
);

const TransactionSchema = new mongoose.Schema({
  id: String,
  amount: Number,
  type: String,
  remark: String,
  date: String,
  mode: String,
});

const ContactSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    phone: String,
    email: String,
    transactions: [TransactionSchema],
    createdAt: String,
  },
  { timestamps: true }
);

async function main() {
  loadEnvLocal();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set in .env.local');

  await mongoose.connect(uri);
  const User = mongoose.models.User || mongoose.model('User', UserSchema);
  const Contact = mongoose.models.Contact || mongoose.model('Contact', ContactSchema);

  const email = DEMO.email.toLowerCase();
  let user = await User.findOne({ email });

  if (user) {
    user.name = DEMO.name;
    user.password = hashPassword(DEMO.password);
    user.recoveryPin = hashPassword(DEMO.recoveryPin);
    user.securityAnswer = hashPassword(DEMO.securityAnswer.toLowerCase().trim());
    await user.save();
    console.log('Updated existing demo user:', email);
  } else {
    user = await User.create({
      name: DEMO.name,
      email,
      password: hashPassword(DEMO.password),
      recoveryPin: hashPassword(DEMO.recoveryPin),
      securityAnswer: hashPassword(DEMO.securityAnswer.toLowerCase().trim()),
    });
    console.log('Created demo user:', email);
  }

  await Contact.deleteMany({ userId: user._id });
  // Also clear any leftover contacts that used these demo ids
  await Contact.deleteMany({ id: { $in: DEMO_CONTACTS.map((c) => c.id) } });

  await Contact.insertMany(
    DEMO_CONTACTS.map((c) => ({
      ...c,
      userId: user._id,
    }))
  );

  const txCount = DEMO_CONTACTS.reduce((n, c) => n + c.transactions.length, 0);
  console.log(`Seeded ${DEMO_CONTACTS.length} contacts and ${txCount} transactions.`);
  console.log('');
  console.log('══════════════════════════════════════');
  console.log('  DEMO LOGIN (for teacher presentation)');
  console.log('══════════════════════════════════════');
  console.log(`  Email:            ${DEMO.email}`);
  console.log(`  Password:         ${DEMO.password}`);
  console.log(`  Recovery PIN:     ${DEMO.recoveryPin}`);
  console.log(`  Security answer:  ${DEMO.securityAnswer}`);
  console.log('══════════════════════════════════════');

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Seed failed:', err.message || err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
