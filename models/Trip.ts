import mongoose, { Schema, Document } from 'mongoose';

const ExpensePayerSchema = new Schema(
  {
    participantId: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const ExpenseSplitSchema = new Schema(
  {
    participantId: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const TripExpenseSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ['food', 'stay', 'transport', 'activities', 'shopping', 'drinks', 'general'],
      default: 'food',
    },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    paidBy: { type: [ExpensePayerSchema], required: true },
    splitType: { type: String, enum: ['equal', 'custom'], default: 'equal' },
    splitAmong: { type: [ExpenseSplitSchema], default: [] },
    notes: { type: String, default: '' },
    createdAt: { type: String, required: true },
  },
  { _id: false }
);

const TripParticipantSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    isCurrentUser: { type: Boolean, default: false },
    contactId: { type: String, required: false },
    phone: { type: String, required: false },
    avatarColor: { type: String, required: false },
  },
  { _id: false }
);

const SettlementPaymentSchema = new Schema(
  {
    id: { type: String, required: true },
    amount: { type: Number, required: true },
    paidAt: { type: String, required: true },
    paidBy: { type: String, required: false },
    paymentMethod: { type: String, required: false },
    note: { type: String, required: false },
  },
  { _id: false }
);

const TripSettlementSchema = new Schema(
  {
    id: { type: String, required: true },
    fromId: { type: String, required: true },
    fromName: { type: String, required: true },
    toId: { type: String, required: true },
    toName: { type: String, required: true },
    amount: { type: Number, required: true },
    fromContactId: { type: String, required: false },
    toContactId: { type: String, required: false },
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, required: false },
    isSettled: { type: Boolean, default: false },
    isPartial: { type: Boolean, default: false },
    payments: { type: [SettlementPaymentSchema], default: [] },
    settledAt: { type: String, required: false },
    settledBy: { type: String, required: false },
    paymentMethod: { type: String, required: false },
    note: { type: String, required: false },
  },
  { _id: false }
);

const TripSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    destination: { type: String, default: '' },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    currency: { type: String, default: '₹' },
    participants: { type: [TripParticipantSchema], required: true },
    expenses: { type: [TripExpenseSchema], default: [] },
    settlements: { type: [TripSettlementSchema], default: [] },
    shareToken: { type: String, required: false, unique: true, sparse: true },
    status: {
      type: String,
      enum: ['active', 'settled', 'archived'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

TripSchema.index({ userId: 1 });
TripSchema.index({ shareToken: 1 });

export interface ITripDoc extends Document {
  id: string;
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  currency: string;
  participants: any[];
  expenses: any[];
  settlements?: any[];
  shareToken?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

if (process.env.NODE_ENV !== 'production' && mongoose.models.Trip) {
  delete mongoose.models.Trip;
}
const Trip = mongoose.models.Trip || mongoose.model<ITripDoc>('Trip', TripSchema);

export default Trip;

