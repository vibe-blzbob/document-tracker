import { describe, it, expect, beforeAll } from 'vitest';
import {
  listUsers,
  verifyUserPin,
  createUser,
  updateUser,
  deleteUser,
  listTemplates,
  createTemplate,
  listDocuments,
  createDocument,
  advanceDocumentStage,
  routeDocument,
  getDocumentHistory,
  deleteDocument,
  deleteHistoryEntry,
  getSummaryMetrics,
  MUNICIPAL_OFFICES,
  ACTION_REQUIRED_OPTIONS,
  getAllDropdowns,
  getDropdownOptions,
  updateDropdown,
  resetDropdown,
  resetDatabase
} from './db.js';

describe('DocTrack LGU - Document Tracking & Routing System Test Suite', () => {
  beforeAll(() => {
    // Reset database to guarantee fresh migrations and single process seed
    resetDatabase();
  });

  describe('Phase 1: Municipal Accounts, Roles & PIN Authentication', () => {
    it('should have seeded municipal department users', () => {
      const users = listUsers();
      expect(users.length).toBeGreaterThanOrEqual(4);

      const admin = users.find((u) => u.role === 'Admin');
      expect(admin).toBeDefined();

      const mayorStaff = users.find((u) => u.department === 'Office of the Mayor');
      expect(mayorStaff).toBeDefined();

      const records = users.find((u) => u.department === 'Records & Archives Management');
      expect(records).toBeDefined();
    });

    it('should authenticate municipal staff with valid PIN', () => {
      const users = listUsers();
      const records = users.find((u) => u.department === 'Records & Archives Management')!;
      const authenticated = verifyUserPin(records.id, '2222');
      expect(authenticated).not.toBeNull();
      expect(authenticated?.id).toBe(records.id);
      expect((authenticated as any).pin_hash).toBeUndefined(); // Never leaks hash
    });

    it('should reject invalid PIN', () => {
      const users = listUsers();
      const admin = users.find((u) => u.role === 'Admin')!;
      const failed = verifyUserPin(admin.id, '0000');
      expect(failed).toBeNull();
    });

    it('should create new municipal officer accounts with hashed PIN', () => {
      const newUser = createUser('Officer Carla Gomez', 'Inspector', 'City Health Office', '7777');
      expect(newUser.name).toBe('Officer Carla Gomez');
      expect(newUser.department).toBe('City Health Office');

      const verified = verifyUserPin(newUser.id, '7777');
      expect(verified).not.toBeNull();
      expect(verified?.name).toBe('Officer Carla Gomez');

      // Update user details & PIN
      const updated = updateUser(newUser.id, {
        name: 'Inspector Carla Gomez-Santos',
        role: 'Chief Inspector',
        pin: '8888'
      });
      expect(updated?.name).toBe('Inspector Carla Gomez-Santos');
      expect(updated?.role).toBe('Chief Inspector');

      // Old PIN must fail, new PIN must succeed
      expect(verifyUserPin(newUser.id, '7777')).toBeNull();
      expect(verifyUserPin(newUser.id, '8888')).not.toBeNull();

      // Delete user
      const deleted = deleteUser(newUser.id);
      expect(deleted.success).toBe(true);
      expect(verifyUserPin(newUser.id, '8888')).toBeNull();

      // Sole admin deletion guard
      const adminUsers = listUsers().filter((u) => u.role === 'Admin');
      if (adminUsers.length === 1) {
        const soleAdminDelete = deleteUser(adminUsers[0].id);
        expect(soleAdminDelete.success).toBe(false);
        expect(soleAdminDelete.error).toContain('sole Administrator');
      }
    });
  });

  describe('Phase 2: LGU Templates & Schema Customization', () => {
    it('should have seeded standard local government document templates', () => {
      const templates = listTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(1);

      const dvTpl = templates.find((t) => t.id === 'tpl-dv');
      expect(dvTpl).toBeDefined();
      const dvStages = JSON.parse(dvTpl!.stages_json);
      const dvFields = JSON.parse(dvTpl!.fields_json);

      expect(dvStages).toContain('1. Obligation Request (CAFOA)');
      expect(dvStages).toContain('5. Check Issued and Released to Payee');
      expect(dvFields.some((f: any) => f.id === 'payee_name')).toBe(true);
      expect(dvFields.some((f: any) => f.id === 'amount')).toBe(true);
    });

    it('should allow creating custom municipal templates', () => {
      const customTpl = createTemplate(
        'Barangay Clearance Endorsement',
        'Tracks barangay resolution endorsements transmitted to City Council.',
        'FileText',
        ['Filed at Barangay', 'Endorsed to ABC', 'Reviewed by Sanggunian', 'Affirmed'],
        [
          { id: 'barangay_name', name: 'Barangay Name', type: 'text', required: true },
          { id: 'punong_barangay', name: 'Punong Barangay (Captain)', type: 'text', required: true }
        ]
      );

      expect(customTpl.id).toBeDefined();
      expect(customTpl.name).toBe('Barangay Clearance Endorsement');
      const loaded = listTemplates().find((t) => t.id === customTpl.id);
      expect(loaded).toBeDefined();
    });
  });

  describe('Phase 3: LGU Document Creation, Custodial Routing & Office Queues', () => {
    let testDocId: string;

    it('should create a document with LGU routing metadata', () => {
      const doc = createDocument({
        title: 'Disbursement Voucher: Emergency Medical Supplies Procurement',
        template_id: 'tpl-dv',
        priority: 'High',
        origin_type: 'Internal Department',
        originating_office: 'City Accounting Office',
        current_office: 'City Accounting Office',
        action_required: 'For Fund Certification & Budget Allocation',
        author_name: 'City Accountant',
        custom_values: {
          payee_name: 'MedTech Supplies Inc.',
          amount: 250000,
          fund_source: 'General Fund (GF)',
          dv_no: 'DV-2026-10-0992',
          particulars: 'Emergency medical response consumables.'
        },
        notes: 'Submitted for CAFOA certification.'
      });

      expect(doc).toBeDefined();
      expect(doc.tracking_code).toMatch(/^(LGU|TRK)-\d{4}-\d{4}$/);
      expect(doc.origin_type).toBe('Internal Department');
      expect(doc.originating_office).toBe('City Accounting Office');
      expect(doc.current_office).toBe('City Accounting Office');
      expect(doc.action_required).toBe('For Fund Certification & Budget Allocation');
      testDocId = doc.id;

      const history = getDocumentHistory(testDocId);
      expect(history.length).toBe(1);
      expect(history[0].action).toBe('created');
      expect(history[0].author_name).toBe('City Accountant');
    });

    it('should filter documents by current holding office queue', () => {
      const filtered = listDocuments({ current_office: 'City Accounting Office' });
      expect(filtered.some((d) => d.id === testDocId)).toBe(true);

      const otherOfficeDocs = listDocuments({ current_office: 'City Health Office' });
      expect(otherOfficeDocs.some((d) => d.id === testDocId)).toBe(false);
    });

    it('should advance workflow stage and record audit log', () => {
      const updated = advanceDocumentStage(
        testDocId,
        '2. City Accounting Pre-Audit',
        'City Accountant',
        'Pre-audit examination completed with CAFOA certified.'
      );

      expect(updated.current_stage).toBe('2. City Accounting Pre-Audit');

      const history = getDocumentHistory(testDocId);
      expect(history.length).toBe(2);
      expect(history[0].action).toBe('stage_changed');
      expect(history[0].to_stage).toBe('2. City Accounting Pre-Audit');
    });

    it('should route document to another municipal office with custodial handover', () => {
      const routed = routeDocument(
        testDocId,
        'Office of the Mayor',
        "For Mayor's Signature / Approval",
        'City Accountant',
        'Transmitted to Mayor for executive signature.'
      );

      expect(routed.current_office).toBe('Office of the Mayor');
      expect(routed.action_required).toBe("For Mayor's Signature / Approval");

      const history = getDocumentHistory(testDocId);
      expect(history.length).toBe(3);
      expect(history[0].action).toBe('routed');
      expect(history[0].from_office).toBe('City Accounting Office');
      expect(history[0].to_office).toBe('Office of the Mayor');
      expect(history[0].action_required).toBe("For Mayor's Signature / Approval");
      expect(history[0].notes).toContain('executive signature');

      // Verify that it now appears in the Mayor Office queue
      const mayorQueue = listDocuments({ current_office: 'Office of the Mayor' });
      expect(mayorQueue.some((d) => d.id === testDocId)).toBe(true);
    });

    it('should compute summary metrics including office breakdown', () => {
      const metrics = getSummaryMetrics();
      expect(metrics.totalDocs).toBeGreaterThanOrEqual(1);
      expect(metrics.stageBreakdown.length).toBeGreaterThan(0);
      expect(metrics.officeBreakdown.length).toBeGreaterThan(0);
      expect(metrics.recentHistory.length).toBeGreaterThan(0);
    });

    it('Admin can delete registry history log entries and documents', () => {
      const history = getDocumentHistory(testDocId);
      const entryToDelete = history[0];
      const deletedEntry = deleteHistoryEntry(entryToDelete.id);
      expect(deletedEntry).toBe(true);

      const afterHistory = getDocumentHistory(testDocId);
      expect(afterHistory.length).toBe(history.length - 1);

      const deletedDoc = deleteDocument(testDocId);
      expect(deletedDoc).toBe(true);

      const remainingHistory = getDocumentHistory(testDocId);
      expect(remainingHistory.length).toBe(0);
    });
  });

  describe('Phase 4: Municipal Constants & Enums Integrity', () => {
    it('should have standard municipal departments defined', () => {
      expect(MUNICIPAL_OFFICES.length).toBeGreaterThanOrEqual(10);
      expect(MUNICIPAL_OFFICES).toContain('Office of the Mayor');
      expect(MUNICIPAL_OFFICES).toContain('City Treasurer');
      expect(MUNICIPAL_OFFICES).toContain('Business Permits & Licensing Office (BPLO)');
    });

    it('should have standard action-required options defined', () => {
      expect(ACTION_REQUIRED_OPTIONS.length).toBeGreaterThanOrEqual(5);
      expect(ACTION_REQUIRED_OPTIONS).toContain("For Mayor's Signature / Approval");
      expect(ACTION_REQUIRED_OPTIONS).toContain('For Fund Certification & Budget Allocation');
    });

    it('should retrieve all system dropdowns from SQLite', () => {
      const dropdowns = getAllDropdowns();
      expect(dropdowns.offices).toBeDefined();
      expect(dropdowns.actions).toBeDefined();
      expect(dropdowns.priorities).toBeDefined();
      expect(dropdowns.origin_types).toBeDefined();
      expect(dropdowns.offices.options).toContain('Office of the Mayor');
    });

    it('Admin can edit dropdown options and persist to SQLite', () => {
      const customOffices = [
        'Office of the Mayor',
        'Sangguniang Bayan / Panlungsod',
        'MDRRMO Disaster Office'
      ];
      const updated = updateDropdown('offices', customOffices);
      expect(updated.options).toEqual(customOffices);

      const retrieved = getDropdownOptions('offices');
      expect(retrieved).toEqual(customOffices);

      // Restore defaults
      const reset = resetDropdown('offices');
      expect(reset.options).toContain('Office of the Mayor');
      expect(reset.options.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Phase 5: Security & Input Validation Hardening', () => {
    it('should reject non-numeric or non-4-digit PINs during user creation', () => {
      expect(() => createUser('Invalid User 1', 'Officer', 'Health', '123')).toThrow('exactly 4 numeric digits');
      expect(() => createUser('Invalid User 2', 'Officer', 'Health', '12345')).toThrow('exactly 4 numeric digits');
      expect(() => createUser('Invalid User 3', 'Officer', 'Health', 'abcd')).toThrow('exactly 4 numeric digits');
    });

    it('should reject non-numeric PINs during user update', () => {
      const u = createUser('Test Pin Officer', 'Officer', 'Health', '9999');
      expect(() => updateUser(u.id, { pin: 'xyz1' })).toThrow('exactly 4 numeric digits');
      deleteUser(u.id);
    });
  });
});
