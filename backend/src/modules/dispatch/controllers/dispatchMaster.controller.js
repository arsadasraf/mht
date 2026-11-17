import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';
import { generateUniqueSequenceCode } from '../../../utils/sequenceGenerator.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

// ----------------------------------------------------
// DISPATCH TEAM MEMBERS
// ----------------------------------------------------

export const getDispatchTeam = async (req, res, next) => {
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

    const members = await prisma.dispatchTeamMember.findMany({
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

export const createDispatchTeamMember = async (req, res, next) => {
  try {
    const actorName = getActorName(req.user);
    const {
      fullName,
      designation,
      email = '',
      phone = '',
      department = 'TRIAL_AND_DISPATCH',
      skillSpecialty = 'Trial & Final QC Inspection',
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

    // Auto-generate collision-free member code DSP-TM-101
    let memberCode = req.body.memberCode ? String(req.body.memberCode).trim().toUpperCase() : '';
    if (!memberCode) {
      memberCode = await generateUniqueSequenceCode({
        model: 'dispatchTeamMember',
        field: 'memberCode',
        prefix: 'DSP-TM-',
        startSeq: 101,
        padLength: 3
      });
    } else {
      // Check pre-save duplicate
      const existing = await prisma.dispatchTeamMember.findUnique({ where: { memberCode } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Team Member Code "${memberCode}" is already in use.`
        });
      }
    }

    const member = await prisma.dispatchTeamMember.create({
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
      action: 'CREATE_DISPATCH_TEAM_MEMBER',
      module: 'dispatch',
      targetId: member.id,
      details: { memberCode, fullName: member.fullName, designation: member.designation }
    });

    res.status(201).json({
      success: true,
      message: `All set! ${member.fullName} (${memberCode}) added to Trial & Dispatch Team.`,
      member: { ...member, _id: member.id }
    });
  } catch (error) {
    next(error);
  }
};

export const updateDispatchTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorName = getActorName(req.user);

    const existing = await prisma.dispatchTeamMember.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Dispatch team member not found.' });
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

    const updated = await prisma.dispatchTeamMember.update({
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

export const deleteDispatchTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.dispatchTeamMember.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Dispatch team member not found.' });
    }

    await prisma.dispatchTeamMember.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: `All set! ${existing.fullName} (${existing.memberCode}) removed from Trial & Dispatch Team.`
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------
// DISPATCH SUB-STAGES (DepartmentSubStageMaster)
// ----------------------------------------------------

export const getDispatchSubStages = async (req, res, next) => {
  try {
    const { includeInactive } = req.query;
    const where = { departmentModule: 'dispatch' };
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

export const createDispatchSubStage = async (req, res, next) => {
  try {
    const actorName = getActorName(req.user);
    const {
      name,
      subStageName,
      parentStageCode = 'TRIAL_DISPATCH',
      defaultOrder = 1,
      standardDays = 3,
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

    // Auto-generate collision-free sub-stage code DSP-SS-101
    let subStageCode = req.body.subStageCode ? String(req.body.subStageCode).trim().toUpperCase() : '';
    if (!subStageCode) {
      subStageCode = await generateUniqueSequenceCode({
        model: 'departmentSubStageMaster',
        field: 'subStageCode',
        prefix: 'DSP-SS-',
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
        departmentModule: 'dispatch',
        parentStageCode: String(parentStageCode).trim().toUpperCase(),
        subStageCode,
        subStageName: finalName,
        defaultOrder: Number(defaultOrder) || 1,
        standardDays: Number(standardDays) || 3,
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
      action: 'CREATE_DISPATCH_SUB_STAGE',
      module: 'dispatch',
      targetId: stage.id,
      details: { subStageCode, subStageName: stage.subStageName }
    });

    res.status(201).json({
      success: true,
      message: `All set! Inspection Sub-stage "${stage.subStageName}" (${subStageCode}) created.`,
      subStage: { ...stage, _id: stage.id, name: stage.subStageName }
    });
  } catch (error) {
    next(error);
  }
};

export const updateDispatchSubStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorName = getActorName(req.user);

    const existing = await prisma.departmentSubStageMaster.findUnique({ where: { id } });
    if (!existing || existing.departmentModule !== 'dispatch') {
      return res.status(404).json({ success: false, message: 'Inspection sub-stage not found.' });
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
      message: `All set! Inspection Sub-stage "${updated.subStageName}" updated.`,
      subStage: { ...updated, _id: updated.id, name: updated.subStageName }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDispatchSubStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.departmentSubStageMaster.findUnique({ where: { id } });
    if (!existing || existing.departmentModule !== 'dispatch') {
      return res.status(404).json({ success: false, message: 'Inspection sub-stage not found.' });
    }

    await prisma.departmentSubStageMaster.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: `All set! Inspection Sub-stage "${existing.subStageName}" (${existing.subStageCode}) deleted.`
    });
  } catch (error) {
    next(error);
  }
};

