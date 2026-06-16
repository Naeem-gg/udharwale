import mongoose, { Schema, Document } from 'mongoose';

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  recoveryPin: { type: String, required: true },
  securityAnswer: { type: String, required: true }
}, {
  timestamps: true
});

export interface IUserDoc extends Document {
  name: string;
  email: string;
  password: string;
  recoveryPin: string;
  securityAnswer: string;
  createdAt?: string;
  updatedAt?: string;
}

const User = mongoose.models.User || mongoose.model<IUserDoc>('User', UserSchema);

export default User;
