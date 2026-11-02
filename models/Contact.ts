import mongoose, { Schema, Document } from 'mongoose';

const TxHistorySchema = new Schema({
  at: { type: String, required: true },
  byUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: {
    type: String,
    enum: ['create', 'update', 'delete', 'restore'],
    required: true,
  },
  before: { type: Schema.Types.Mixed },
  after: { type: Schema.Types.Mixed },
}, { _id: false });

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
  },
  createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  updatedAt: { type: String, required: false },
  deletedAt: { type: String, required: false, default: null },
  deletedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  history: { type: [TxHistorySchema], default: [] },
});

// Define contact schema
const ContactSchema = new Schema({
  id: { type: String, required: true, unique: true }, // Map to client id
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Owner
  peerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: false }, // Linked counterpart
  peerLinkedAt: { type: Date, required: false },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  shareToken: { type: String, required: false, unique: true, sparse: true }, // Public read-only chat link
  transactions: [TransactionSchema],
  createdAt: { type: String, required: true }
}, {
  timestamps: true
});

ContactSchema.index({ peerUserId: 1 });
ContactSchema.index({ phone: 1 });
ContactSchema.index({ email: 1 });

// Define interface for types
export interface ITxHistoryEntry {
  at: string;
  byUserId: mongoose.Types.ObjectId;
  action: 'create' | 'update' | 'delete' | 'restore';
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface ITransactionSub extends Document {
  id: string;
  amount: number;
  type: 'gave' | 'got';
  remark: string;
  date: string;
  createdAt?: string;
  mode: string;
  createdByUserId?: mongoose.Types.ObjectId;
  updatedByUserId?: mongoose.Types.ObjectId;
  updatedAt?: string;
  deletedAt?: string | null;
  deletedByUserId?: mongoose.Types.ObjectId;
  history: ITxHistoryEntry[];
}

export interface IContactDoc extends Document {
  id: string;
  userId: mongoose.Types.ObjectId;
  peerUserId?: mongoose.Types.ObjectId;
  peerLinkedAt?: Date;
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
