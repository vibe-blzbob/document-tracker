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

// Multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const unique = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    cb(null, `${safeBase}_${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

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

app.post('/api/users', (req: Request, res: Response) => {
  try {
    const adminId = (req.headers['x-user-id'] || req.query.user_id || req.body.admin_id) as string | undefined;
    const existingUsers = listUsers();
    // If users already exist, only Admin role can add new users
    if (existingUsers.length > 0) {
      if (!adminId) {
        return res.status(401).json({ error: 'Authentication required: Admin user ID must be provided.' });
      }
      const admin = getUserById(adminId);
      if (!admin || admin.role.toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Permission denied: Only Admin role can create user accounts.' });
      }
    }

    const { name, role, department, pin } = req.body;
    if (!name || !role || !department || !pin || String(pin).trim().length !== 4) {
      return res.status(400).json({ error: 'Name, role, department, and 4-digit PIN are required.' });
    }
    const user = createUser(name.trim(), role.trim(), department.trim(), String(pin).trim());
    res.status(201).json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', (req: Request, res: Response) => {
  try {
    const adminId = (req.headers['x-user-id'] || req.query.user_id || req.body.admin_id) as string | undefined;
    if (!adminId) {
      return res.status(401).json({ error: 'Authentication required: Admin user ID must be provided.' });
    }
    const admin = getUserById(adminId);
    if (!admin || admin.role.toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Permission denied: Only Admin role can edit users.' });
    }

    const { name, role, department, pin } = req.body;
    const updated = updateUser(req.params.id as string, {
      name,
      role,
      department,
      pin: pin ? String(pin).trim() : undefined
    });
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', (req: Request, res: Response) => {
  try {
    const adminId = (req.headers['x-user-id'] || req.query.user_id || req.body.admin_id) as string | undefined;
    if (!adminId) {
      return res.status(401).json({ error: 'Authentication required: Admin user ID must be provided.' });
    }
    const admin = getUserById(adminId);
    if (!admin || admin.role.toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Permission denied: Only Admin role can delete users.' });
    }

    const result = deleteUser(req.params.id as string);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to delete user.' });
    }
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { userId, pin } = req.body;
    if (!userId || !pin) {
      return res.status(400).json({ error: 'User ID and PIN are required.' });
    }
    const user = verifyUserPin(userId, pin);
    if (!user) {
      return res.status(401).json({ error: 'Invalid PIN or user.' });
    }
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
app.put('/api/dropdowns/:key', (req: Request, res: Response) => {
  try {
    const userId = (req.headers['x-user-id'] || req.query.user_id || req.body.user_id) as string | undefined;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required: User ID must be provided.' });
    }
    const user = getUserById(userId);
    if (!user || user.role.toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Permission denied: Only Admin role can edit dropdown data.' });
    }
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
app.post('/api/dropdowns/:key/reset', (req: Request, res: Response) => {
  try {
    const userId = (req.headers['x-user-id'] || req.query.user_id || req.body.user_id) as string | undefined;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required: User ID must be provided.' });
    }
    const user = getUserById(userId);
    if (!user || user.role.toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Permission denied: Only Admin role can edit dropdown data.' });
    }
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

    if (!author_name) {
      return res.status(400).json({ error: 'Author name is required to log modifications.' });
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
      author_name,
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
    if (!target_stage || !author_name) {
      return res.status(400).json({ error: 'Target stage and author name are required.' });
    }

    // If PIN verification is provided, verify it
    if (user_id && pin) {
      const user = verifyUserPin(user_id, pin);
      if (!user) {
        return res.status(401).json({ error: 'Authentication failed: Invalid PIN for signing.' });
      }
    }

    const doc = advanceDocumentStage(req.params.id as string, target_stage, author_name, notes);
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
    if (!to_office || !action_required || !author_name) {
      return res.status(400).json({ error: 'Target office, action required, and author name are required for routing.' });
    }

    if (user_id && pin) {
      const user = verifyUserPin(user_id, pin);
      if (!user) {
        return res.status(401).json({ error: 'Authentication failed: Invalid PIN for routing signature.' });
      }
    }

    const doc = routeDocument(req.params.id as string, to_office, action_required, author_name, notes);
    res.json({
      ...doc,
      custom_values: JSON.parse(doc.custom_values_json || '{}')
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin-only document deletion
app.delete('/api/documents/:id', (req: Request, res: Response) => {
  try {
    const userId = (req.headers['x-user-id'] || req.query.user_id) as string | undefined;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required: User ID must be provided.' });
    }
    const user = getUserById(userId);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ error: 'Permission denied: Only Admin role can delete registry records.' });
    }

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
app.delete('/api/history/:id', (req: Request, res: Response) => {
  try {
    const userId = (req.headers['x-user-id'] || req.query.user_id) as string | undefined;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required: User ID must be provided.' });
    }
    const user = getUserById(userId);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ error: 'Permission denied: Only Admin role can delete registry logs.' });
    }

    const deleted = deleteHistoryEntry(req.params.id as string);
    if (!deleted) {
      return res.status(404).json({ error: 'History log entry not found' });
    }
    res.json({ success: true, message: 'Registry log entry deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({
    file_path: `/uploads/${req.file.filename}`,
    file_name: req.file.originalname,
    file_size: req.file.size,
    mime_type: req.file.mimetype
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
