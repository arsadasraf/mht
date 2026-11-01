import { prisma } from '../../../config/db.config.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const { module, action, search, page = 1, limit = 50 } = req.query;

    const where = {};
    if (module) where.module = module;
    if (action) where.action = action;
    if (search) {
      where.OR = [
        { performedByName: { contains: search, mode: 'insensitive' } },
        { performedByEmail: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } }
      ];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 50);

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      })
    ]);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      logs
    });
  } catch (error) {
    next(error);
  }
};
