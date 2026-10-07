# LinkkWork HRM & Tasker Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Xây dựng hoàn chỉnh phân hệ Quản trị Nhân sự & Thợ (HRM & Tasker Operations): Onboarding thợ vào Tenant, phân bổ kỹ năng, thiết lập sàn làm việc và bán kính nhận đơn, giám sát vòng đời thợ, cơ chế đa ví ký quỹ & thu nhập, sổ cái giao dịch bất biến `WalletTransaction`, hệ thống cảnh báo HRM thông minh, **Động cơ Sẵn sàng 3 tầng & 7 mã khả dụng**, **Đồng bộ hai chiều BookingState - TaskerProfile trong ACID transaction**, **Theo dõi ca việc đang thực hiện (Active Job Tracking)**, và **Hệ thống Trang Tài liệu Trực quan Đa Actor (`/system-docs` - `SystemDocsPage.tsx`)**.

**Architecture:** Mở rộng mô hình dữ liệu PostgreSQL thông qua Prisma với `TaskerProfile` và `WalletTransaction`. Xây dựng module NestJS `TaskerModule` với phân quyền RBAC và cách ly Tenant nghiêm ngặt. Phía Web Admin (`apps/admin`) kết nối trực tiếp live API qua TanStack Query v5, trang bị `HRMAlertsBanner`, `TaskerModal`, `WorkFloorModal`, `DepositModal`, `TaskerDetailDrawer`, và trung tâm tài liệu trực quan `SystemDocsPage`.

**Architecture Diagram:**

```mermaid
graph TD
    subgraph "Web Admin (React + Vite)"
        TP[TaskersPage] --> HAB[HRMAlertsBanner]
        TP --> TM[TaskerModal (Onboarding/Edit)]
        TP --> WFM[WorkFloorModal (Radius & Radar)]
        TP --> DM[DepositModal (Top-up/Deduct)]
        TP --> TDD[TaskerDetailDrawer (Ledger, KYC, Active Job)]
        TP --> QC[TanStack Query v5 Hooks]
        QC --> AC[ApiClient (fetchWithAuth)]
        SDP[SystemDocsPage (/system-docs)] --> RBAC[Interactive RBAC Matrix]
        SDP --> APIC[Live API Cheat Sheet]
    end

    subgraph "NestJS API (apps/api)"
        AC --> TC[TaskerController]
        AC --> BC[BookingController]
        TC --> TG[JwtAuthGuard + RolesGuard + TenantContextGuard]
        TG --> TS[TaskerService]
        TG --> BS[BookingService]
        BS --> TAE[computeTaskerAvailability Engine]
        BS --> ACID[ACID Transaction Coordinator]
        TS --> ACID
    end

    subgraph "PostgreSQL Storage & Redis"
        ACID --> U[model User (role: TASKER)]
        ACID --> TP_DB[model TaskerProfile (skills, radius, balances, status)]
        ACID --> WT[model WalletTransaction (Immutable Ledger)]
        ACID --> B_DB[model Booking (status, events, assignedTasker)]
        ACID --> RD[(Redis Radar & CAS Key)]
    end
```

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL, Redis, React 18, TanStack Query v5, Zod, Tailwind CSS, Lucide Icons, Vitest, Jest.

**Spec:** [`docs/superpowers/specs/2026-10-06-hrm-tasker-management-design.md`](file:///Users/admin/Desktop/gb/docs/superpowers/specs/2026-10-06-hrm-tasker-management-design.md)

## Global Constraints
- Multi-tenant RBAC: Tenant Admin chỉ quản lý thợ thuộc đơn vị (`effectiveTenantId`). Super Admin quản trị toàn sàn.
- Strict Type Safety: Zero `any` types ở cả Backend và Frontend.
- Immutable Ledger: Bảng `WalletTransaction` chỉ ghi nhận mới (`create`), tuyệt đối không update hay delete.
- Safe Deposit Threshold: Ngưỡng ký quỹ an toàn là 100.000 VNĐ. Dưới 100k tự động cảnh báo và chặn nhận đơn (`LOW_DEPOSIT`).
- Quality Threshold: Rating dưới 4.0 kích hoạt cờ cảnh báo chất lượng dịch vụ.
- Test Integrity: 100% test suites (309+ tests) phải PASS liên tục.
- Docs Integrity: Tuân thủ Điều khoản 10 trong `CODING_STANDARDS.md` (Docs-as-Code & Single Source of Truth).

---

### Task 1: Prisma Schema Migration & Database Sync

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

**Interfaces:**
- Produces: `WalletTransactionType`, `WalletTransactionStatus`, extended `TaskerProfile`, new model `WalletTransaction`.

- [x] **Step 1: Update schema.prisma with new enums and models**
Update `model TaskerProfile` and add `model WalletTransaction` as specified in spec.

- [x] **Step 2: Run Prisma db push and generate client**
Sync schema to PostgreSQL and regenerate Prisma client.

- [x] **Step 3: Verify existing tests pass with new Prisma schema**
Run full API test suite to verify zero regressions.

- [x] **Step 4: Commit schema changes**
Commit message: `feat(prisma): add WalletTransaction model and extend TaskerProfile for HRM`.

---

### Task 2: Backend Tasker Module DTOs, Service & Business Logic

**Files:**
- Create: `apps/api/src/modules/tasker/dto/create-tasker.dto.ts`
- Create: `apps/api/src/modules/tasker/dto/update-tasker.dto.ts`
- Create: `apps/api/src/modules/tasker/dto/update-work-floor.dto.ts`
- Create: `apps/api/src/modules/tasker/dto/adjust-deposit.dto.ts`
- Create: `apps/api/src/modules/tasker/dto/update-kyc.dto.ts`
- Create: `apps/api/src/modules/tasker/dto/index.ts`
- Create: `apps/api/src/modules/tasker/tasker.service.ts`
- Test: `apps/api/src/modules/tasker/tasker.service.spec.ts`

- [x] **Step 1: Create DTOs with class-validator decorators**
Implement `CreateTaskerDto`, `UpdateTaskerDto`, `UpdateWorkFloorDto`, `AdjustDepositDto`, `UpdateKycDto`.

- [x] **Step 2: Write failing unit tests in tasker.service.spec.ts**
Test creating tasker with deposit transaction, tenant isolation, adjusting deposit balance, KYC update.

- [x] **Step 3: Implement TaskerService**
Implement ACID transactions with `prisma.$transaction`: `createTasker`, `adjustDeposit`, `updateKyc`, `updateWorkFloor`.

- [x] **Step 4: Run service tests to verify PASS**
Verify unit tests pass.

- [x] **Step 5: Commit TaskerService**
Commit message: `feat(api): implement TaskerService with deposit ledger and multi-tenant RBAC`.

---

### Task 3: Backend Tasker Controller & Module Wiring

**Files:**
- Create: `apps/api/src/modules/tasker/tasker.controller.ts`
- Create: `apps/api/src/modules/tasker/tasker.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/test/tasker.spec.ts`

- [x] **Step 1: Write integration test in test/tasker.spec.ts**
Complete end-to-end tasker lifecycle integration tests.

- [x] **Step 2: Implement TaskerController and register in AppModule**
Add endpoints with `@Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)`.

- [x] **Step 3: Run integration test to verify PASS**
Integration tests pass.

- [x] **Step 4: Run full API test suite and build**
100% tests PASS, clean build.

- [x] **Step 5: Commit TaskerController and module**
Commit message: `feat(api): add TaskerController REST endpoints and integration tests`.

---

### Task 4: Frontend Types, Schemas & API Client Updates

**Files:**
- Modify: `apps/admin/src/types/index.ts`
- Create: `apps/admin/src/schemas/tasker.schema.ts`
- Modify: `apps/admin/src/api/client.ts`
- Modify: `apps/admin/src/api/queries/useTaskers.ts`

- [x] **Step 1: Update Tasker and WalletTransaction interfaces in types/index.ts**
Strict type safety with zero `any`.

- [x] **Step 2: Create Zod validation schemas in tasker.schema.ts**
Schemas for create, update, workFloor, deposit.

- [x] **Step 3: Connect ApiClient methods to live NestJS backend**
Implement API client methods with `fetchWithAuth`.

- [x] **Step 4: Update useTaskers.ts with TanStack Query mutations**
Query hooks with cache invalidation.

- [x] **Step 5: Verify tests and TypeScript compilation**
Pass tests and clean compilation.

- [x] **Step 6: Commit Frontend API layer**
Commit message: `feat(admin): add tasker Zod schemas, API client methods and Query mutations`.

---

### Task 5: HRM Modals & Component Ecosystem

**Files:**
- Create: `apps/admin/src/pages/taskers/HRMAlertsBanner.tsx`
- Create: `apps/admin/src/pages/taskers/TaskerModal.tsx`
- Create: `apps/admin/src/pages/taskers/WorkFloorModal.tsx`
- Create: `apps/admin/src/pages/taskers/DepositModal.tsx`
- Create: `apps/admin/src/pages/taskers/TaskerDetailDrawer.tsx`

- [x] **Step 1: Implement HRMAlertsBanner.tsx**
Display low deposit (< 100k), unverified KYC, and low rating (< 4.0) alerts with 1-click filter.

- [x] **Step 2: Implement TaskerModal.tsx**
React Hook Form + Zod for tasker onboarding/editing.

- [x] **Step 3: Implement WorkFloorModal.tsx**
Work floor settings: radius slider (1-100km), auto-radar toggle, online shift.

- [x] **Step 4: Implement DepositModal.tsx**
Deposit top-up / deduction with quick chips and immutable ledger note.

- [x] **Step 5: Implement TaskerDetailDrawer.tsx**
Slide-over drawer for ledger audit trail, KYC verification, and bank details.

- [x] **Step 6: Commit HRM components**
Commit message: `feat(admin): implement HRMAlertsBanner, TaskerModal, WorkFloorModal, DepositModal, TaskerDetailDrawer`.

---

### Task 6: Overhaul TaskersPage & Unified HRM Experience

**Files:**
- Modify: `apps/admin/src/pages/taskers/TaskersPage.tsx`

- [x] **Step 1: Integrate HRMAlertsBanner and Quick Alert Filters**
Clicking alert chip filters list immediately.

- [x] **Step 2: Enhance Filter Tabs**
Tabs: `ALL`, `ONLINE`, `OFFLINE`, `LOW_DEPOSIT`, `PENDING_KYC`.

- [x] **Step 3: Upgrade Tasker Cards with Action Buttons**
Card with avatar, online toggle, metrics, skills, and direct action triggers.

- [x] **Step 4: Protect critical actions with useConfirm**
Protected KYC and status actions.

- [x] **Step 5: Run admin tests and build**
PASS with 0 errors.

- [x] **Step 6: Commit TaskersPage overhaul**
Commit message: `feat(admin): overhaul TaskersPage with HRM alerts banner, work floor controls and ledger drawer`.

---

### Task 7: E2E Integration Testing & System Verification

**Files:**
- Create: `apps/admin/src/api/tasker-integration.spec.ts`

- [x] **Step 1: Write frontend integration test suite**
Test full tasker lifecycle end-to-end.

- [x] **Step 2: Run both API and Admin test suites**
100% tests PASS across all suites.

- [x] **Step 3: Run production builds**
0 errors, clean builds for both `apps/api` and `apps/admin`.

- [x] **Step 4: Commit test suite and final verification**
Commit message: `test(admin): add comprehensive HRM tasker integration test suite`.

---

### Task 8: Bi-directional Lifecycle Sync & Tasker Availability Engine

**Files:**
- Create: `apps/api/src/modules/tasker/tasker-availability.helper.ts`
- Modify: `apps/api/src/modules/booking/booking.service.ts`
- Modify: `apps/api/src/modules/tasker/tasker.service.ts`
- Modify: `apps/api/src/modules/tasker/dto/query-taskers.dto.ts`
- Modify: `apps/api/src/modules/tasker/tasker.service.spec.ts`
- Modify: `apps/admin/src/types/index.ts`
- Modify: `apps/admin/src/api/client.ts`
- Modify: `apps/admin/src/pages/taskers/TaskersPage.tsx`
- Modify: `apps/admin/src/pages/taskers/TaskerDetailDrawer.tsx`

- [x] **Step 1: Implement computeTaskerAvailability Engine with 7 Codes**
Evaluate 3 tiers: `RESTRICTED`, `OFFLINE`, `LOW_DEPOSIT`, `UNVERIFIED_KYC`, `BUSY`, `RADAR_DISABLED`, `READY`.

- [x] **Step 2: Implement Active Job Formatter & Contract**
Structure `TaskerActiveJob` (booking code, service, customer info, address, amount, status).

- [x] **Step 3: Synchronize Booking State Machine & Tasker Status in ACID Transaction**
Update `TaskerProfile.currentStatus` synchronously with `Booking.status` (`ASSIGNED`, `ARRIVING`, `IN_PROGRESS`, `PENDING_ACCEPTANCE`, `COMPLETED`, `CANCELLED`).
Automatic return to `IDLE` when remaining active jobs count = 0.
Handle reassignment cleanly.

- [x] **Step 4: Display Availability Badges and Active Job Card on Web Admin**
Render color-coded status badges in tasker roster.
Highlight Active Job Card in `TaskerDetailDrawer` with 1-click jump to `/dispatch?search={bookingCode}`.

- [x] **Step 5: Run unit & integration tests**
PASS 100%.

- [x] **Step 6: Commit Tasker availability & lifecycle sync**
Commit messages:
- `feat(api): synchronize tasker job lifecycle, compute availability reasons and attach active job`
- `feat(admin): display tasker availability badges, active job card and timely admin actions`

---

### Task 9: Interactive System Documentation Showcase (`SystemDocsPage.tsx`) & Actor Knowledge Matrix

**Files:**
- Create: `apps/admin/src/pages/docs/SystemDocsPage.tsx`
- Modify: `apps/admin/src/App.tsx`
- Modify: `apps/admin/src/components/layout/Sidebar.tsx`

- [x] **Step 1: Create SystemDocsPage with Actor-Based Knowledge Base**
Tabs: `ALL`, `OVERVIEW`, `SUPER_ADMIN`, `TENANT_ADMIN`, `TASKER`, `CUSTOMER`, `SYSTEM_ENGINE`.

- [x] **Step 2: Build Interactive RBAC Matrix Table**
Comprehensive matrix comparing Super Admin, Tenant Admin, Tasker, and Customer permissions.

- [x] **Step 3: Build Live API Cheat Sheet**
Display 16 normalized API endpoints with real-time search and 1-click clipboard copy.

- [x] **Step 4: Register Route in App.tsx and Navigation Link in Sidebar**
Route: `/system-docs`, icon `BookOpen`.

- [x] **Step 5: Commit SystemDocsPage**
Commit message: `feat(admin): implement interactive SystemDocsPage showcase with actor tabs and RBAC matrix`.

---

### Task 10: Technical Documentation Synchronization & Docs-as-Code

**Files:**
- Modify: `docs/superpowers/rules/CODING_STANDARDS.md` (Rule 10 Docs-as-Code)
- Modify: `docs/superpowers/specs/2026-10-06-hrm-tasker-management-design.md`
- Modify: `docs/superpowers/plans/2026-10-06-hrm-tasker-management.md`

- [x] **Step 1: Formalize Rule 10 in CODING_STANDARDS.md**
Establish single source of truth, zero code drift, and docs-maintainer subagent maintenance.

- [x] **Step 2: Update Architecture Specification with 3-Tier Availability & ACID Sync**
Detailed documentation of 7 availability codes, sequence diagrams, active job contract, and actor specifications.

- [x] **Step 3: Mark All Implementation Tasks Complete in Plan**
Synchronize plan to reflect all completed phases.

- [x] **Step 4: Verify Full Test Suites Pass & Production Builds Pass**
Run `apps/api` test (227/227) and `apps/admin` test (82/82). Run production builds.

- [x] **Step 5: Commit Synchronized Documentation**
Commit message: `docs(system): synchronize technical specs, state machine and actor documentation`.
