import mongoose, { Schema, Document } from 'mongoose';

// Define transaction subdocument schema
const TransactionSchema = new Schema({
  id: { type: String, required: true }, // Client-generated unique ID to maintain sync with frontend
  amount: { type: Number, required: true },
  type: { type: String, enum: ['gave', 'got'], required: true },
  remark: { type: String, required: true },
  date: { type: String, required: true }, // User-selected event date (YYYY-MM-DD)
  createdAt: { type: String, required: false }, // System logged time when the record was created (ISO)
  mode: {
    type: String,
    enum: ['Cash', 'Online Transfer'],
    required: true
  }
});

// Define contact schema
const ContactSchema = new Schema({
  id: { type: String, required: true, unique: true }, // Map to client id
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Associated user
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  shareToken: { type: String, required: false, unique: true, sparse: true }, // Public read-only chat link
  transactions: [TransactionSchema],
  createdAt: { type: String, required: true }
}, {
  timestamps: true
});

// Define interface for types
export interface ITransactionSub extends Document {
  id: string;
  amount: number;
  type: 'gave' | 'got';
  remark: string;
  date: string;
  createdAt?: string;
  mode: string;
}

export interface IContactDoc extends Document {
  id: string;
  userId: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  shareToken?: string;
  transactions: ITransactionSub[];
  createdAt: string;
}

// Compile model or fetch existing to prevent compilation duplication errors on Dev reload
if (process.env.NODE_ENV !== 'production' && mongoose.models.Contact) {
  delete mongoose.models.Contact;
}
const Contact = mongoose.models.Contact || mongoose.model<IContactDoc>('Contact', ContactSchema);

export default Contact;
