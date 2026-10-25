import path from 'path';

const ALLOWED_EXTENSIONS = new Set([
  // CAD & Technical Drawings
  '.step', '.stp', '.dwg', '.dxf', '.pdf',
  // Spreadsheets & Data
  '.xlsx', '.xls', '.csv',
  // Inspection & Dispatch Images
  '.png', '.jpg', '.jpeg', '.webp'
]);

const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.php', '.js', '.vbs', '.scr', '.jar', '.com', '.msi'
]);

export const validateFileUpload = (fileName, fileSize, maxSizeBytes = 50 * 1024 * 1024) => {
  if (!fileName) {
    return { valid: false, error: 'File name is required.' };
  }

  const ext = path.extname(fileName).toLowerCase();

  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Security Error: Executable file type (${ext}) is strictly prohibited.` };
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Invalid File Type: (${ext}) is not supported. Allowed types: CAD (.step, .dwg, .dxf, .pdf), Excel (.xlsx, .csv), and Images (.png, .jpg).` };
  }

  if (fileSize && fileSize > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    return { valid: false, error: `File size exceeds the allowable limit of ${maxMb}MB.` };
  }

  return { valid: true, extension: ext };
};
