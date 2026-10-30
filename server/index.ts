import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import multer from 'multer';
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  verifyUserPin,
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  listDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  deleteHistoryEntry,
  advanceDocumentStage,
  routeDocument,
  getDocumentHistory,
  getSummaryMetrics,
  getAllDropdowns,
  getDropdownOptions,
  updateDropdown,
  resetDropdown
} from './db.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const HOST = process.env.HOST || '0.0.0.0';
const IS_LOCAL_ONLY = HOST === '127.0.0.1' || HOST === 'localhost';

// Ensure uploads folder exists
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Allowed document and image file extensions
const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.ppt', '.pptx',
  '.png', '.jpg', '.jpeg', '.webp', '.txt'
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]);

// Multer storage with defensive extension and name isolation
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : '';
    const safeBase = path.basename(file.originalname, rawExt).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
    const unique = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    cb(null, `${safeBase || 'upload'}_${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error(`File extension '${ext}' is not permitted. Only standard document and image files are allowed.`));
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      return cb(new Error(`File MIME type '${file.mimetype}' is not permitted.`));
    }
    cb(null, true);
  }
});

const app = express();

// Security Headers Middleware
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Serve uploaded files statically with restrictive sandbox CSP and nosniff
app.use(
  '/uploads',
  (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(UPLOADS_DIR)
);

// Helper: Get local network IPv4 addresses
export function getLocalNetworkIps(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];

  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

// Health & LAN info
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    networkIps: getLocalNetworkIps()
  });
});

app.get('/api/network-info', (_req: Request, res: Response) => {
  const ips = IS_LOCAL_ONLY ? [] : getLocalNetworkIps();
  const primaryIp = ips[0] || 'localhost';
  res.json({
    primaryIp,
    allIps: ips,
    port: PORT,
    localUrl: `http://localhost:${PORT}`,
    lanUrl: IS_LOCAL_ONLY ? null : `http://${primaryIp}:${PORT}`,
    hostname: os.hostname(),
    isLocalOnly: IS_LOCAL_ONLY
  });
});

// Users & Auth
app.get('/api/users', (_req: Request, res: Response) => {
  try {
    const users = listUsers();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Authorization Guard Middleware
function requireAdmin(req: Request, res: Response, next: express.NextFunction) {
  const adminId = (req.headers['x-user-id'] || req.query.user_id || req.body?.admin_id || req.body?.user_id) as string | undefined;
  if (!adminId) {
    return res.status(401).json({ error: 'Authentication required: Admin user ID must be provided.' });
  }
  const admin = getUserById(adminId);
  if (!admin || admin.role.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Permission denied: Administrator role required.' });
  }
  next();
}

app.post('/api/users', (req: Request, res: Response) => {
  try {
    const existingUsers = listUsers();
    if (existingUsers.length > 0) {
      const adminId = (req.headers['x-user-id'] || req.query.user_id || req.body?.admin_id) as string | undefined;
      if (!adminId) return res.status(401).json({ error: 'Authentication required: Admin user ID must be provided.' });
      const admin = getUserById(adminId);
      if (!admin || admin.role.toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Permission denied: Only Admin role can create user accounts.' });
      }
    }

    const { name, role, department, pin } = req.body;
    const pinStr = pin ? String(pin).trim() : '';
    if (!name || !role || !department || !pin || !/^\d{4}$/.test(pinStr)) {
      return res.status(400).json({ error: 'Name, role, department, and exactly 4-digit numeric PIN are required.' });
    }
    const user = createUser(name.trim(), role.trim(), department.trim(), pinStr);
    res.status(201).json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const { name, role, department, pin } = req.body;
    const updated = updateUser(req.params.id as string, {
      name,
      role,
      department,
      pin: pin ? String(pin).trim() : undefined
    });
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const result = deleteUser(req.params.id as string);
    if (!result.success) return res.status(400).json({ error: result.error || 'Failed to delete user.' });
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Brute-force defense for PIN authentication
interface RateLimitRecord {
  attempts: number;
  lockoutUntil: number;
}
const loginRateLimiter = new Map<string, RateLimitRecord>();
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const entry = loginRateLimiter.get(key);
  if (!entry) return { allowed: true };

  const now = Date.now();
  if (entry.lockoutUntil > now) {
    const retryAfterSeconds = Math.ceil((entry.lockoutUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  if (entry.lockoutUntil > 0 && entry.lockoutUntil <= now) {
    loginRateLimiter.delete(key);
  }
  return { allowed: true };
}

function recordFailedLogin(key: string): { locked: boolean; remainingAttempts: number; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = loginRateLimiter.get(key) || { attempts: 0, lockoutUntil: 0 };
  entry.attempts += 1;

  if (entry.attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    entry.lockoutUntil = now + LOCKOUT_DURATION_MS;
    loginRateLimiter.set(key, entry);
    return { locked: true, remainingAttempts: 0, retryAfterSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
  }

  loginRateLimiter.set(key, entry);
  return { locked: false, remainingAttempts: MAX_FAILED_LOGIN_ATTEMPTS - entry.attempts };
}

function resetLoginRateLimit(key: string) {
  loginRateLimiter.delete(key);
}

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { userId, pin } = req.body;
    if (!userId || !pin) {
      return res.status(400).json({ error: 'User ID and PIN are required.' });
    }

    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const rateLimitKey = `${clientIp}:${userId}`;
    const rateCheck = checkLoginRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Too many failed login attempts. Temporarily locked out. Please try again in ${rateCheck.retryAfterSeconds} seconds.`
      });
    }

    const user = verifyUserPin(String(userId), String(pin));
    if (!user) {
      const failStatus = recordFailedLogin(rateLimitKey);
      if (failStatus.locked) {
        return res.status(429).json({
          error: 'Too many failed login attempts. Account locked for 15 minutes.'
        });
      }
      return res.status(401).json({
        error: `Invalid PIN or user. ${failStatus.remainingAttempts} attempt(s) remaining before temporary lockout.`
      });
    }

    resetLoginRateLimit(rateLimitKey);
    res.json({ success: true, user });
  } catch (_err: any) {
    res.status(500).json({ error: 'Authentication failed due to an unexpected server error.' });
  }
});

// Templates API
app.get('/api/templates', (_req: Request, res: Response) => {
  try {
    const templates = listTemplates();
    const parsed = templates.map((t) => ({
      ...t,
      stages: JSON.parse(t.stages_json),
      fields: JSON.parse(t.fields_json)
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/templates/:id', (req: Request, res: Response) => {
  try {
    const template = getTemplateById(req.params.id as string);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({
      ...template,
      stages: JSON.parse(template.stages_json),
      fields: JSON.parse(template.fields_json)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/templates', (req: Request, res: Response) => {
  try {
    const { name, description, icon, stages, fields } = req.body;
    if (!name || !Array.isArray(stages) || stages.length === 0 || !Array.isArray(fields)) {
      return res.status(400).json({ error: 'Name, stages list, and fields list are required.' });
    }
    const template = createTemplate(name, description || '', icon || 'FileText', stages, fields);
    res.status(201).json({
      ...template,
      stages: JSON.parse(template.stages_json),
      fields: JSON.parse(template.fields_json)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/templates/:id', (req: Request, res: Response) => {
  try {
    const { name, description, icon, stages, fields } = req.body;
    if (!name || !Array.isArray(stages) || stages.length === 0 || !Array.isArray(fields)) {
      return res.status(400).json({ error: 'Name, stages list, and fields list are required.' });
    }
    const template = updateTemplate(req.params.id as string, name, description || '', icon || 'FileText', stages, fields);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({
      ...template,
      stages: JSON.parse(template.stages_json),
      fields: JSON.parse(template.fields_json)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/templates/:id', (req: Request, res: Response) => {
  try {
    deleteTemplate(req.params.id as string);
    res.json({ success: true, message: 'Template deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Offices & Routing Metadata API (Reads dynamically from database)
app.get('/api/offices', (_req: Request, res: Response) => {
  res.json({
    offices: getDropdownOptions('offices'),
    actions: getDropdownOptions('actions')
  });
});

// Dropdowns API: Get all dropdown lists
app.get('/api/dropdowns', (_req: Request, res: Response) => {
  try {
    res.json(getAllDropdowns());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dropdowns API: Admin-only update dropdown list
app.put('/api/dropdowns/:key', requireAdmin, (req: Request, res: Response) => {
  try {
    const { options } = req.body;
    if (!Array.isArray(options)) {
      return res.status(400).json({ error: 'Options must be an array of strings.' });
    }
    const updated = updateDropdown(req.params.key as string, options);
    res.json({ success: true, dropdown: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dropdowns API: Admin-only reset dropdown list to default
app.post('/api/dropdowns/:key/reset', requireAdmin, (req: Request, res: Response) => {
  try {
    const updated = resetDropdown(req.params.key as string);
    res.json({ success: true, dropdown: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Documents API
app.get('/api/documents', (req: Request, res: Response) => {
  try {
    const { template_id, stage, search, priority, assignee_id, current_office, origin_type } = req.query;
    const docs = listDocuments({
      template_id: template_id ? String(template_id) : undefined,
      stage: stage ? String(stage) : undefined,
      search: search ? String(search) : undefined,
      priority: priority ? String(priority) : undefined,
      assignee_id: assignee_id ? String(assignee_id) : undefined,
      current_office: current_office ? String(current_office) : undefined,
      origin_type: origin_type ? String(origin_type) : undefined
    });

    const parsed = docs.map((doc) => ({
      ...doc,
      custom_values: JSON.parse(doc.custom_values_json || '{}')
    }));

    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/documents/:id', (req: Request, res: Response) => {
  try {
    const doc = getDocumentById(req.params.id as string);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({
      ...doc,
      custom_values: JSON.parse(doc.custom_values_json || '{}')
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/documents/:id/history', (req: Request, res: Response) => {
  try {
    const history = getDocumentHistory(req.params.id as string);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/documents', (req: Request, res: Response) => {
  try {
    const {
      title,
      template_id,
      priority,
      origin_type,
      originating_office,
      current_office,
      action_required,
      assignee_id,
      assignee_name,
      custom_values,
      attachment_path,
      attachment_name,
      attachment_size,
      author_name,
      notes
    } = req.body;

    if (!title || !template_id || !author_name) {
      return res.status(400).json({ error: 'Title, template_id, and author_name are required.' });
    }
    if (typeof title !== 'string' || title.trim().length === 0 || title.length > 300) {
      return res.status(400).json({ error: 'Title is required and must not exceed 300 characters.' });
    }
    if (typeof author_name !== 'string' || author_name.trim().length === 0 || author_name.length > 100) {
      return res.status(400).json({ error: 'Author name is required and must not exceed 100 characters.' });
    }
    if (notes && typeof notes === 'string' && notes.length > 5000) {
      return res.status(400).json({ error: 'Notes must not exceed 5000 characters.' });
    }

    const doc = createDocument({
      title,
      template_id,
      priority,
      origin_type,
      originating_office,
      current_office,
      action_required,
      assignee_id,
      assignee_name,
      custom_values: custom_values || {},
      attachment_path,
      attachment_name,
      attachment_size,
      author_name,
      notes
    });

    res.status(201).json({
      ...doc,
      custom_values: JSON.parse(doc.custom_values_json || '{}')
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/documents/:id', (req: Request, res: Response) => {
  try {
    const {
      title,
      priority,
      origin_type,
      originating_office,
      current_office,
      action_required,
      assignee_id,
      assignee_name,
      custom_values,
      attachment_path,
      attachment_name,
      attachment_size,
      author_name,
      notes
    } = req.body;

    if (!author_name || typeof author_name !== 'string' || author_name.trim().length === 0 || author_name.length > 100) {
      return res.status(400).json({ error: 'Author name is required and must not exceed 100 characters.' });
    }
    if (title && (typeof title !== 'string' || title.length > 300)) {
      return res.status(400).json({ error: 'Title must not exceed 300 characters.' });
    }
    if (notes && typeof notes === 'string' && notes.length > 5000) {
      return res.status(400).json({ error: 'Notes must not exceed 5000 characters.' });
    }

    const doc = updateDocument(req.params.id as string, {
      title,
      priority,
      origin_type,
      originating_office,
      current_office,
      action_required,
      assignee_id,
      assignee_name,
      custom_values,
      attachment_path,
      attachment_name,
      attachment_size,
      author_name: author_name.trim(),
      notes
    });

    res.json({
      ...doc,
      custom_values: JSON.parse(doc.custom_values_json || '{}')
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/documents/:id/advance', (req: Request, res: Response) => {
  try {
    const { target_stage, author_name, notes, user_id, pin } = req.body;
    if (!target_stage || !author_name || typeof author_name !== 'string' || author_name.trim().length === 0 || author_name.length > 100) {
      return res.status(400).json({ error: 'Target stage and valid author name (max 100 chars) are required.' });
    }
    if (notes && typeof notes === 'string' && notes.length > 5000) {
      return res.status(400).json({ error: 'Notes must not exceed 5000 characters.' });
    }

    // If PIN verification is provided, verify it
    if (user_id && pin) {
      const user = verifyUserPin(user_id, pin);
      if (!user) {
        return res.status(401).json({ error: 'Authentication failed: Invalid PIN for signing.' });
      }
    }

    const doc = advanceDocumentStage(req.params.id as string, target_stage, author_name.trim(), notes);
    res.json({
      ...doc,
      custom_values: JSON.parse(doc.custom_values_json || '{}')
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Route / Forward document to another municipal office
app.post('/api/documents/:id/route', (req: Request, res: Response) => {
  try {
    const { to_office, action_required, author_name, notes, user_id, pin } = req.body;
    if (!to_office || !action_required || !author_name || typeof author_name !== 'string' || author_name.trim().length === 0 || author_name.length > 100) {
      return res.status(400).json({ error: 'Target office, action required, and author name (max 100 chars) are required for routing.' });
    }
    if (notes && typeof notes === 'string' && notes.length > 5000) {
      return res.status(400).json({ error: 'Notes must not exceed 5000 characters.' });
    }

    if (user_id && pin) {
      const user = verifyUserPin(user_id, pin);
      if (!user) {
        return res.status(401).json({ error: 'Authentication failed: Invalid PIN for routing signature.' });
      }
    }

    const doc = routeDocument(req.params.id as string, to_office, action_required, author_name.trim(), notes);
    res.json({
      ...doc,
      custom_values: JSON.parse(doc.custom_values_json || '{}')
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin-only document deletion
app.delete('/api/documents/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const deleted = deleteDocument(req.params.id as string);
    if (!deleted) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ success: true, message: 'Document and its audit logs have been deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin-only history log entry deletion
app.delete('/api/history/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const deleted = deleteHistoryEntry(req.params.id as string);
    if (!deleted) {
      return res.status(404).json({ error: 'History log entry not found' });
    }
    res.json({ success: true, message: 'Registry log entry deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// File upload endpoint with defensive error handling and extension validation
app.post('/api/upload', (req: Request, res: Response) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds maximum allowed limit of 25MB.' });
      }
      return res.status(400).json({ error: `File upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    return res.json({
      file_path: `/uploads/${req.file.filename}`,
      file_name: req.file.originalname,
      file_size: req.file.size,
      mime_type: req.file.mimetype
    });
  });
});

// Metrics endpoint
app.get('/api/metrics', (_req: Request, res: Response) => {
  try {
    const metrics = getSummaryMetrics();
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static frontend build if present
const DIST_DIR = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// Start server on configured host (0.0.0.0 for LAN or 127.0.0.1 for local only)
const server = app.listen(PORT, HOST, () => {
  const ips = IS_LOCAL_ONLY ? [] : getLocalNetworkIps();
  console.log('\n========================================================');
  console.log(`🚀 DocTrack LGU Server is Running on ${HOST}:${PORT}`);
  console.log('--------------------------------------------------------');
  console.log(`🏠 Local Machine:   http://localhost:${PORT}`);
  if (!IS_LOCAL_ONLY && ips.length > 0) {
    ips.forEach((ip) => {
      console.log(`📶 Network (LAN):   http://${ip}:${PORT}`);
    });
    console.log('💡 Any device on your local Wi-Fi/Ethernet can connect using the Network URL above.');
  } else if (IS_LOCAL_ONLY) {
    console.log('🔒 LAN access disabled (server bound to localhost 127.0.0.1 only).');
  } else {
    console.log('⚠️ No active external IPv4 network interface detected.');
  }
  console.log('========================================================\n');
});

export { app, server };
