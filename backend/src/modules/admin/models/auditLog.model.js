import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true
    },
    module: {
      type: String,
      required: true,
      trim: true
    },
    entityId: {
      type: String,
      trim: true
    },
    entityType: {
      type: String,
      trim: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    performedByName: {
      type: String,
      default: 'System'
    },
    performedByEmail: {
      type: String
    },
    role: {
      type: String
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1'
    },
    userAgent: {
      type: String
    },
    beforeDataSnapshot: {
      type: mongoose.Schema.Types.Mixed
    },
    afterDataSnapshot: {
      type: mongoose.Schema.Types.Mixed
    },
    notes: {
      type: String
    },
    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true
    }
  },
  {
    timestamps: false
  }
);

// Prevent updating or deleting audit logs (ISO compliance: Write-Only / Append-Only)
AuditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'findByIdAndDelete'], function (next) {
  next(new Error('Security Block: Audit logs are immutable and cannot be updated or deleted.'));
});

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
