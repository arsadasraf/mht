import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      select: false
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: true
    },
    department: {
      type: String,
      required: true,
      trim: true,
      enum: [
        'ADMIN',
        'MARKETING_SALES',
        'PROJECT_SETUP',
        'DESIGN_ENGINEERING',
        'PURCHASE_PROCUREMENT',
        'INCOMING_QUALITY',
        'STORES_WAREHOUSE',
        'PRODUCTION_ASSEMBLY',
        'DISPATCH_LOGISTICS',
        'AFTER_SALES'
      ]
    },
    plantLocation: {
      type: String,
      default: 'Main Works - Unit 1 (Bengaluru)',
      trim: true
    },
    // Authentication Mode (Google OAuth vs Password vs Dual)
    authMethod: {
      type: String,
      enum: ['GOOGLE_ONLY', 'PASSWORD_ONLY', 'BOTH'],
      default: 'BOTH',
      required: true
    },
    // Real-time Presence & Usage Tracking
    isOnline: {
      type: Boolean,
      default: false
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
    },
    currentActiveTab: {
      type: String,
      default: '/crm/dashboard',
      trim: true
    },
    totalUsageMinutes: {
      type: Number,
      default: 0
    },
    // Login History (Last 10 Logins for Instant Inspection)
    loginHistory: [
      {
        loginAt: { type: Date, default: Date.now },
        ipAddress: { type: String, trim: true },
        userAgent: { type: String, trim: true },
        deviceType: { type: String, enum: ['Desktop', 'Tablet', 'Mobile', 'Unknown'], default: 'Desktop' },
        authMethodUsed: { type: String, enum: ['GOOGLE_SSO', 'EMAIL_PASSWORD'], default: 'EMAIL_PASSWORD' },
        status: { type: String, enum: ['SUCCESS', 'FAILED', 'BLOCKED_IP'], default: 'SUCCESS' },
        sessionDurationMinutes: { type: Number, default: 0 }
      }
    ],
    // Admin-controlled Refresh Token Expiry
    refreshTokenExpiry: {
      type: String,
      default: '7d', // e.g. '8h', '24h', '7d', '14d', '30d'
      required: true
    },
    // Non-deletable status
    isActive: {
      type: Boolean,
      default: true
    },
    isSuperAdmin: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'DEACTIVATED'],
      default: 'ACTIVE'
    },
    deactivatedAt: {
      type: Date
    },
    deactivatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    // Plant / Office IP restrictions
    isIpRestricted: {
      type: Boolean,
      default: false
    },
    whitelistedIps: [
      {
        type: String,
        trim: true
      }
    ],
    // Custom Allowed Routes Overrides (if any)
    allowedRoutes: [
      {
        type: String,
        trim: true
      }
    ],
    lastLoginAt: {
      type: Date
    },
    currentRefreshToken: {
      type: String,
      select: false
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

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to verify password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Strict rule: Prevent hard deletion from DB
UserSchema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete', 'findByIdAndDelete'], function (next) {
  const error = new Error('Strict System Rule Violation: User accounts cannot be deleted. Deactivate account instead.');
  next(error);
});

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
