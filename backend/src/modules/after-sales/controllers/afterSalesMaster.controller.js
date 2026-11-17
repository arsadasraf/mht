import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';
import { generateUniqueSequenceCode } from '../../../utils/sequenceGenerator.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

// ----------------------------------------------------
// AFTER SALES TEAM MEMBERS
// ----------------------------------------------------

export const getAfterSalesTeam = async (req, res, next) => {
  try {
    const { search, designation, department, includeInactive } = req.query;
    const where = {};

    if (includeInactive !== 'true') {
      where.isActive = true;
    }
    if (designation) {
      where.designation = String(designation);
    }
    if (department) {
      where.department = String(department);
    }
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { memberCode: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } },
        { designation: { contains: q, mode: 'insensitive' } },
        { skillSpecialty: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } }
      ];
    }

    const members = await prisma.afterSalesTeamMember.findMany({
      where,
      orderBy: [{ memberCode: 'asc' }, { fullName: 'asc' }]
    });

    res.status(200).json({
      success: true,
      count: members.length,
      members: members.map((m) => ({ ...m, _id: m.id }))
    });
  } catch (error) {
    next(error);
  }
};

export const createAfterSalesTeamMember = async (req, res, next) => {
  try {
    const actorName = getActorName(req.user);
    const {
      fullName,
      designation,
      email = '',
      phone = '',
      department = 'AFTER_SALES_SERVICE',
      skillSpecialty = 'Installation & Commissioning',
      notes = ''
    } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Team member full name is required.'
      });
    }
    if (!designation || !designation.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Designation is required.'
      });
    }

    // Auto-generate collision-free member code AST-TM-101
    let memberCode = req.body.memberCode ? String(req.body.memberCode).trim().toUpperCase() : '';
    if (!memberCode) {
      memberCode = await generateUniqueSequenceCode({
        model: 'afterSalesTeamMember',
        field: 'memberCode',
        prefix: 'AST-TM-',
        startSeq: 101,
        padLength: 3
      });
    } else {
      // Check pre-save duplicate
      const existing = await prisma.afterSalesTeamMember.findUnique({ where: { memberCode } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Team Member Code "${memberCode}" is already in use.`
        });
      }
    }

    const member = await prisma.afterSalesTeamMember.create({
      data: {
        memberCode,
        fullName: fullName.trim(),
        designation: designation.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        department: String(department).trim(),
        skillSpecialty: String(skillSpecialty).trim(),
        notes: notes.trim(),
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: actorName,
      userRole: req.user?.role?.name || 'User',
      action: 'CREATE_AFTER_SALES_TEAM_MEMBER',
      module: 'after-sales',
      targetId: member.id,
      details: { memberCode, fullName: member.fullName, designation: member.designation }
    });

    res.status(201).json({
      success: true,
      message: `All set! ${member.fullName} (${memberCode}) added to Field Service & Commissioning Team.`,
      member: { ...member, _id: member.id }
    });
  } catch (error) {
    next(error);
  }
};

export const updateAfterSalesTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorName = getActorName(req.user);

    const existing = await prisma.afterSalesTeamMember.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'After Sales team member not found.' });
    }

    const {
      fullName,
      designation,
      email,
      phone,
      department,
      skillSpecialty,
      isActive,
      notes
    } = req.body;

    const data = {
      ...(fullName !== undefined ? { fullName: fullName.trim() } : {}),
      ...(designation !== undefined ? { designation: designation.trim() } : {}),
      ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
      ...(phone !== undefined ? { phone: phone.trim() } : {}),
      ...(department !== undefined ? { department: String(department).trim() } : {}),
      ...(skillSpecialty !== undefined ? { skillSpecialty: String(skillSpecialty).trim() } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      ...(notes !== undefined ? { notes: notes.trim() } : {}),
      updatedById: req.user?.id || null,
      updatedByName: actorName
    };

    const updated = await prisma.afterSalesTeamMember.update({
      where: { id },
      data
    });

    res.status(200).json({
      success: true,
      message: `All set! Details updated for ${updated.fullName}.`,
      member: { ...updated, _id: updated.id }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAfterSalesTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.afterSalesTeamMember.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'After Sales team member not found.' });
    }

    await prisma.afterSalesTeamMember.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: `All set! ${existing.fullName} (${existing.memberCode}) removed from Field Service Team.`
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------
// AFTER SALES SUB-STAGES (DepartmentSubStageMaster)
// ----------------------------------------------------

export const getAfterSalesSubStages = async (req, res, next) => {
  try {
    const { includeInactive } = req.query;
    const where = { departmentModule: 'after-sales' };
    if (includeInactive !== 'true') {
      where.isActive = true;
    }

    const list = await prisma.departmentSubStageMaster.findMany({
      where,
      orderBy: [{ defaultOrder: 'asc' }, { subStageCode: 'asc' }]
    });

    res.status(200).json({
      success: true,
      count: list.length,
      subStages: list.map((s) => ({ ...s, _id: s.id, name: s.subStageName }))
    });
  } catch (error) {
    next(error);
  }
};

export const createAfterSalesSubStage = async (req, res, next) => {
  try {
    const actorName = getActorName(req.user);
    const {
      name,
      subStageName,
      parentStageCode = 'AFTER_SALES_SERVICE',
      defaultOrder = 1,
      standardDays = 5,
      weightPercent = 10,
      description = ''
    } = req.body;

    const finalName = String(subStageName || name || '').trim();
    if (!finalName) {
      return res.status(400).json({
        success: false,
        message: 'Sub-stage name is required.'
      });
    }

    // Auto-generate collision-free sub-stage code AST-SS-101
    let subStageCode = req.body.subStageCode ? String(req.body.subStageCode).trim().toUpperCase() : '';
    if (!subStageCode) {
      subStageCode = await generateUniqueSequenceCode({
        model: 'departmentSubStageMaster',
        field: 'subStageCode',
        prefix: 'AST-SS-',
        startSeq: 101,
        padLength: 3
      });
    } else {
      // Check pre-save duplicate
      const existing = await prisma.departmentSubStageMaster.findUnique({ where: { subStageCode } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Sub-stage code "${subStageCode}" is already in use.`
        });
      }
    }

    const stage = await prisma.departmentSubStageMaster.create({
      data: {
        departmentModule: 'after-sales',
        parentStageCode: String(parentStageCode).trim().toUpperCase(),
        subStageCode,
        subStageName: finalName,
        defaultOrder: Number(defaultOrder) || 1,
        standardDays: Number(standardDays) || 5,
        weightPercent: Number(weightPercent) || 10,
        description: String(description || '').trim(),
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: actorName,
      userRole: req.user?.role?.name || 'User',
      action: 'CREATE_AFTER_SALES_SUB_STAGE',
      module: 'after-sales',
      targetId: stage.id,
      details: { subStageCode, subStageName: stage.subStageName }
    });

    res.status(201).json({
      success: true,
      message: `All set! Service Sub-stage "${stage.subStageName}" (${subStageCode}) created.`,
      subStage: { ...stage, _id: stage.id, name: stage.subStageName }
    });
  } catch (error) {
    next(error);
  }
};

export const updateAfterSalesSubStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorName = getActorName(req.user);

    const existing = await prisma.departmentSubStageMaster.findUnique({ where: { id } });
    if (!existing || existing.departmentModule !== 'after-sales') {
      return res.status(404).json({ success: false, message: 'Service sub-stage not found.' });
    }

    const {
      name,
      subStageName,
      parentStageCode,
      defaultOrder,
      standardDays,
      weightPercent,
      description,
      isActive
    } = req.body;

    const data = {
      ...(subStageName !== undefined || name !== undefined
        ? { subStageName: String(subStageName || name).trim() }
        : {}),
      ...(parentStageCode !== undefined ? { parentStageCode: String(parentStageCode).trim().toUpperCase() } : {}),
      ...(defaultOrder !== undefined ? { defaultOrder: Number(defaultOrder) } : {}),
      ...(standardDays !== undefined ? { standardDays: Number(standardDays) } : {}),
      ...(weightPercent !== undefined ? { weightPercent: Number(weightPercent) } : {}),
      ...(description !== undefined ? { description: String(description).trim() } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      updatedById: req.user?.id || null,
      updatedByName: actorName
    };

    const updated = await prisma.departmentSubStageMaster.update({
      where: { id },
      data
    });

    res.status(200).json({
      success: true,
      message: `All set! Service Sub-stage "${updated.subStageName}" updated.`,
      subStage: { ...updated, _id: updated.id, name: updated.subStageName }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAfterSalesSubStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.departmentSubStageMaster.findUnique({ where: { id } });
    if (!existing || existing.departmentModule !== 'after-sales') {
      return res.status(404).json({ success: false, message: 'Service sub-stage not found.' });
    }

    await prisma.departmentSubStageMaster.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: `All set! Service Sub-stage "${existing.subStageName}" (${existing.subStageCode}) deleted.`
    });
  } catch (error) {
    next(error);
  }
};
