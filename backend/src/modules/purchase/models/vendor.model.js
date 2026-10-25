import mongoose from 'mongoose';

const VendorSchema = new mongoose.Schema(
  {
    vendorCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    contactPerson: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['RAW_MATERIAL', 'ELECTRICAL_COMPONENTS', 'PNEUMATICS_HYDRAULICS', 'FASTENERS_BEARINGS', 'MACHINED_PARTS', 'SURFACE_TREATMENT'],
      required: true
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 4.5
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true
    },
    paymentTermsDays: {
      type: Number,
      default: 30
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

export const Vendor = mongoose.model('Vendor', VendorSchema);
