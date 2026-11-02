import mongoose, { Schema, Document } from 'mongoose';

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  recoveryPin: { type: String, required: true },
  securityAnswer: { type: String, required: true }
}, {
  timestamps: true
});

UserSchema.index({ phone: 1 });

export interface IUserDoc extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  recoveryPin: string;
  securityAnswer: string;
  createdAt?: string;
  updatedAt?: string;
}

if (process.env.NODE_ENV !== 'production' && mongoose.models.User) {
  delete mongoose.models.User;
}
const User = mongoose.models.User || mongoose.model<IUserDoc>('User', UserSchema);

export default User;
