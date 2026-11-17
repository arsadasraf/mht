import { prisma } from '../config/db.config.js';

/**
 * Generates a guaranteed collision-free sequential code for any Prisma model.
 * Never relies on `count() + 1` (which collides after deletions).
 * Scans the highest existing numeric suffix and loops until an unused code is verified.
 *
 * @param {Object} options
 * @param {string} options.model - Prisma model name (e.g. 'project', 'stageMaster', 'lead', 'purchaseOrder')
 * @param {string} options.field - Field name on the Prisma model (e.g. 'workOrderNumber', 'stageCode', 'poNumber')
 * @param {string} options.prefix - Code prefix before the sequence number (e.g. 'WO-2026-', 'STG-', 'PO-2026-')
 * @param {number} [options.startSeq=1001] - Minimum starting sequence number
 * @param {number} [options.padLength=4] - Zero-padding length for the sequence number
 * @returns {Promise<string>} Unique, collision-free code
 */
export const generateUniqueSequenceCode = async ({
  model,
  field,
  prefix,
  startSeq = 1001,
  padLength = 4
}) => {
  const delegate = prisma[model];
  if (!delegate) {
    throw new Error(`Invalid Prisma model '${model}' passed to generateUniqueSequenceCode`);
  }

  const cleanPrefix = String(prefix || '').trim().toUpperCase();
  const minSeq = Number(startSeq) || 1;

  // Fetch all existing values for this field
  const records = await delegate.findMany({
    select: { [field]: true }
  });

  const existingSet = new Set();
  let maxSeq = minSeq - 1;

  for (const row of records) {
    const val = String(row[field] || '').trim().toUpperCase();
    if (!val) continue;
    existingSet.add(val);

    // Match trailing sequence number if it starts with our prefix (or general trailing number)
    if (val.startsWith(cleanPrefix)) {
      const rest = val.slice(cleanPrefix.length);
      const match = rest.match(/^(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    } else {
      const tailMatch = val.match(/[-_](\d+)$/);
      if (tailMatch) {
        const num = parseInt(tailMatch[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  }

  let candidateSeq = Math.max(minSeq, maxSeq + 1);
  let candidate = `${cleanPrefix}${String(candidateSeq).padStart(padLength, '0')}`;

  // Guaranteed collision-free check loop
  while (existingSet.has(candidate.toUpperCase())) {
    candidateSeq += 1;
    candidate = `${cleanPrefix}${String(candidateSeq).padStart(padLength, '0')}`;
  }

  return candidate;
};

