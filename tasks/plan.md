# Implementation Plan: LGU Document Tracking and Routing System (DocTrack LGU)

## Overview
Repurpose and restructure the local network document tracking application into a specialized **Local Government Unit (LGU) Document Tracking and Routing System (DTS)**. The system facilitates transparent, accountable, office-to-office routing of government documents (such as Sanggunian Ordinances, Disbursement Vouchers, Business Permits, Citizen Petitions, and Building Permits) across municipal departments with custodial handover logging, action-required flagging, and instant printable 1-page transmittal routing slips.

---

## Architecture Decisions

- **Office-to-Office Custodial Routing Model**:
  In local government workflows, documents move physically and digitally from department to department. We extend the document record with:
  - `origin_type`: `'External / Citizen / Barangay'` | `'Internal Department'`
  - `originating_office`: Entity that filed or originated the document (e.g. "Barangay Poblacion", "Citizen Juan Dela Cruz", "City Health Office")
  - `current_office`: Municipal office currently holding custody (e.g. "Office of the Mayor", "City Treasurer", "Sangguniang Bayan", "BPLO", "City Engineering")
  - `action_required`: Immediate action expected (e.g. "For Mayor's Signature", "For Legal Review", "For Fund Certification", "For Committee Hearing", "For Inspection", "For Release to Citizen")
- **Backward-Compatible Schema Migration (SQLite)**:
  Use standard `node:sqlite` table introspection (`PRAGMA table_info(documents)`) and `ALTER TABLE documents ADD COLUMN` so existing database records are preserved while adding LGU routing fields with sensible defaults.
- **Official LGU Seed Data & Workflows**:
  Seed 5 standard local government templates and municipal office accounts:
  1. *Sanggunian Ordinance & Resolution* (First Reading → Committee Hearing → Second Reading → Third/Final Reading → Enacted/Mayor Signed → Published/Archived)
  2. *Disbursement Voucher & BAC Procurement* (Obligation Request → Budget Certification → Pre-Audit → Treasurer Check → Mayor Approval → Check Released)
  3. *Business Permit & Licensing (BPLO)* (Application Filed → Zoning Check → Fire & Sanitary Clearance → Tax Assessment → Mayor's Permit Issued)
  4. *Citizen Grievance & Public Assistance* (Received at Records → Endorsed to Department → Field Inspection/Action → Released to Constituent)
  5. *Building & Civil Engineering Clearance* (Plans Submitted → Zoning & Grade Review → Structural/Electrical Check → Permit Issued)
- **Zero-Dependency Native Printable Routing Slip (`@media print`)**:
  In accordance with `/ponytail` (Rung 4: Native platform feature), avoid heavy PDF rendering engines (Puppeteer/pdfmake). Instead, implement a clean, formal LGU Transmittal & Routing Slip modal rendered with standard CSS and native `window.print()`, formatted for 1-page paper with tracking QR code, receiving signature blocks, and action checklist.
- **Contract-First API Design (`/api-and-interface-design`)**:
  Define explicit, strongly-typed request and response schemas for office routing (`POST /api/documents/:id/route`), office list retrieval (`GET /api/offices`), and office filtering (`GET /api/documents?current_office=...`).

---

## Dependency Graph
```
Database Schema Migration (ALTER TABLE documents)
    │
    ├── LGU Domain Types & API Contracts (src/types.ts & server/db.ts)
    │       │
    │       ├── LGU Seed Templates & Municipal Department Users
    │       │       │
    │       │       ├── REST Endpoints: Office Routing & Office Filtering
    │       │       │       │
    │       │       │       ├── Frontend API Client (src/api.ts)
    │       │       │       │       │
    │       │       │       │       ├── LGU UI Components (Office Filter, Route Handover Modal)
    │       │       │       │       │
    │       │       │       │       └── Printable LGU Routing Slip (window.print())
    │       │
    │       └── Automated Test Suite (server/api.test.ts)
```

---

## Vertical Slices & Task Breakdown

### Phase 1: Foundation, LGU Schema & Domain Models
- **Task 1: Database Migration & LGU Schema Extensions**
  - Add `origin_type`, `originating_office`, `current_office`, and `action_required` columns to `documents` table via automatic migration.
  - Update `server/db.ts` and `src/types.ts` with LGU types, department enums, and action enums.
  - *Acceptance criteria*: DB schema migrates without data loss; new document records support LGU routing fields.
  - *Verification*: `npm test` runs schema checks; columns present in `tracker.db`.

- **Task 2: LGU Official Templates & Municipal Department Users**
  - Seed municipal office accounts (Office of the Mayor, Sangguniang Bayan, City Treasurer, Records Management, BPLO, City Engineering).
  - Seed 5 standard LGU templates with realistic stages and custom fields.
  - *Acceptance criteria*: New installations or refreshed DBs have LGU templates and department users ready.
  - *Verification*: Vitest checks templates count and user department structure.

### Phase 2: Backend API & Office Routing Contracts
- **Task 3: Office Routing & Transfer Endpoint (`POST /api/documents/:id/route`)**
  - Implement `/api/documents/:id/route` allowing users to transfer custody from `from_office` to `to_office`, update `action_required`, and log an immutable routing audit trail entry.
  - Update `GET /api/documents` to support filtering by `current_office` and `origin_type`.
  - Add `GET /api/offices` endpoint returning standard municipal offices and action required types.
  - *Acceptance criteria*: Documents can be routed between departments with audit logging; filtering by office works.
  - *Verification*: Vitest integration tests for `/route` endpoint and office query filters.

### Phase 3: Frontend UI Restructure & Office Queues
- **Task 4: LGU Branding, Document Creation & Office Filtering**
  - Update branding, headers, and terminology to "DocTrack LGU — Document Routing Information System".
  - In `DocumentFormModal.tsx`, add fields for `origin_type`, `originating_office`, `target_office`, and `action_required`.
  - In `DocumentList.tsx`, add an "Office Queue" filter dropdown so staff can see documents currently at their department.
  - *Acceptance criteria*: Staff can file new documents specifying origin and target office; staff can filter by office.
  - *Verification*: Interactive manual check + client build test.

- **Task 5: Custodial Handover / Routing Modal (`RouteDocumentModal.tsx`)**
  - Add an explicit "Route / Forward Document" action in `DocumentDetail.tsx`.
  - Staff selects the receiving municipal office, specifies the action required, adds routing notes, and signs with PIN.
  - Document detail displays the current office custody badge and routing timeline.
  - *Acceptance criteria*: Documents can be forwarded from one municipal office to another in the UI.
  - *Verification*: Create document, forward to City Treasurer, verify custody status updates.

### Phase 4: Zero-Dependency Printable Routing Slip & Final Verification
- **Task 6: Printable LGU Document Routing Slip Modal**
  - Create `RoutingSlipModal.tsx` displaying an official Republic of the Philippines / Local Government Unit Document Transmittal & Routing Slip.
  - Features: Municipal header, document tracking code, QR code for scanning, originating office, subject, action required checkboxes, and custody transfer signature table.
  - Uses `@media print` CSS for clean single-page printing via `window.print()`.
  - *Acceptance criteria*: Clicking "Print Routing Slip" opens a clean modal with a print trigger; prints 1-page paper-ready transmittal slip.
  - *Verification*: Trigger print preview, inspect DOM layout.

- **Task 7: Test Suite & End-to-End Verification**
  - Update and expand `server/api.test.ts` to test all LGU routing flows, office transfers, and filters.
  - Run full test suite and client production build.
  - *Acceptance criteria*: All tests pass (100% green); client builds without TypeScript errors.
  - *Verification*: `npm test` and `npm run build:client` succeed.

---

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing user documents corrupted during migration | High | Use safe SQLite table schema introspection (`PRAGMA table_info`) and `ALTER TABLE ADD COLUMN` with non-null defaults where appropriate. |
| Inconsistent office names across departments | Medium | Provide predefined standard LGU municipal offices while allowing custom entries. |
| Print styling overflowing onto multiple pages | Low | Use strict `@media print` rules, compact tables, and CSS `page-break-inside: avoid`. |

---

## Ponytail Simplifications
- **Skipped external PDF engine**: Native `@media print` with browser `window.print()` delivers zero-dependency, instant, pixel-perfect 1-page printable routing slips.
- **Skipped complex role-based access matrix**: Simple PIN verification and department attribution ensures full auditability without bloated enterprise IAM.
- **Reused existing SQLite & Express stack**: Zero new npm packages needed.
