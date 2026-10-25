import { AuditLog } from '../models/auditLog.model.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const { module, action, search, page = 1, limit = 50 } = req.query;

    const query = {};
    if (module) query.module = module;
    if (action) query.action = action;
    if (search) {
      query.$or = [
        { performedByName: { $regex: search, $options: 'i' } },
        { performedByEmail: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { entityId: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      logs
    });
  } catch (error) {
    next(error);
  }
};
