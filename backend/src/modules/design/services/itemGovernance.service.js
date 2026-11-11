import { prisma } from '../../../config/db.config.js';

/**
 * Check whether an RM-BO or FG item is attached to any active BOMs (FG Assemblies or Project BOMs).
 * @param {string} itemId - UUID of the item
 * @param {string} itemName - Name / Part Number of the item
 * @returns {Promise<{ isAttached: boolean, count: number, attachments: Array<object> }>}
 */
export const checkItemBOMAttachments = async (itemId, itemName) => {
  const attachments = [];
  const cleanName = String(itemName || '').trim().toLowerCase();

  // 1. Check FG Sub-Assemblies and Assemblies
  try {
    const fgItems = await prisma.fgItemMaster.findMany({
      select: { id: true, name: true, classification: true, bomItems: true }
    });

    for (const fg of fgItems) {
      if (fg.id === itemId) continue; // Don't match against self
      const bom = Array.isArray(fg.bomItems) ? fg.bomItems : [];
      const match = bom.find((b) => {
        const bId = String(b.itemId || '');
        const bName = String(b.itemName || b.name || '').trim().toLowerCase();
        return (itemId && bId === itemId) || (cleanName && bName === cleanName);
      });

      if (match) {
        attachments.push({
          type: 'FG_ASSEMBLY',
          id: fg.id,
          name: fg.name,
          classification: fg.classification || 'ASSEMBLY',
          quantity: match.quantity || match.qty || 1,
          uom: match.uom || 'Nos'
        });
      }
    }
  } catch (err) {
    console.error('Error checking FG BOM attachments:', err);
  }

  // 2. Check Project BOMs
  try {
    const projectBoms = await prisma.bom.findMany({
      select: { id: true, projectId: true, bomNumber: true, attachedAssemblyName: true, items: true }
    });

    const searchTree = (nodes) => {
      if (!Array.isArray(nodes)) return null;
      for (const node of nodes) {
        const nId = String(node.itemId || node.id || '');
        const nName = String(node.itemName || node.name || node.itemCode || '').trim().toLowerCase();
        if ((itemId && nId === itemId) || (cleanName && nName === cleanName)) {
          return node;
        }
        if (node.children && Array.isArray(node.children)) {
          const found = searchTree(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    for (const pb of projectBoms) {
      const match = searchTree(pb.items);
      if (match) {
        attachments.push({
          type: 'PROJECT_BOM',
          id: pb.id,
          name: pb.bomNumber || pb.projectId,
          projectId: pb.projectId,
          bomNumber: pb.bomNumber,
          assemblyName: pb.attachedAssemblyName || pb.bomNumber,
          classification: 'PROJECT_BOM',
          quantity: match.quantity || match.qty || 1,
          uom: match.uom || 'Nos'
        });
      }
    }
  } catch (err) {
    console.error('Error checking Project BOM attachments:', err);
  }

  return {
    isAttached: attachments.length > 0,
    count: attachments.length,
    attachments
  };
};

/**
 * Check whether past transactions (Purchase Orders, GRNs, Allocations, QC Inspections) exist for an item.
 * @param {string} itemId - UUID of the item
 * @param {string} itemName - Name / Part Number of the item
 * @returns {Promise<{ hasTransactions: boolean, count: number, summary: string, details: object }>}
 */
export const checkItemPastTransactions = async (itemId, itemName) => {
  const cleanName = String(itemName || '').trim();
  const cleanNameLower = cleanName.toLowerCase();

  const details = {
    pos: [],
    grns: [],
    allocations: [],
    inspections: []
  };

  // 1. Purchase Orders
  try {
    const pos = await prisma.purchaseOrder.findMany({
      select: { poNumber: true, items: true }
    });
    for (const po of pos) {
      const items = Array.isArray(po.items) ? po.items : [];
      const match = items.some((it) => {
        const itId = String(it.itemId || it.id || '');
        const itName = String(it.itemName || it.itemCode || it.name || '').trim().toLowerCase();
        return (itemId && itId === itemId) || (cleanNameLower && itName === cleanNameLower);
      });
      if (match) details.pos.push(po.poNumber);
    }
  } catch (err) {
    console.error('Error checking PO transactions:', err);
  }

  // 2. Store GRN Records
  try {
    const grns = await prisma.grnRecord.findMany({
      select: { grnNumber: true, items: true }
    });
    for (const grn of grns) {
      const items = Array.isArray(grn.items) ? grn.items : [];
      const match = items.some((it) => {
        const itId = String(it.itemId || it.id || '');
        const itName = String(it.itemName || it.itemCode || it.name || '').trim().toLowerCase();
        return (itemId && itId === itemId) || (cleanNameLower && itName === cleanNameLower);
      });
      if (match) details.grns.push(grn.grnNumber);
    }
  } catch (err) {
    console.error('Error checking GRN transactions:', err);
  }

  // 3. Store Allocations
  try {
    const allocs = await prisma.stockAllocation.findMany({
      where: {
        OR: [
          { itemCode: { equals: cleanName, mode: 'insensitive' } },
          { itemName: { equals: cleanName, mode: 'insensitive' } }
        ]
      },
      select: { allocationNumber: true }
    });
    allocs.forEach((a) => details.allocations.push(a.allocationNumber));
  } catch (err) {
    console.error('Error checking Stock Allocation transactions:', err);
  }

  // 4. QC Inspections
  try {
    const inspections = await prisma.qcInspection.findMany({
      where: {
        OR: [
          { itemCode: { equals: cleanName, mode: 'insensitive' } },
          { itemName: { equals: cleanName, mode: 'insensitive' } }
        ]
      },
      select: { inspectionNumber: true }
    });
    inspections.forEach((insp) => details.inspections.push(insp.inspectionNumber));
  } catch (err) {
    console.error('Error checking QC Inspection transactions:', err);
  }

  const totalCount =
    details.pos.length +
    details.grns.length +
    details.allocations.length +
    details.inspections.length;

  const summaryParts = [];
  if (details.pos.length > 0) summaryParts.push(`${details.pos.length} Purchase Order(s)`);
  if (details.grns.length > 0) summaryParts.push(`${details.grns.length} Store GRN(s)`);
  if (details.allocations.length > 0) summaryParts.push(`${details.allocations.length} Store Allocation(s)`);
  if (details.inspections.length > 0) summaryParts.push(`${details.inspections.length} QC Inspection(s)`);

  return {
    hasTransactions: totalCount > 0,
    count: totalCount,
    summary: summaryParts.join(', ') || 'No transactions',
    details
  };
};

/**
 * Propagate item name changes to attached FG Assemblies and Project BOMs.
 * @param {string} itemId - UUID of the item
 * @param {string} oldName - Previous name
 * @param {string} newName - Updated name
 * @param {string} description - Updated description (optional)
 */
export const propagateItemNameChange = async (itemId, oldName, newName, description = '') => {
  if (!newName || newName === oldName) return;
  const oldNameLower = String(oldName || '').trim().toLowerCase();

  // 1. Propagate in FG Assemblies
  try {
    const fgItems = await prisma.fgItemMaster.findMany({
      select: { id: true, bomItems: true }
    });

    for (const fg of fgItems) {
      const bom = Array.isArray(fg.bomItems) ? fg.bomItems : [];
      let changed = false;

      const updatedBom = bom.map((line) => {
        const lId = String(line.itemId || '');
        const lName = String(line.itemName || line.name || '').trim().toLowerCase();
        if ((itemId && lId === itemId) || (oldNameLower && lName === oldNameLower)) {
          changed = true;
          return {
            ...line,
            itemName: newName,
            ...(line.name ? { name: newName } : {}),
            ...(description ? { description } : {})
          };
        }
        return line;
      });

      if (changed) {
        await prisma.fgItemMaster.update({
          where: { id: fg.id },
          data: { bomItems: updatedBom }
        });
      }
    }
  } catch (err) {
    console.error('Error propagating item name to FG assemblies:', err);
  }

  // 2. Propagate in Project BOMs
  try {
    const projectBoms = await prisma.bom.findMany({
      select: { id: true, items: true }
    });

    const updateTree = (nodes) => {
      let anyChanged = false;
      const updatedNodes = nodes.map((node) => {
        const nId = String(node.itemId || node.id || '');
        const nName = String(node.itemName || node.name || node.itemCode || '').trim().toLowerCase();
        let updatedNode = { ...node };

        if ((itemId && nId === itemId) || (oldNameLower && nName === oldNameLower)) {
          anyChanged = true;
          updatedNode.itemName = newName;
          if (node.name) updatedNode.name = newName;
          if (description) updatedNode.description = description;
        }

        if (node.children && Array.isArray(node.children)) {
          const { changed: subChanged, nodes: subNodes } = updateTree(node.children);
          if (subChanged) {
            anyChanged = true;
            updatedNode.children = subNodes;
          }
        }

        return updatedNode;
      });

      return { changed: anyChanged, nodes: updatedNodes };
    };

    for (const pb of projectBoms) {
      if (Array.isArray(pb.items)) {
        const { changed, nodes } = updateTree(pb.items);
        if (changed) {
          await prisma.bom.update({
            where: { id: pb.id },
            data: { items: nodes }
          });
        }
      }
    }
  } catch (err) {
    console.error('Error propagating item name to Project BOMs:', err);
  }
};

