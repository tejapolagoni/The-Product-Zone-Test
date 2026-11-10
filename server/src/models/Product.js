import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  productName: { type: String, required: true, trim: true, maxlength: 160 },
  brand: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, required: true, trim: true, maxlength: 4000 },
  features: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  price: { type: Number, min: 0 },
  image: { type: String, required: true, trim: true, maxlength: 2048 },
  images: { type: [String], default: [] },
  amazonAffiliateUrl: { type: String, required: true, maxlength: 2048 },
  isFeatured: { type: Boolean, default: false },
  isTrending: { type: Boolean, default: false },
  isRecommended: { type: Boolean, default: false },
  isVisible: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false, versionKey: false });

productSchema.index({ isVisible: 1, createdAt: -1 });
productSchema.index({ category: 1, brand: 1, isFeatured: 1 });

export default mongoose.model('Product', productSchema);
