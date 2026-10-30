# Tasks: LGU Document Tracking & Routing System

## Phase 1: Foundation, LGU Schema & Domain Models
- [x] **Task 1: Database Migration & LGU Schema Extensions**
  - **Description:** Migrate SQLite database table `documents` to include `origin_type`, `originating_office`, `current_office`, and `action_required`. Update TypeScript interfaces in `server/db.ts` and `src/types.ts`.
  - **Acceptance criteria:**
    - [x] `documents` table has `origin_type`, `originating_office`, `current_office`, `action_required` columns
    - [x] Migration is idempotent and preserves any existing records
    - [x] Indexes added for `current_office` and `originating_office`
  - **Verification:**
    - [x] Tests pass: `npm test` runs schema and DB initialization cleanly
    - [x] Build succeeds: `npx tsc --noEmit`
  - **Dependencies:** None
  - **Files touched:** `server/db.ts`, `src/types.ts`
  - **Estimated scope:** Small (2 files)

- [x] **Task 2: LGU Official Templates & Municipal Department Users**
  - **Description:** Seed 5 official LGU templates (Sanggunian Ordinances, Disbursement Vouchers, Business Permits, Citizen Petitions, Building Clearances) and municipal office accounts (Office of the Mayor, Sangguniang Bayan, City Treasurer, Records Management, BPLO, City Engineering).
  - **Acceptance criteria:**
    - [x] 5 standard LGU templates exist with relevant government stages and custom fields
    - [x] Municipal department accounts seeded with PINs
  - **Verification:**
    - [x] Tests pass: `npm test` checks templates and users
  - **Dependencies:** Task 1
  - **Files touched:** `server/db.ts`
  - **Estimated scope:** Small (1 file)

### Checkpoint: Foundation
- [x] SQLite database migrated with LGU schema columns
- [x] Municipal templates and department users available in DB

---

## Phase 2: Backend API & Office Routing Contracts
- [x] **Task 3: Office Routing & Transfer Endpoint (`POST /api/documents/:id/route`)**
  - **Description:** Implement `/api/documents/:id/route` to forward documents between offices, update `current_office`, set `action_required`, and record an immutable `routed` audit history log. Update `GET /api/documents` with `current_office` and `origin_type` query filters. Add `GET /api/offices` endpoint for municipal office lists and action types.
  - **Acceptance criteria:**
    - [x] `POST /api/documents/:id/route` forwards custody and logs routing history
    - [x] `GET /api/documents?current_office=...` filters documents by holding office
    - [x] `GET /api/offices` returns standard municipal departments and actions
    - [x] Consistent JSON response and error contracts across all endpoints
  - **Verification:**
    - [x] Tests pass: `npm test` tests routing transfer and office filtering
  - **Dependencies:** Task 1, Task 2
  - **Files touched:** `server/db.ts`, `server/index.ts`, `server/api.test.ts`
  - **Estimated scope:** Medium (3 files)

### Checkpoint: API & Routing Engine
- [x] Custodial routing between municipal offices verified via automated tests
- [x] Office-level queue filtering functional via API

---

## Phase 3: Frontend UI Restructure & Office Queues
- [x] **Task 4: LGU Branding, Document Creation & Office Filtering**
  - **Description:** Update header and branding to "DocTrack LGU — Document Routing Information System". Add LGU routing fields (`origin_type`, `originating_office`, `target_office`, `action_required`) to `DocumentFormModal.tsx`. Add "Office Queue" filter in `DocumentList.tsx`.
  - **Acceptance criteria:**
    - [x] Form captures originating entity, holding office, and required action
    - [x] Office filter allows staff to view their specific department's active queue
    - [x] Document list displays `current_office` badge and `action_required` badge
  - **Verification:**
    - [x] Client builds: `npm run build:client`
  - **Dependencies:** Task 3
  - **Files touched:** `src/api.ts`, `src/App.tsx`, `src/components/DocumentFormModal.tsx`, `src/components/DocumentList.tsx`
  - **Estimated scope:** Medium (4 files)

- [x] **Task 5: Custodial Handover / Routing Modal (`RouteDocumentModal.tsx`)**
  - **Description:** Create `RouteDocumentModal.tsx` allowing staff to forward a document to another municipal office with action required, transmittal notes, and PIN confirmation. Add action button in `DocumentDetail.tsx`.
  - **Acceptance criteria:**
    - [x] Staff can route document to any municipal office from document detail view
    - [x] Routing changes current custody immediately and appends to audit timeline
  - **Verification:**
    - [x] Client builds: `npm run build:client`
  - **Dependencies:** Task 4
  - **Files touched:** `src/components/RouteDocumentModal.tsx`, `src/components/DocumentDetail.tsx`
  - **Estimated scope:** Small (2 files)

---

## Phase 4: Zero-Dependency Printable Routing Slip & Final Verification
- [x] **Task 6: Printable LGU Document Routing Slip Modal**
  - **Description:** Build `RoutingSlipModal.tsx` with printable styling (`@media print`) rendering a standard government transmittal routing slip with official header, tracking barcode/QR, metadata, action required checkboxes, and receiving signature table.
  - **Acceptance criteria:**
    - [x] "Print Routing Slip" button on document detail opens printable transmittal slip
    - [x] Native `window.print()` outputs clean 1-page paper-ready routing slip
    - [x] Includes QR code, barcode-styled tracking ID, and physical signature table
  - **Verification:**
    - [x] Manual inspection of modal and print styling; client build succeeds
  - **Dependencies:** Task 5
  - **Files touched:** `src/components/RoutingSlipModal.tsx`, `src/components/DocumentDetail.tsx`, `src/index.css`
  - **Estimated scope:** Medium (3 files)

- [x] **Task 7: Test Suite & End-to-End Verification**
  - **Description:** Update `server/api.test.ts` to cover all LGU flows. Validate complete end-to-end flow with automated test suite and production build.
  - **Acceptance criteria:**
    - [x] All tests pass (100% green)
    - [x] Full production build succeeds cleanly
  - **Verification:**
    - [x] Tests pass: `npm test`
    - [x] Build succeeds: `npm run build`
  - **Dependencies:** Tasks 1-6
  - **Files touched:** `server/api.test.ts`
  - **Estimated scope:** Small (1 file)

### Checkpoint: Complete LGU DTS
- [x] Full document tracking & office-to-office routing operating on port 3001
- [x] Printable LGU Routing Slip ready for real-world municipal desk use
- [x] 100% test pass rate
