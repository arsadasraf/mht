import { Drawing } from '../models/drawing.model.js';
import { getPresignedDownloadUrl, getPresignedUploadUrl } from '../../../config/s3.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

export const getDrawings = async (req, res, next) => {
  try {
    const { projectId, category, search } = req.query;
    const query = {};
    if (projectId) query.projectId = projectId.toUpperCase();
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { drawingNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }

    const drawings = await Drawing.find(query)
      .populate('uploadedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: drawings.length, drawings });
  } catch (error) {
    next(error);
  }
};

export const getDrawingViewUrl = async (req, res, next) => {
  try {
    const { id } = req.params;
    const drawing = await Drawing.findById(id);

    if (!drawing) {
      return res.status(404).json({ success: false, message: 'Drawing not found.' });
    }

    // Dynamic watermark payload for browser rendering
    const watermarkText = `CONFIDENTIAL - MACHINE HOUSE - USER: ${req.user.email} - PRJ: ${drawing.projectId} - ${new Date().toISOString()}`;

    // Generate secure short-lived presigned URL (15 mins)
    const viewUrl = await getPresignedDownloadUrl(drawing.fileKey, 900);

    await logAuditEvent({
      req,
      action: 'DRAWING_VIEWED',
      module: 'design',
      entityId: drawing._id,
      entityType: 'Drawing',
      notes: `User viewed drawing ${drawing.drawingNumber} (${drawing.title}) with dynamic watermark.`
    });

    res.status(200).json({
      success: true,
      drawing,
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
    const { projectId, drawingNumber, title, revision = 'R0', category, fileKey, fileName, mimeType, fileSizeBytes } = req.body;

    const drawing = new Drawing({
      projectId: projectId.toUpperCase(),
      drawingNumber,
      title,
      revision,
      category,
      fileKey,
      fileName,
      mimeType,
      fileSizeBytes,
      uploadedBy: req.user?._id,
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    await drawing.save();

    await logAuditEvent({
      req,
      action: 'DRAWING_REGISTERED',
      module: 'design',
      entityId: drawing._id,
      entityType: 'Drawing',
      notes: `Drawing ${drawingNumber} registered for project ${projectId}`
    });

    res.status(201).json({ success: true, message: 'Drawing registered successfully.', drawing });
  } catch (error) {
    next(error);
  }
};
