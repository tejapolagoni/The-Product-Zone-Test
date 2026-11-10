import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  nameKey: { type: String, required: true, unique: true, lowercase: true, trim: true },
  image: { type: String, default: '', maxlength: 2048 },
  note: { type: String, default: '', maxlength: 120 },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

categorySchema.index({ name: 1 });

export default mongoose.model('Category', categorySchema);
