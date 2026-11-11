import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

const getActorName = (user) => {
  if (!user) return 'Design Lead';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'Design Lead';
};

/**
 * SECTION 1: Design Engineer Performance Reports
 * Aggregates workload, hours, pending/completed tasks, and ranking per engineer.
 */
export const getEngineerPerformance = async (req, res, next) => {
  try {
    const { projectId, engineerId, month } = req.query;

    const where = { departmentModule: 'design' };
    if (projectId) where.projectId = String(projectId).toUpperCase();
    if (engineerId) where.assignedToUserId = String(engineerId);

    const stages = await prisma.projectSubStage.findMany({
      where,
      orderBy: { baselineStartDate: 'desc' }
    });

    // Also get all registered users with Design roles or assigned to tasks
    const allUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: { select: { id: true, name: true } }
      }
    });

    const designUsers = allUsers.filter(
      (u) =>
        u.role?.name?.toLowerCase().includes('design') ||
        stages.some((s) => s.assignedToUserId === u.id)
    );

    // Group performance metrics per engineer
    const engineerMap = new Map();

    designUsers.forEach((u) => {
      const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
      engineerMap.set(u.id, {
        engineerId: u.id,
        engineerName: name,
        engineerEmail: u.email,
        role: u.role?.name || 'Design Engineer',
        tasksAssigned: 0,
        tasksCompleted: 0,
        tasksPending: 0,
        onTimeCount: 0,
        allottedHours: 0,
        actualHours: 0,
        efficiencyPercent: 100,
        onTimeRate: 100
      });
    });

    // Process sub-stages
    stages.forEach((stage) => {
      const uId = stage.assignedToUserId;
      if (!uId) return;

      if (!engineerMap.has(uId)) {
        engineerMap.set(uId, {
          engineerId: uId,
          engineerName: stage.assignedToUserName || stage.assignedToUserEmail || 'Engineer',
          engineerEmail: stage.assignedToUserEmail || '',
          role: 'Design Engineer',
          tasksAssigned: 0,
          tasksCompleted: 0,
          tasksPending: 0,
          onTimeCount: 0,
          allottedHours: 0,
          actualHours: 0,
          efficiencyPercent: 100,
          onTimeRate: 100
        });
      }

      const eng = engineerMap.get(uId);
      eng.tasksAssigned += 1;
      eng.allottedHours += stage.estimatedHours || 0;
      eng.actualHours += stage.actualHours || 0;

      const isCompleted = stage.status === 'COMPLETED';
      if (isCompleted) {
        eng.tasksCompleted += 1;
        const targetTs = new Date(stage.targetEndDate).getTime();
        const actualTs = stage.actualCompletionDate
          ? new Date(stage.actualCompletionDate).getTime()
          : Date.now();
        if (actualTs <= targetTs) {
          eng.onTimeCount += 1;
        }
      } else {
        eng.tasksPending += 1;
      }
    });

    // Finalize rates & rankings
    const engineers = Array.from(engineerMap.values()).map((eng) => {
      const onTimeRate =
        eng.tasksCompleted > 0
          ? Math.round((eng.onTimeCount / eng.tasksCompleted) * 100)
          : 100;
      const efficiencyPercent =
        eng.actualHours > 0
          ? Math.round((eng.allottedHours / eng.actualHours) * 100)
          : eng.allottedHours > 0
          ? 100
          : 100;

      return {
        ...eng,
        onTimeRate,
        efficiencyPercent
      };
    });

    // Sort by velocity and on-time rate for ranking
    const rankings = [...engineers]
      .sort((a, b) => {
        if (b.tasksCompleted !== a.tasksCompleted) {
          return b.tasksCompleted - a.tasksCompleted;
        }
        return b.onTimeRate - a.onTimeRate;
      })
      .map((eng, idx) => ({
        ...eng,
        rank: idx + 1
      }));

    // Work allocations list
    const allocations = stages.map((s) => ({
      id: s.id,
      _id: s.id,
      projectId: s.projectId,
      subStageCode: s.subStageCode,
      title: s.title,
      assignedToUserId: s.assignedToUserId,
      assignedToUserName: s.assignedToUserName,
      assignedToUserEmail: s.assignedToUserEmail,
      baselineStartDate: s.baselineStartDate,
      targetEndDate: s.targetEndDate,
      actualCompletionDate: s.actualCompletionDate,
      status: s.status,
      priority: s.priority || 'MEDIUM',
      estimatedHours: s.estimatedHours || 0,
      actualHours: s.actualHours || 0,
      completionPercent: s.completionPercent || 0,
      createdByName: s.createdByName,
      updatedByName: s.updatedByName,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));

    // Pending vs Completed tasks
    const pendingTasks = allocations.filter((a) => a.status !== 'COMPLETED');
    const completedTasks = allocations.filter((a) => a.status === 'COMPLETED');

    // Monthly activities aggregation
    const monthlyMap = new Map();
    stages.forEach((s) => {
      const date = new Date(s.baselineStartDate || s.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          monthKey: key,
          monthLabel: date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
          tasksAllocated: 0,
          tasksCompleted: 0,
          totalAllottedHours: 0,
          totalActualHours: 0
        });
      }
      const m = monthlyMap.get(key);
      m.tasksAllocated += 1;
      m.totalAllottedHours += s.estimatedHours || 0;
      m.totalActualHours += s.actualHours || 0;
      if (s.status === 'COMPLETED') {
        m.tasksCompleted += 1;
      }
    });

    const monthlyReports = Array.from(monthlyMap.values()).sort((a, b) =>
      b.monthKey.localeCompare(a.monthKey)
    );

    res.status(200).json({
      success: true,
      count: stages.length,
      engineers,
      rankings,
      allocations,
      pendingTasks,
      completedTasks,
      monthlyReports
    });
  } catch (error) {
    next(error);
  }
};

/**
 * SECTION 2: Mechanical Design Activity Reports
 * Tracks 3D Modelling, 2D Drawings, Approvals, Releases, Modifications, DCRs, and ECNs.
 */
export const getActivityReports = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const where = {};
    if (projectId) where.projectId = String(projectId).toUpperCase();

    const [drawings, ecos, subStages, revisions] = await Promise.all([
      prisma.drawing.findMany({ where, orderBy: { createdAt: 'desc' } }),
      prisma.eco.findMany({ where, orderBy: { createdAt: 'desc' } }),
      prisma.projectSubStage.findMany({
        where: { departmentModule: 'design', ...(projectId ? { projectId: String(projectId).toUpperCase() } : {}) },
        orderBy: { baselineStartDate: 'desc' }
      }),
      prisma.drawingRevision.findMany({ orderBy: { createdAt: 'desc' } })
    ]);

    // 1. 3D Modelling Status
    const modellingDrawings = drawings.filter(
      (d) => d.category === '3D_STEP_MODEL' || d.title.toLowerCase().includes('3d')
    );
    const modellingStages = subStages.filter(
      (s) =>
        s.subStageCode.toLowerCase().includes('3d') ||
        s.title.toLowerCase().includes('3d') ||
        s.title.toLowerCase().includes('model')
    );

    const modellingStatus = [
      ...modellingDrawings.map((d) => ({
        id: d.id,
        _id: d.id,
        type: 'DRAWING_3D',
        projectId: d.projectId,
        code: d.drawingNumber,
        title: d.title,
        assignedTo: d.createdByName || 'Design Engineer',
        progress: d.modellingProgress || (d.status === 'RELEASED' ? 100 : d.status === 'APPROVED' ? 90 : 50),
        status: d.status,
        targetDate: d.createdAt,
        fileUrl: d.fileUrl,
        updatedAt: d.updatedAt
      })),
      ...modellingStages.map((s) => ({
        id: s.id,
        _id: s.id,
        type: 'SUB_STAGE',
        projectId: s.projectId,
        code: s.subStageCode,
        title: s.title,
        assignedTo: s.assignedToUserName || 'Design Engineer',
        progress: s.completionPercent || (s.status === 'COMPLETED' ? 100 : 40),
        status: s.status,
        targetDate: s.targetEndDate,
        fileUrl: '',
        updatedAt: s.updatedAt
      }))
    ];

    // 2. 2D Drawing Status
    const draftingStatus = drawings
      .filter((d) => d.category === '2D_MANUFACTURING' || d.category === 'GA_LAYOUT')
      .map((d) => ({
        id: d.id,
        _id: d.id,
        projectId: d.projectId,
        drawingNumber: d.drawingNumber,
        title: d.title,
        category: d.category,
        revision: d.revision,
        versionNumber: d.versionNumber,
        draftsman: d.createdByName || 'Design Draftsman',
        draftingProgress: d.draftingProgress || (d.status === 'RELEASED' ? 100 : d.status === 'APPROVED' ? 95 : 60),
        status: d.status,
        isReleased: d.isReleased,
        targetDate: d.createdAt,
        fileUrl: d.fileUrl,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt
      }));

    // 3. Design Modification Report
    const modifications = revisions.map((r) => ({
      id: r.id,
      _id: r.id,
      drawingNumber: r.drawingNumber,
      title: r.title,
      revision: r.revision,
      changeSummary: r.changeSummary || 'Design optimization and tolerance update',
      ecoNumber: r.ecoNumber || 'ECO-REF',
      dcrNumber: r.dcrNumber || '',
      modifiedBy: r.revisedByName || 'Design Engineer',
      reviewerName: r.reviewerName || 'Lead Engineer',
      fileUrl: r.fileUrl,
      createdAt: r.createdAt
    }));

    // 4. Design Approval Status
    const approvalPipeline = drawings.map((d) => ({
      id: d.id,
      _id: d.id,
      projectId: d.projectId,
      drawingNumber: d.drawingNumber,
      title: d.title,
      category: d.category,
      revision: d.revision,
      submittedBy: d.createdByName || 'Design Engineer',
      approverName: d.updatedByName || 'Chief Design Engineer',
      status: d.status === 'APPROVED' || d.status === 'RELEASED' ? 'APPROVED' : d.status === 'REJECTED' ? 'REJECTED' : 'PENDING',
      approvalNotes: d.status === 'APPROVED' ? 'Approved for manufacturing tolerance' : d.status === 'REJECTED' ? 'Revise dimension clearances' : 'Pending Lead Review',
      submittedAt: d.createdAt,
      updatedAt: d.updatedAt
    }));

    // 5. Drawing Release Register
    const releasedDrawings = drawings
      .filter((d) => d.isReleased || d.status === 'RELEASED')
      .map((d) => ({
        id: d.id,
        _id: d.id,
        projectId: d.projectId,
        drawingNumber: d.drawingNumber,
        title: d.title,
        revision: d.revision,
        category: d.category,
        releasedAt: d.releasedAt || d.updatedAt,
        releasedByName: d.releasedByName || d.updatedByName || 'Design Lead',
        distribution: 'Shopfloor, Purchase & Store',
        fileUrl: d.fileUrl,
        fileName: d.fileName
      }));

    // 6. Drawing Pending Report
    const pendingDrawings = drawings
      .filter((d) => !d.isReleased && d.status !== 'RELEASED')
      .map((d) => {
        const daysOpen = Math.max(
          1,
          Math.round((Date.now() - new Date(d.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        );
        return {
          id: d.id,
          _id: d.id,
          projectId: d.projectId,
          drawingNumber: d.drawingNumber,
          title: d.title,
          category: d.category,
          status: d.status,
          responsibleEngineer: d.createdByName || 'Design Engineer',
          daysOpen,
          isOverdue: daysOpen > 7,
          createdAt: d.createdAt
        };
      });

    // 7. Design Change Request (DCR)
    const dcrs = ecos.map((eco) => ({
      id: eco.id,
      _id: eco.id,
      dcrNumber: `DCR-${eco.ecoNumber.replace(/[^0-9]/g, '') || '001'}`,
      ecoNumber: eco.ecoNumber,
      projectId: eco.projectId,
      title: eco.title,
      reasonForChange: eco.reasonForChange,
      changeType: eco.changeType,
      affectedItemCodes: eco.affectedItemCodes,
      originator: eco.createdByName || 'Plant Engineer',
      severity: eco.freezeActionTaken ? 'CRITICAL' : 'STANDARD',
      status: eco.status,
      approvedByName: eco.approvedByName,
      approvedAt: eco.approvedAt,
      createdAt: eco.createdAt
    }));

    // 8. Engineering Change Notice (ECN)
    const ecns = ecos
      .filter((eco) => eco.status === 'APPROVED_FREEZE' || eco.freezeActionTaken)
      .map((eco) => ({
        id: eco.id,
        _id: eco.id,
        ecnNumber: `ECN-${eco.ecoNumber.replace(/[^0-9]/g, '') || '001'}`,
        ecoNumber: eco.ecoNumber,
        projectId: eco.projectId,
        title: eco.title,
        reason: eco.reasonForChange,
        authorizedBy: eco.approvedByName || 'Engineering Head',
        effectiveDate: eco.approvedAt || eco.updatedAt,
        affectedItemsCount: eco.affectedItemCodes.length,
        status: 'ISSUED_TO_SHOPFLOOR'
      }));

    res.status(200).json({
      success: true,
      modellingStatus,
      draftingStatus,
      modifications,
      approvalPipeline,
      releasedDrawings,
      pendingDrawings,
      dcrs,
      ecns
    });
  } catch (error) {
    next(error);
  }
};

/**
 * SECTION 3: Drawing & Document Control Reports
 * Comprehensive master drawing register and revision history.
 */
export const getDocumentControl = async (req, res, next) => {
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

    const [drawings, revisions] = await Promise.all([
      prisma.drawing.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.drawingRevision.findMany({
        orderBy: { createdAt: 'desc' }
      })
    ]);

    res.status(200).json({
      success: true,
      count: drawings.length,
      drawings: drawings.map((d) => ({ ...d, _id: d.id })),
      revisions: revisions.map((r) => ({ ...r, _id: r.id }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Quick Action: Formally Release Drawing to Shopfloor / Purchase
 */
export const releaseDrawing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorName = getActorName(req.user);

    const drawing = await prisma.drawing.findUnique({ where: { id } });
    if (!drawing) {
      return res.status(404).json({ success: false, message: 'Drawing not found.' });
    }

    const updated = await prisma.drawing.update({
      where: { id },
      data: {
        isReleased: true,
        status: 'RELEASED',
        releasedAt: new Date(),
        releasedByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: actorName,
      userRole: req.user?.role?.name || 'Design Lead',
      action: 'RELEASE_DRAWING',
      module: 'DESIGN',
      entityId: drawing.id,
      entityName: drawing.drawingNumber,
      details: { drawingNumber: drawing.drawingNumber, title: drawing.title, revision: drawing.revision }
    });

    res.status(200).json({
      success: true,
      message: 'All set! Drawing released to shopfloor successfully.',
      drawing: { ...updated, _id: updated.id }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Quick Action: Create Drawing Revision Record
 */
export const createDrawingRevision = async (req, res, next) => {
  try {
    const { drawingId, drawingNumber, title, revision, changeSummary, ecoNumber, dcrNumber, fileUrl, fileName, reviewerName } = req.body;
    const actorName = getActorName(req.user);

    if (!drawingNumber || !revision) {
      return res.status(400).json({ success: false, message: 'Drawing number and revision code are required.' });
    }

    const newRevision = await prisma.drawingRevision.create({
      data: {
        drawingId: drawingId || null,
        drawingNumber: String(drawingNumber).trim(),
        title: title || '',
        revision: String(revision).trim(),
        changeSummary: changeSummary || 'Engineering design adjustment',
        ecoNumber: ecoNumber || '',
        dcrNumber: dcrNumber || '',
        fileUrl: fileUrl || '',
        fileName: fileName || '',
        reviewerName: reviewerName || 'Chief Design Engineer',
        revisedById: req.user?.id || null,
        revisedByName: actorName,
        createdById: req.user?.id || null,
        createdByName: actorName
      }
    });

    // Update parent drawing's current revision if drawingId provided
    if (drawingId) {
      await prisma.drawing.update({
        where: { id: drawingId },
        data: {
          revision: String(revision).trim(),
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'All set! Drawing revision logged successfully.',
      revision: { ...newRevision, _id: newRevision.id }
    });
  } catch (error) {
    next(error);
  }
};

