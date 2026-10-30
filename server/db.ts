import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import crypto from 'node:crypto';

const DB_PATH = path.resolve(process.cwd(), 'tracker.db');

export interface User {
  id: string;
  name: string;
  role: string;
  department: string;
  pin_hash: string;
  created_at: string;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  required: boolean;
  options?: string[];
  defaultValue?: any;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  stages_json: string;
  fields_json: string;
  created_at: string;
}

export interface DocumentRecord {
  id: string;
  tracking_code: string;
  title: string;
  template_id: string;
  current_stage: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  origin_type: string;
  originating_office: string;
  current_office: string;
  action_required: string;
  assignee_id: string | null;
  assignee_name: string | null;
  custom_values_json: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentHistoryRecord {
  id: string;
  document_id: string;
  action: 'created' | 'stage_changed' | 'edited' | 'file_attached' | 'routed';
  from_stage: string | null;
  to_stage: string | null;
  from_office?: string | null;
  to_office?: string | null;
  action_required?: string | null;
  author_name: string;
  notes: string | null;
  created_at: string;
}

export const MUNICIPAL_OFFICES = [
  'Office of the Mayor',
  'Sangguniang Bayan / Panlungsod',
  'City Administrator',
  'Records & Archives Management',
  'City Budget Office',
  'City Accounting Office',
  'City Treasurer',
  'Business Permits & Licensing Office (BPLO)',
  'City Engineering & Building Official',
  'City Planning & Development (CPDO)',
  'City Legal Office',
  'City Health Office',
  'City Assessor',
  'General Services & Procurement (BAC)'
] as const;

export const ACTION_REQUIRED_OPTIONS = [
  "For Mayor's Signature / Approval",
  'For Legal Review & Opinion',
  'For Fund Certification & Budget Allocation',
  'For Committee Hearing & Deliberation',
  'For Technical Inspection & Field Audit',
  'For Assessment & Payment Processing',
  'For Official Endorsement / Transmittal',
  'For Release to Constituent / Client',
  'For Record-Keeping & Archival'
] as const;

let dbInstance: DatabaseSync | null = null;

export function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(`salt_lan_tracker_${pin}`).digest('hex');
}

export function verifyPin(pin: string, expectedHash: string): boolean {
  return hashPin(pin) === expectedHash;
}

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT NOT NULL DEFAULT 'FileText',
      stages_json TEXT NOT NULL,
      fields_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_dropdowns (
      key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      options_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      tracking_code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      template_id TEXT NOT NULL,
      current_stage TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'Normal',
      origin_type TEXT NOT NULL DEFAULT 'Internal Department',
      originating_office TEXT NOT NULL DEFAULT 'Records & Archives Management',
      current_office TEXT NOT NULL DEFAULT 'Records & Archives Management',
      action_required TEXT NOT NULL DEFAULT 'For Record-Keeping & Archival',
      assignee_id TEXT,
      assignee_name TEXT,
      custom_values_json TEXT NOT NULL DEFAULT '{}',
      attachment_path TEXT,
      attachment_name TEXT,
      attachment_size INTEGER,
      created_by_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS document_history (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      action TEXT NOT NULL,
      from_stage TEXT,
      to_stage TEXT,
      from_office TEXT,
      to_office TEXT,
      action_required TEXT,
      author_name TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_doc_template ON documents(template_id);
    CREATE INDEX IF NOT EXISTS idx_doc_stage ON documents(current_stage);
    CREATE INDEX IF NOT EXISTS idx_doc_code ON documents(tracking_code);
    CREATE INDEX IF NOT EXISTS idx_history_doc ON document_history(document_id);
  `);

  // Safe migration check for existing installations
  const docCols = (db.prepare('PRAGMA table_info(documents)').all() as any[]).map((c) => c.name);
  if (!docCols.includes('origin_type')) {
    db.exec(`ALTER TABLE documents ADD COLUMN origin_type TEXT NOT NULL DEFAULT 'Internal Department';`);
  }
  if (!docCols.includes('originating_office')) {
    db.exec(`ALTER TABLE documents ADD COLUMN originating_office TEXT NOT NULL DEFAULT 'Records & Archives Management';`);
  }
  if (!docCols.includes('current_office')) {
    db.exec(`ALTER TABLE documents ADD COLUMN current_office TEXT NOT NULL DEFAULT 'Records & Archives Management';`);
  }
  if (!docCols.includes('action_required')) {
    db.exec(`ALTER TABLE documents ADD COLUMN action_required TEXT NOT NULL DEFAULT 'For Record-Keeping & Archival';`);
  }

  const histCols = (db.prepare('PRAGMA table_info(document_history)').all() as any[]).map((c) => c.name);
  if (!histCols.includes('from_office')) {
    db.exec(`ALTER TABLE document_history ADD COLUMN from_office TEXT;`);
  }
  if (!histCols.includes('to_office')) {
    db.exec(`ALTER TABLE document_history ADD COLUMN to_office TEXT;`);
  }
  if (!histCols.includes('action_required')) {
    db.exec(`ALTER TABLE document_history ADD COLUMN action_required TEXT;`);
  }

  // Create indexes on migrated columns
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_doc_current_office ON documents(current_office);
    CREATE INDEX IF NOT EXISTS idx_doc_origin_office ON documents(originating_office);
  `);

  seedDefaultData(db);
}

function seedDefaultData(db: DatabaseSync) {
  const now = new Date().toISOString();

  // Ensure municipal office accounts exist
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, name, role, department, pin_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('u-admin', 'System Administrator', 'Admin', 'City IT / Operations', hashPin('1234'), now);
  insertUser.run('u-mayor', "Hon. Mayor's Executive Staff", 'Approver', 'Office of the Mayor', hashPin('1111'), now);
  insertUser.run('u-records', 'Records Custodian', 'Officer', 'Records & Archives Management', hashPin('2222'), now);
  insertUser.run('u-sanggunian', 'Sanggunian Secretary', 'Officer', 'Sangguniang Bayan / Panlungsod', hashPin('3333'), now);
  insertUser.run('u-treasurer', 'City Treasurer Office', 'Auditor', 'City Treasurer', hashPin('4444'), now);
  insertUser.run('u-bplo', 'BPLO Licensing Officer', 'Reviewer', 'Business Permits & Licensing Office (BPLO)', hashPin('5555'), now);
  insertUser.run('u-engineer', 'City Building Official', 'Reviewer', 'City Engineering & Building Official', hashPin('6666'), now);

  // Seed default system dropdown lists if not present
  const insertDropdown = db.prepare(`
    INSERT OR IGNORE INTO system_dropdowns (key, label, options_json, updated_at)
    VALUES (?, ?, ?, ?)
  `);
  insertDropdown.run('offices', 'Municipal Offices & Departments', JSON.stringify(MUNICIPAL_OFFICES), now);
  insertDropdown.run('actions', 'Action Required Directives', JSON.stringify(ACTION_REQUIRED_OPTIONS), now);
  insertDropdown.run('priorities', 'Priority Levels', JSON.stringify(['Low', 'Medium', 'High', 'Urgent']), now);
  insertDropdown.run('origin_types', 'Origin Types', JSON.stringify(['Internal (LGU Office / Department)', 'External (Citizen / Agency / Business)']), now);

  // Check if LGU templates exist
  const hasLguTpl = (db.prepare("SELECT COUNT(*) as count FROM templates WHERE id = 'tpl-ordinance'").get() as any)?.count ?? 0;
  if (hasLguTpl === 0) {
    const insertTemplate = db.prepare(`
      INSERT OR REPLACE INTO templates (id, name, description, icon, stages_json, fields_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // 1. Sanggunian Ordinance & Resolution
    insertTemplate.run(
      'tpl-ordinance',
      'Sanggunian Ordinance & Resolution',
      'Legislative measures, city ordinances, resolutions, committee hearings, and executive transmittals.',
      'Landmark',
      JSON.stringify([
        '1. First Reading (Referred to Committee)',
        '2. Committee Hearing & Report',
        '3. Second Reading (Debates & Amendments)',
        '4. Third & Final Reading (Passed)',
        '5. Transmitted to Mayor for Signature',
        '6. Enacted & Published'
      ]),
      JSON.stringify([
        {
          id: 'ordinance_no',
          name: 'Proposed Measure / Resolution #',
          type: 'text',
          required: true
        },
        {
          id: 'proponent',
          name: 'Principal Author / Councilor',
          type: 'text',
          required: true
        },
        {
          id: 'committee',
          name: 'Committee In-Charge',
          type: 'select',
          required: true,
          options: [
            'Committee on Laws, Rules & Internal Ethics',
            'Committee on Appropriations & Budget',
            'Committee on Infrastructure & Public Works',
            'Committee on Health, Sanitation & Environment',
            'Committee on Trade, Commerce & Industry',
            'Committee on Barangay Affairs'
          ]
        },
        {
          id: 'session_date',
          name: 'Regular Session Date',
          type: 'date',
          required: true
        },
        {
          id: 'purpose_summary',
          name: 'Legislative Intent & Title',
          type: 'text',
          required: true
        }
      ]),
      now
    );

    // 2. Disbursement Voucher & Procurement (BAC)
    insertTemplate.run(
      'tpl-dv',
      'Disbursement Voucher & BAC Procurement',
      'Government fund disbursements, supplier purchase vouchers, obligation certifications, and check releases.',
      'Receipt',
      JSON.stringify([
        '1. Obligation Request (CAFOA)',
        '2. Budget Certification',
        '3. Pre-Audit (Accounting Office)',
        '4. Cash Availability (City Treasurer)',
        '5. Office of the Mayor Approval',
        '6. Check Prepared & Released'
      ]),
      JSON.stringify([
        {
          id: 'payee',
          name: 'Payee / Contractor / Claimant',
          type: 'text',
          required: true
        },
        {
          id: 'dv_number',
          name: 'Disbursement Voucher Ref #',
          type: 'text',
          required: true
        },
        {
          id: 'amount',
          name: 'Total Net Amount (PHP)',
          type: 'number',
          required: true
        },
        {
          id: 'fund_source',
          name: 'Funding Source',
          type: 'select',
          required: true,
          options: [
            'General Fund (GF)',
            'Special Education Fund (SEF)',
            '20% Local Development Fund (LDF)',
            'Local Disaster Risk Reduction Fund (LDRRMF)',
            'Trust Fund (TF)'
          ]
        },
        {
          id: 'due_date',
          name: 'Target Release Date',
          type: 'date',
          required: false
        },
        {
          id: 'particulars',
          name: 'Particulars & Nature of Expense',
          type: 'text',
          required: true
        }
      ]),
      now
    );

    // 3. Business Permit & Licensing (BPLO)
    insertTemplate.run(
      'tpl-bplo',
      "Mayor's Business Permit & Licensing (BPLO)",
      'New business registration, annual renewals, fire & health clearances, tax assessments, and Mayor permit issuance.',
      'Briefcase',
      JSON.stringify([
        '1. Application Filed & Verification',
        '2. Zoning & Land Clearance',
        '3. BFP Fire & City Health Inspection',
        '4. Tax Assessment & Payment (Treasury)',
        '5. Mayor Business Permit Released'
      ]),
      JSON.stringify([
        {
          id: 'business_name',
          name: 'Registered Business Trade Name',
          type: 'text',
          required: true
        },
        {
          id: 'owner_name',
          name: 'Owner / Authorized Representative',
          type: 'text',
          required: true
        },
        {
          id: 'tin_number',
          name: 'Taxpayer Identification No. (TIN)',
          type: 'text',
          required: true
        },
        {
          id: 'barangay',
          name: 'Barangay Location',
          type: 'text',
          required: true
        },
        {
          id: 'business_nature',
          name: 'Line of Business',
          type: 'select',
          required: true,
          options: [
            'Retail & Commercial Merchandising',
            'Food & Restaurant Services',
            'Professional & Financial Services',
            'Manufacturing & Industrial',
            'Information Technology & BPO',
            'Contracting & Construction Services'
          ]
        },
        {
          id: 'declared_capital',
          name: 'Declared Capital / Gross Receipts (PHP)',
          type: 'number',
          required: true
        }
      ]),
      now
    );

    // 4. Citizen Grievance & Public Assistance
    insertTemplate.run(
      'tpl-citizen',
      'Citizen Grievance & Public Assistance',
      'Constituent letters, financial/medical assistance requests, community petitions, and barangay referrals.',
      'Users',
      JSON.stringify([
        '1. Ingested at Records / Helpdesk',
        '2. Endorsed by Mayor / Administrator',
        '3. Department Investigation & Action',
        '4. Official Resolution Prepared',
        '5. Transmitted to Constituent / Released'
      ]),
      JSON.stringify([
        {
          id: 'constituent_name',
          name: 'Constituent / Requesting Party',
          type: 'text',
          required: true
        },
        {
          id: 'contact_number',
          name: 'Contact Number / Mobile',
          type: 'text',
          required: true
        },
        {
          id: 'barangay_address',
          name: 'Barangay / Residential Address',
          type: 'text',
          required: true
        },
        {
          id: 'request_category',
          name: 'Assistance / Grievance Category',
          type: 'select',
          required: true,
          options: [
            'Medical / Hospitalization Assistance',
            'Social Welfare & Burial Assistance',
            'Public Works / Road & Drainage Maintenance',
            'Neighborhood & Boundary Dispute',
            'Barangay Resolution Endorsement'
          ]
        },
        {
          id: 'narrative',
          name: 'Summary of Request / Complaint',
          type: 'text',
          required: true
        }
      ]),
      now
    );

    // 5. Building & Civil Engineering Clearance (OBO)
    insertTemplate.run(
      'tpl-building',
      'Building & Civil Engineering Clearance (OBO)',
      'Building permit applications, structural blueprints, zoning clearances, and occupancy certificate processing.',
      'Layers',
      JSON.stringify([
        '1. Plans & Blueprints Submitted',
        '2. Line & Grade / Zoning Verification',
        '3. Structural, Electrical & Sanitary Audit',
        '4. Order of Payment Assessment',
        '5. Building Permit Released'
      ]),
      JSON.stringify([
        {
          id: 'project_name',
          name: 'Building Project / Structure Name',
          type: 'text',
          required: true
        },
        {
          id: 'applicant',
          name: 'Applicant / Property Owner',
          type: 'text',
          required: true
        },
        {
          id: 'lot_location',
          name: 'Site Address (Lot / Block / Street)',
          type: 'text',
          required: true
        },
        {
          id: 'survey_no',
          name: 'TCT / Cadastral Survey No.',
          type: 'text',
          required: false
        },
        {
          id: 'estimated_cost',
          name: 'Estimated Project Cost (PHP)',
          type: 'number',
          required: true
        }
      ]),
      now
    );
  }

  // Seed sample LGU documents if table is empty
  const docCount = (db.prepare('SELECT COUNT(*) as count FROM documents').get() as any)?.count ?? 0;
  if (docCount === 0) {
    const insertDoc = db.prepare(`
      INSERT INTO documents (
        id, tracking_code, title, template_id, current_stage, priority,
        origin_type, originating_office, current_office, action_required,
        assignee_id, assignee_name, custom_values_json, created_by_name,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertHist = db.prepare(`
      INSERT INTO document_history (
        id, document_id, action, from_stage, to_stage, from_office, to_office, action_required, author_name, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Sample 1: Sanggunian Ordinance
    insertDoc.run(
      'doc-lgu-01',
      'LGU-2026-0001',
      'Draft Ordinance: Comprehensive Solid Waste Management and Plastic Reduction Act of 2026',
      'tpl-ordinance',
      '2. Committee Hearing & Report',
      'High',
      'Internal Department',
      'Sangguniang Bayan / Panlungsod',
      'Sangguniang Bayan / Panlungsod',
      'For Committee Hearing & Deliberation',
      'u-sanggunian',
      'Sanggunian Secretary',
      JSON.stringify({
        ordinance_no: 'ORD-2026-014',
        proponent: 'Hon. Councilor Angela Ramirez',
        committee: 'Committee on Health, Sanitation & Environment',
        session_date: '2026-10-20',
        purpose_summary: 'Regulates single-use plastics and establishes barangay material recovery facilities (MRFs).'
      }),
      'Sanggunian Secretary',
      now,
      now
    );

    insertHist.run(
      'hist-lgu-01a',
      'doc-lgu-01',
      'created',
      null,
      '1. First Reading (Referred to Committee)',
      'Sangguniang Bayan / Panlungsod',
      'Sangguniang Bayan / Panlungsod',
      'For Committee Hearing & Deliberation',
      'Sanggunian Secretary',
      'Ordinance read on First Reading during 42nd Regular Session and referred to Committee on Environment.',
      now
    );

    insertHist.run(
      'hist-lgu-01b',
      'doc-lgu-01',
      'stage_changed',
      '1. First Reading (Referred to Committee)',
      '2. Committee Hearing & Report',
      'Sangguniang Bayan / Panlungsod',
      'Sangguniang Bayan / Panlungsod',
      'For Committee Hearing & Deliberation',
      'Sanggunian Secretary',
      'Public hearing scheduled with Liga ng mga Barangay and local commerce chamber.',
      now
    );

    // Sample 2: Disbursement Voucher
    insertDoc.run(
      'doc-lgu-02',
      'LGU-2026-0002',
      'Disbursement Voucher: Barangay San Isidro Multipurpose Evacuation Center Phase II',
      'tpl-dv',
      '3. Pre-Audit (Accounting Office)',
      'Urgent',
      'Internal Department',
      'City Engineering & Building Official',
      'City Accounting Office',
      'For Legal Review & Opinion',
      'u-records',
      'Records Custodian',
      JSON.stringify({
        payee: 'Apex Builders & Civil Works Corp.',
        dv_number: 'DV-2026-1089',
        amount: 2850000.00,
        fund_source: '20% Local Development Fund (LDF)',
        due_date: '2026-11-05',
        particulars: 'Progress billing (65% completion) for structural framing and roofing.'
      }),
      'City Building Official',
      now,
      now
    );

    insertHist.run(
      'hist-lgu-02a',
      'doc-lgu-02',
      'created',
      null,
      '1. Obligation Request (CAFOA)',
      'City Engineering & Building Official',
      'City Budget Office',
      'For Fund Certification & Budget Allocation',
      'City Building Official',
      'Obligation request submitted with engineering inspection report.',
      now
    );

    insertHist.run(
      'hist-lgu-02b',
      'doc-lgu-02',
      'routed',
      '1. Obligation Request (CAFOA)',
      '3. Pre-Audit (Accounting Office)',
      'City Budget Office',
      'City Accounting Office',
      'For Legal Review & Opinion',
      'Records Custodian',
      'Fund certified available under 20% LDF. Transmitted to Accounting for pre-audit checklist.',
      now
    );

    // Sample 3: Business Permit
    insertDoc.run(
      'doc-lgu-03',
      'LGU-2026-0003',
      'New Business Permit: GreenValley Fresh Agro-Trading & Distribution Center',
      'tpl-bplo',
      '4. Tax Assessment & Payment (Treasury)',
      'Normal',
      'External / Citizen / Barangay',
      'GreenValley Agro-Trading Inc.',
      'City Treasurer',
      'For Assessment & Payment Processing',
      'u-bplo',
      'BPLO Licensing Officer',
      JSON.stringify({
        business_name: 'GreenValley Fresh Agro-Trading & Distribution',
        owner_name: 'Roberto Valenzuela',
        tin_number: '241-890-554-000',
        barangay: 'Barangay San Pedro',
        business_nature: 'Retail & Commercial Merchandising',
        declared_capital: 750000.00
      }),
      'BPLO Licensing Officer',
      now,
      now
    );

    insertHist.run(
      'hist-lgu-03a',
      'doc-lgu-03',
      'created',
      null,
      '1. Application Filed & Verification',
      'Business Permits & Licensing Office (BPLO)',
      'Business Permits & Licensing Office (BPLO)',
      'For Assessment & Payment Processing',
      'BPLO Licensing Officer',
      'Initial application documents and DTI registration verified.',
      now
    );

    insertHist.run(
      'hist-lgu-03b',
      'doc-lgu-03',
      'routed',
      '3. BFP Fire & City Health Inspection',
      '4. Tax Assessment & Payment (Treasury)',
      'Business Permits & Licensing Office (BPLO)',
      'City Treasurer',
      'For Assessment & Payment Processing',
      'BPLO Licensing Officer',
      'Zoning and Fire Safety inspections passed. Forwarded to Treasury for Order of Payment.',
      now
    );
  }
}

// User methods
export function listUsers(): Omit<User, 'pin_hash'>[] {
  const db = getDb();
  return db.prepare('SELECT id, name, role, department, created_at FROM users ORDER BY name ASC').all() as any[];
}

export function getUserById(id: string): User | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
}

export function verifyUserPin(userId: string, pin: string): Omit<User, 'pin_hash'> | null {
  const user = getUserById(userId);
  if (!user) return null;
  if (!verifyPin(pin, user.pin_hash)) return null;
  const { pin_hash, ...safeUser } = user;
  return safeUser;
}

export function createUser(name: string, role: string, department: string, pin: string): Omit<User, 'pin_hash'> {
  const db = getDb();
  const id = `u-${Date.now()}`;
  const now = new Date().toISOString();
  const pinHash = hashPin(pin);

  db.prepare(`
    INSERT INTO users (id, name, role, department, pin_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, role, department, pinHash, now);

  return { id, name, role, department, created_at: now };
}

export function updateUser(
  id: string,
  updates: { name?: string; role?: string; department?: string; pin?: string }
): Omit<User, 'pin_hash'> | null {
  const db = getDb();
  const existing = getUserById(id);
  if (!existing) return null;

  const name = updates.name?.trim() || existing.name;
  const role = updates.role?.trim() || existing.role;
  const department = updates.department?.trim() || existing.department;
  const pinHash = updates.pin && updates.pin.trim().length === 4
    ? hashPin(updates.pin.trim())
    : existing.pin_hash;

  db.prepare(`
    UPDATE users
    SET name = ?, role = ?, department = ?, pin_hash = ?
    WHERE id = ?
  `).run(name, role, department, pinHash, id);

  return { id, name, role, department, created_at: existing.created_at };
}

export function deleteUser(id: string): { success: boolean; error?: string } {
  const db = getDb();
  const user = getUserById(id);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Prevent deleting the sole Admin account
  if (user.role.toLowerCase() === 'admin') {
    const adminCount = (db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE LOWER(role) = 'admin'
    `).get() as any)?.count ?? 0;
    if (adminCount <= 1) {
      return { success: false, error: 'Cannot delete the sole Administrator account.' };
    }
  }

  const res = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return { success: (res.changes ?? 0) > 0 };
}

// Template methods
export function listTemplates(): Template[] {
  const db = getDb();
  return db.prepare('SELECT * FROM templates ORDER BY name ASC').all() as any[];
}

export function getTemplateById(id: string): Template | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as any;
}

export function createTemplate(name: string, description: string, icon: string, stages: string[], fields: CustomFieldDefinition[]): Template {
  const db = getDb();
  const id = `tpl-${Date.now()}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO templates (id, name, description, icon, stages_json, fields_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, description || '', icon || 'FileText', JSON.stringify(stages), JSON.stringify(fields), now);
  return {
    id,
    name,
    description,
    icon: icon || 'FileText',
    stages_json: JSON.stringify(stages),
    fields_json: JSON.stringify(fields),
    created_at: now
  };
}

export function updateTemplate(id: string, name: string, description: string, icon: string, stages: string[], fields: CustomFieldDefinition[]): Template | null {
  const db = getDb();
  const existing = getTemplateById(id);
  if (!existing) return null;
  db.prepare(`
    UPDATE templates
    SET name = ?, description = ?, icon = ?, stages_json = ?, fields_json = ?
    WHERE id = ?
  `).run(name, description, icon, JSON.stringify(stages), JSON.stringify(fields), id);
  return getTemplateById(id) || null;
}

export function deleteTemplate(id: string): boolean {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) as count FROM documents WHERE template_id = ?').get(id) as any)?.count ?? 0;
  if (count > 0) {
    throw new Error(`Cannot delete template: ${count} document(s) are currently linked to it.`);
  }
  const result = db.prepare('DELETE FROM templates WHERE id = ?').run(id);
  return (result.changes ?? 0) > 0;
}

// Document methods
export function generateTrackingCode(): string {
  const db = getDb();
  const year = new Date().getFullYear();
  const prefix = `LGU-${year}-`;
  const latest = db.prepare(`
    SELECT tracking_code FROM documents
    WHERE tracking_code LIKE ? OR tracking_code LIKE ?
    ORDER BY id DESC
    LIMIT 1
  `).get(`${prefix}%`, `TRK-${year}-%`) as { tracking_code: string } | undefined;

  let nextNum = 1;
  if (latest) {
    const numPart = latest.tracking_code.replace(/^(LGU|TRK)-\d{4}-/, '');
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed)) {
      nextNum = parsed + 1;
    }
  }
  return `${prefix}${nextNum.toString().padStart(4, '0')}`;
}

export interface ListDocumentsFilter {
  template_id?: string;
  stage?: string;
  search?: string;
  priority?: string;
  assignee_id?: string;
  current_office?: string;
  origin_type?: string;
}

export function listDocuments(filters?: ListDocumentsFilter): DocumentRecord[] {
  const db = getDb();
  let sql = 'SELECT * FROM documents WHERE 1=1';
  const params: any[] = [];

  if (filters?.template_id) {
    sql += ' AND template_id = ?';
    params.push(filters.template_id);
  }
  if (filters?.stage) {
    sql += ' AND current_stage = ?';
    params.push(filters.stage);
  }
  if (filters?.priority) {
    sql += ' AND priority = ?';
    params.push(filters.priority);
  }
  if (filters?.assignee_id) {
    sql += ' AND assignee_id = ?';
    params.push(filters.assignee_id);
  }
  if (filters?.current_office) {
    sql += ' AND current_office = ?';
    params.push(filters.current_office);
  }
  if (filters?.origin_type) {
    sql += ' AND origin_type = ?';
    params.push(filters.origin_type);
  }
  if (filters?.search) {
    sql += ' AND (title LIKE ? OR tracking_code LIKE ? OR originating_office LIKE ? OR current_office LIKE ? OR action_required LIKE ? OR custom_values_json LIKE ?)';
    const term = `%${filters.search}%`;
    params.push(term, term, term, term, term, term);
  }

  sql += ' ORDER BY updated_at DESC';
  return db.prepare(sql).all(...params) as any[];
}

export function getDocumentById(id: string): DocumentRecord | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
}

export function createDocument(data: {
  title: string;
  template_id: string;
  priority?: 'Low' | 'Normal' | 'High' | 'Urgent';
  origin_type?: string;
  originating_office?: string;
  current_office?: string;
  action_required?: string;
  assignee_id?: string | null;
  assignee_name?: string | null;
  custom_values: Record<string, any>;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  author_name: string;
  notes?: string;
}): DocumentRecord {
  const db = getDb();
  const template = getTemplateById(data.template_id);
  if (!template) {
    throw new Error('Invalid template_id');
  }

  const stages: string[] = JSON.parse(template.stages_json);
  const initialStage = stages[0] || 'Draft';

  const docId = `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const trackingCode = generateTrackingCode();
  const now = new Date().toISOString();

  const originType = data.origin_type || 'Internal Department';
  const originatingOffice = data.originating_office || 'Records & Archives Management';
  const currentOffice = data.current_office || originatingOffice;
  const actionRequired = data.action_required || "For Mayor's Signature / Approval";

  db.prepare(`
    INSERT INTO documents (
      id, tracking_code, title, template_id, current_stage, priority,
      origin_type, originating_office, current_office, action_required,
      assignee_id, assignee_name, custom_values_json,
      attachment_path, attachment_name, attachment_size,
      created_by_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    docId,
    trackingCode,
    data.title,
    data.template_id,
    initialStage,
    data.priority || 'Normal',
    originType,
    originatingOffice,
    currentOffice,
    actionRequired,
    data.assignee_id || null,
    data.assignee_name || null,
    JSON.stringify(data.custom_values || {}),
    data.attachment_path || null,
    data.attachment_name || null,
    data.attachment_size || null,
    data.author_name,
    now,
    now
  );

  // Add creation history
  const histId = `hist-${Date.now()}`;
  db.prepare(`
    INSERT INTO document_history (
      id, document_id, action, from_stage, to_stage, from_office, to_office, action_required, author_name, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    histId,
    docId,
    'created',
    null,
    initialStage,
    originatingOffice,
    currentOffice,
    actionRequired,
    data.author_name,
    data.notes || 'Document ingested into LGU tracking workflow.',
    now
  );

  return getDocumentById(docId)!;
}

export function advanceDocumentStage(
  documentId: string,
  targetStage: string,
  authorName: string,
  notes?: string
): DocumentRecord {
  const db = getDb();
  const doc = getDocumentById(documentId);
  if (!doc) throw new Error('Document not found');

  const template = getTemplateById(doc.template_id);
  if (!template) throw new Error('Template not found');

  const stages: string[] = JSON.parse(template.stages_json);
  if (!stages.includes(targetStage)) {
    throw new Error(`Target stage '${targetStage}' is not defined for this template`);
  }

  const prevStage = doc.current_stage;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE documents
    SET current_stage = ?, updated_at = ?
    WHERE id = ?
  `).run(targetStage, now, documentId);

  const histId = `hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  db.prepare(`
    INSERT INTO document_history (
      id, document_id, action, from_stage, to_stage, from_office, to_office, action_required, author_name, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    histId,
    documentId,
    'stage_changed',
    prevStage,
    targetStage,
    doc.current_office,
    doc.current_office,
    doc.action_required,
    authorName,
    notes || `Workflow stage transitioned from ${prevStage} to ${targetStage}`,
    now
  );

  return getDocumentById(documentId)!;
}

export function routeDocument(
  documentId: string,
  toOffice: string,
  actionRequired: string,
  authorName: string,
  notes?: string
): DocumentRecord {
  const db = getDb();
  const doc = getDocumentById(documentId);
  if (!doc) throw new Error('Document not found');

  const fromOffice = doc.current_office || 'Records & Archives Management';
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE documents
    SET current_office = ?, action_required = ?, updated_at = ?
    WHERE id = ?
  `).run(toOffice, actionRequired, now, documentId);

  const histId = `hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  db.prepare(`
    INSERT INTO document_history (
      id, document_id, action, from_stage, to_stage, from_office, to_office, action_required, author_name, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    histId,
    documentId,
    'routed',
    doc.current_stage,
    doc.current_stage,
    fromOffice,
    toOffice,
    actionRequired,
    authorName,
    notes || `Document routed to ${toOffice} (${actionRequired})`,
    now
  );

  return getDocumentById(documentId)!;
}

export function updateDocument(
  documentId: string,
  updates: {
    title?: string;
    priority?: 'Low' | 'Normal' | 'High' | 'Urgent';
    origin_type?: string;
    originating_office?: string;
    current_office?: string;
    action_required?: string;
    assignee_id?: string | null;
    assignee_name?: string | null;
    custom_values?: Record<string, any>;
    attachment_path?: string | null;
    attachment_name?: string | null;
    attachment_size?: number | null;
    author_name: string;
    notes?: string;
  }
): DocumentRecord {
  const db = getDb();
  const doc = getDocumentById(documentId);
  if (!doc) throw new Error('Document not found');

  const now = new Date().toISOString();
  const title = updates.title ?? doc.title;
  const priority = updates.priority ?? doc.priority;
  const originType = updates.origin_type ?? doc.origin_type;
  const originatingOffice = updates.originating_office ?? doc.originating_office;
  const currentOffice = updates.current_office ?? doc.current_office;
  const actionRequired = updates.action_required ?? doc.action_required;
  const assigneeId = updates.assignee_id !== undefined ? updates.assignee_id : doc.assignee_id;
  const assigneeName = updates.assignee_name !== undefined ? updates.assignee_name : doc.assignee_name;
  const customValuesJson = updates.custom_values ? JSON.stringify(updates.custom_values) : doc.custom_values_json;
  const attachmentPath = updates.attachment_path !== undefined ? updates.attachment_path : doc.attachment_path;
  const attachmentName = updates.attachment_name !== undefined ? updates.attachment_name : doc.attachment_name;
  const attachmentSize = updates.attachment_size !== undefined ? updates.attachment_size : doc.attachment_size;

  db.prepare(`
    UPDATE documents
    SET title = ?, priority = ?, origin_type = ?, originating_office = ?,
        current_office = ?, action_required = ?, assignee_id = ?, assignee_name = ?,
        custom_values_json = ?, attachment_path = ?, attachment_name = ?,
        attachment_size = ?, updated_at = ?
    WHERE id = ?
  `).run(
    title,
    priority,
    originType,
    originatingOffice,
    currentOffice,
    actionRequired,
    assigneeId,
    assigneeName,
    customValuesJson,
    attachmentPath,
    attachmentName,
    attachmentSize,
    now,
    documentId
  );

  const histId = `hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  db.prepare(`
    INSERT INTO document_history (
      id, document_id, action, from_stage, to_stage, from_office, to_office, action_required, author_name, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    histId,
    documentId,
    'edited',
    doc.current_stage,
    doc.current_stage,
    currentOffice,
    currentOffice,
    actionRequired,
    updates.author_name,
    updates.notes || 'Document details and attributes updated.',
    now
  );

  return getDocumentById(documentId)!;
}

export function getDocumentHistory(documentId: string): DocumentHistoryRecord[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM document_history
    WHERE document_id = ?
    ORDER BY created_at DESC
  `).all(documentId) as any[];
}

export function getSummaryMetrics() {
  const db = getDb();
  const totalDocs = (db.prepare('SELECT COUNT(*) as count FROM documents').get() as any)?.count ?? 0;
  const stageBreakdown = db.prepare(`
    SELECT current_stage, COUNT(*) as count
    FROM documents
    GROUP BY current_stage
  `).all() as { current_stage: string; count: number }[];

  const priorityBreakdown = db.prepare(`
    SELECT priority, COUNT(*) as count
    FROM documents
    GROUP BY priority
  `).all() as { priority: string; count: number }[];

  const officeBreakdown = db.prepare(`
    SELECT current_office, COUNT(*) as count
    FROM documents
    GROUP BY current_office
    ORDER BY count DESC
  `).all() as { current_office: string; count: number }[];

  const recentHistory = db.prepare(`
    SELECT h.*, d.title as document_title, d.tracking_code
    FROM document_history h
    JOIN documents d ON h.document_id = d.id
    ORDER BY h.created_at DESC
    LIMIT 10
  `).all() as any[];

  return {
    totalDocs,
    stageBreakdown,
    priorityBreakdown,
    officeBreakdown,
    recentHistory
  };
}

export function deleteDocument(id: string): boolean {
  const db = getDb();
  db.prepare('DELETE FROM document_history WHERE document_id = ?').run(id);
  const result = db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  return (result.changes ?? 0) > 0;
}

export function deleteHistoryEntry(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM document_history WHERE id = ?').run(id);
  return (result.changes ?? 0) > 0;
}

export interface SystemDropdown {
  key: string;
  label: string;
  options: string[];
  updated_at?: string;
}

export function getAllDropdowns(): Record<string, SystemDropdown> {
  const db = getDb();
  const rows = db.prepare('SELECT key, label, options_json, updated_at FROM system_dropdowns ORDER BY key ASC').all() as any[];
  const result: Record<string, SystemDropdown> = {};
  for (const row of rows) {
    try {
      result[row.key] = {
        key: row.key,
        label: row.label,
        options: JSON.parse(row.options_json),
        updated_at: row.updated_at
      };
    } catch {
      result[row.key] = {
        key: row.key,
        label: row.label,
        options: [],
        updated_at: row.updated_at
      };
    }
  }
  return result;
}

export function getDropdownOptions(key: string): string[] {
  const db = getDb();
  const row = db.prepare('SELECT options_json FROM system_dropdowns WHERE key = ?').get(key) as any;
  if (!row) {
    if (key === 'offices') return [...MUNICIPAL_OFFICES];
    if (key === 'actions') return [...ACTION_REQUIRED_OPTIONS];
    if (key === 'priorities') return ['Low', 'Medium', 'High', 'Urgent'];
    if (key === 'origin_types') return ['Internal (LGU Office / Department)', 'External (Citizen / Agency / Business)'];
    return [];
  }
  try {
    return JSON.parse(row.options_json);
  } catch {
    return [];
  }
}

export function updateDropdown(key: string, options: string[]): SystemDropdown {
  const db = getDb();
  const cleanOptions = options.map((o) => (typeof o === 'string' ? o.trim() : '')).filter(Boolean);
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT label FROM system_dropdowns WHERE key = ?').get(key) as any;
  let label = existing?.label;
  if (!label) {
    if (key === 'offices') label = 'Municipal Offices & Departments';
    else if (key === 'actions') label = 'Action Required Directives';
    else if (key === 'priorities') label = 'Priority Levels';
    else if (key === 'origin_types') label = 'Origin Types';
    else label = key.replace(/_/g, ' ').toUpperCase();
  }

  db.prepare(`
    INSERT INTO system_dropdowns (key, label, options_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      options_json = excluded.options_json,
      updated_at = excluded.updated_at
  `).run(key, label, JSON.stringify(cleanOptions), now);

  return { key, label, options: cleanOptions, updated_at: now };
}

export function resetDropdown(key: string): SystemDropdown {
  let defaults: string[] = [];
  if (key === 'offices') {
    defaults = [...MUNICIPAL_OFFICES];
  } else if (key === 'actions') {
    defaults = [...ACTION_REQUIRED_OPTIONS];
  } else if (key === 'priorities') {
    defaults = ['Low', 'Medium', 'High', 'Urgent'];
  } else if (key === 'origin_types') {
    defaults = ['Internal (LGU Office / Department)', 'External (Citizen / Agency / Business)'];
  }
  return updateDropdown(key, defaults);
}

