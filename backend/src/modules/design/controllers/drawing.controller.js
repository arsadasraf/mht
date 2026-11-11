import { prisma } from '../../../config/db.config.js';
import { getPresignedDownloadUrl } from '../../../config/s3.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

const formatDrawing = (d) => ({
  ...d,
  _id: d.id
});

export const getDrawings = async (req, res, next) => {
  try {
    const { projectId, category, search } = req.query;
    const where = {};
    if (projectId) where.projectId = String(projectId).toUpperCase();
    if (category) where.category = String(category);
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { drawingNumber: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } }
      ];
    }

    const drawings = await prisma.drawing.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: drawings.length,
      drawings: drawings.map(formatDrawing)
    });
  } catch (error) {
    next(error);
  }
};

export const getDrawingViewUrl = async (req, res, next) => {
  try {
    const { id } = req.params;
    const drawing = await prisma.drawing.findUnique({ where: { id } });

    if (!drawing) {
      return res.status(404).json({ success: false, message: 'Drawing not found.' });
    }

    const watermarkText = `CONFIDENTIAL - MACHINE HOUSE - USER: ${req.user?.email || 'ENGINEER'} - PRJ: ${drawing.projectId} - ${new Date().toISOString()}`;
    const viewUrl = await getPresignedDownloadUrl(drawing.fileKey, 900);

    await logAuditEvent({
      req,
      action: 'DRAWING_VIEWED',
      module: 'design',
      entityId: drawing.id,
      entityType: 'Drawing',
      notes: `User viewed drawing ${drawing.drawingNumber} (${drawing.title}) with dynamic watermark.`
    });

    res.status(200).json({
      success: true,
      drawing: formatDrawing(drawing),
      viewUrl,
      watermarkText,
      expiresInSeconds: 900
    });
  } catch (error) {
    next(error);
  }
};

export const registerDrawing = async (req, res, next) => {
  try {
    const {
      projectId,
      drawingNumber,
      title,
      revision = 'v1',
      category = '2D_SHOP_DRAWING',
      fileKey = '',
      fileName = '',
      mimeType = 'application/pdf',
      fileSizeBytes = 0
    } = req.body;

    if (!projectId || !drawingNumber || !title) {
      return res.status(400).json({
        success: false,
        message: 'Project ID, Drawing Number, and Title are required.'
      });
    }

    const actorName = getActorName(req.user);
    const cleanPrj = String(projectId).toUpperCase().trim();

    const drawing = await prisma.drawing.create({
      data: {
        projectId: cleanPrj,
        drawingNumber: String(drawingNumber).toUpperCase().trim(),
        title: String(title).trim(),
        revision,
        category,
        fileKey: fileKey || `drawings/${cleanPrj}/${drawingNumber}_${revision}.pdf`,
        fileName: fileName || `${drawingNumber}_${revision}.pdf`,
        mimeType,
        fileSizeBytes: Number(fileSizeBytes) || 245000,
        uploadedById: req.user?.id || null,
        uploadedByName: actorName,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'DRAWING_REGISTERED',
      module: 'design',
      entityId: drawing.id,
      entityType: 'Drawing',
      notes: `Drawing ${drawing.drawingNumber} (${drawing.revision}) registered for project ${cleanPrj}`
    });

    res.status(201).json({
      success: true,
      message: 'All set! Drawing registered.',
      drawing: formatDrawing(drawing)
    });
  } catch (error) {
    next(error);
  }
};
