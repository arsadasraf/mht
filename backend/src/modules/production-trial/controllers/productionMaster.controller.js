import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';
import { generateUniqueSequenceCode } from '../../../utils/sequenceGenerator.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

// ----------------------------------------------------
// PRODUCTION TEAM MEMBERS
// ----------------------------------------------------

export const getProductionTeam = async (req, res, next) => {
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

    const members = await prisma.productionTeamMember.findMany({
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

export const createProductionTeamMember = async (req, res, next) => {
  try {
    const actorName = getActorName(req.user);
    const {
      fullName,
      designation,
      email = '',
      phone = '',
      department = 'MECHANICAL_ASSEMBLY',
      skillSpecialty = 'General Assembly',
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

    // Auto-generate collision-free member code PRD-TM-101
    let memberCode = req.body.memberCode ? String(req.body.memberCode).trim().toUpperCase() : '';
    if (!memberCode) {
      memberCode = await generateUniqueSequenceCode({
        model: 'productionTeamMember',
        field: 'memberCode',
        prefix: 'PRD-TM-',
        startSeq: 101,
        padLength: 3
      });
    } else {
      // Check pre-save duplicate
      const existing = await prisma.productionTeamMember.findUnique({ where: { memberCode } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Team Member Code "${memberCode}" is already in use.`
        });
      }
    }

    const member = await prisma.productionTeamMember.create({
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
      action: 'CREATE_PRODUCTION_TEAM_MEMBER',
      module: 'production-trial',
      targetId: member.id,
      details: { memberCode, fullName: member.fullName, designation: member.designation }
    });

    res.status(201).json({
      success: true,
      message: `All set! ${member.fullName} (${memberCode}) added to Production Team.`,
      member: { ...member, _id: member.id }
    });
  } catch (error) {
    next(error);
  }
};

export const updateProductionTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorName = getActorName(req.user);

    const existing = await prisma.productionTeamMember.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Production team member not found.' });
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

    const updated = await prisma.productionTeamMember.update({
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

export const deleteProductionTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.productionTeamMember.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Production team member not found.' });
    }

    await prisma.productionTeamMember.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: `All set! ${existing.fullName} (${existing.memberCode}) removed from Production Team.`
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------
// PRODUCTION SUB-STAGES (DepartmentSubStageMaster)
// ----------------------------------------------------

export const getProductionSubStages = async (req, res, next) => {
  try {
    const { includeInactive } = req.query;
    const where = { departmentModule: 'production' };
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

export const createProductionSubStage = async (req, res, next) => {
  try {
    const actorName = getActorName(req.user);
    const {
      name,
      subStageName,
      parentStageCode = 'PRODUCTION_ASSEMBLY',
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

    // Auto-generate sequence code PRD-SS-101
    let subStageCode = req.body.subStageCode ? String(req.body.subStageCode).trim().toUpperCase() : '';
    if (!subStageCode) {
      subStageCode = await generateUniqueSequenceCode({
        model: 'departmentSubStageMaster',
        field: 'subStageCode',
        prefix: 'PRD-SS-',
        startSeq: 101,
        padLength: 3
      });
    } else {
      const existing = await prisma.departmentSubStageMaster.findUnique({ where: { subStageCode } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Sub-stage code "${subStageCode}" is already in use.`
        });
      }
    }

    const subStage = await prisma.departmentSubStageMaster.create({
      data: {
        subStageCode,
        subStageName: finalName,
        departmentModule: 'production',
        parentStageCode: String(parentStageCode).trim().toUpperCase(),
        defaultOrder: Number(defaultOrder) || 1,
        standardDays: Number(standardDays) || 5,
        weightPercent: Number(weightPercent) || 10,
        description: description.trim(),
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
      action: 'CREATE_PRODUCTION_SUBSTAGE',
      module: 'production-trial',
      targetId: subStage.id,
      details: { subStageCode, subStageName: finalName }
    });

    res.status(201).json({
      success: true,
      message: `All set! Production Sub-Stage ${subStage.subStageName} (${subStageCode}) created.`,
      subStage: { ...subStage, _id: subStage.id, name: subStage.subStageName }
    });
  } catch (error) {
    next(error);
  }
};

export const updateProductionSubStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorName = getActorName(req.user);

    const existing = await prisma.departmentSubStageMaster.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Production sub-stage not found.' });
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

    const finalName = subStageName !== undefined ? subStageName : name;

    const data = {
      ...(finalName !== undefined ? { subStageName: String(finalName).trim() } : {}),
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
      message: `All set! Sub-Stage ${updated.subStageName} updated.`,
      subStage: { ...updated, _id: updated.id, name: updated.subStageName }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProductionSubStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.departmentSubStageMaster.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Production sub-stage not found.' });
    }

    await prisma.departmentSubStageMaster.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: `All set! Sub-Stage ${existing.subStageName} deleted.`
    });
  } catch (error) {
    next(error);
  }
};

