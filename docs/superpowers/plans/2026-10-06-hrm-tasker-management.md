# LinkkWork HRM & Tasker Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng hoàn chỉnh phân hệ Quản trị Nhân sự & Thợ (HRM & Tasker Operations): Onboarding thợ vào Tenant, phân bổ kỹ năng, thiết lập sàn làm việc và bán kính nhận đơn, giám sát vòng đời thợ, cơ chế đa ví ký quỹ & thu nhập, sổ cái giao dịch bất biến `WalletTransaction`, và hệ thống cảnh báo HRM thông minh.

**Architecture:** Mở rộng mô hình dữ liệu PostgreSQL thông qua Prisma với `TaskerProfile` và `WalletTransaction`. Xây dựng module NestJS `TaskerModule` với phân quyền RBAC và cách ly Tenant nghiêm ngặt. Phía Web Admin (`apps/admin`) kết nối trực tiếp live API qua TanStack Query v5, trang bị `HRMAlertsBanner`, `TaskerModal`, `WorkFloorModal`, `DepositModal` và `TaskerDetailDrawer`.

**Architecture Diagram:**

```mermaid
graph TD
    subgraph "Web Admin (React + Vite)"
        TP[TaskersPage] --> HAB[HRMAlertsBanner]
        TP --> TM[TaskerModal (Onboarding/Edit)]
        TP --> WFM[WorkFloorModal (Radius & Radar)]
        TP --> DM[DepositModal (Top-up/Deduct)]
        TP --> TDD[TaskerDetailDrawer (Ledger & KYC)]
        TP --> QC[TanStack Query v5 Hooks]
        QC --> AC[ApiClient (fetchWithAuth)]
    end

    subgraph "NestJS API (apps/api)"
        AC --> TC[TaskerController]
        TC --> TG[JwtAuthGuard + RolesGuard + TenantContextGuard]
        TG --> TS[TaskerService]
        TS --> TX[ACID Transaction Ledger]
    end

    subgraph "PostgreSQL Storage"
        TX --> U[model User (role: TASKER)]
        TX --> TP_DB[model TaskerProfile (skills, radius, balances)]
        TX --> WT[model WalletTransaction (Immutable Ledger)]
    end
```

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL, Redis, React 18, TanStack Query v5, Zod, Tailwind CSS, Lucide Icons, Vitest, Jest.

**Spec:** [`docs/superpowers/specs/2026-10-06-hrm-tasker-management-design.md`](file:///Users/admin/Desktop/gb/docs/superpowers/specs/2026-10-06-hrm-tasker-management-design.md)

## Global Constraints
- Multi-tenant RBAC: Tenant Admin chỉ quản lý thợ thuộc đơn vị (`effectiveTenantId`). Super Admin quản trị toàn sàn.
- Strict Type Safety: Zero `any` types ở cả Backend và Frontend.
- Immutable Ledger: Bảng `WalletTransaction` chỉ ghi nhận mới (`create`), tuyệt đối không update hay delete.
- Safe Deposit Threshold: Ngưỡng ký quỹ an toàn là 100.000 VNĐ. Dưới 100k tự động cảnh báo và chặn nhận đơn.
- Quality Threshold: Rating dưới 4.0 kích hoạt cờ cảnh báo chất lượng dịch vụ.
- Test Integrity: 100% test suites hiện hữu (214+ tests) phải PASS liên tục.

---

### Task 1: Prisma Schema Migration & Database Sync

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

**Interfaces:**
- Produces: `WalletTransactionType`, `WalletTransactionStatus`, extended `TaskerProfile`, new model `WalletTransaction`.

- [ ] **Step 1: Update schema.prisma with new enums and models**

```prisma
enum WalletTransactionType {
  TOP_UP_DEPOSIT
  WITHDRAW_DEPOSIT
  SOFT_HOLD
  HOLD_RELEASE
  ORDER_PAYOUT
  COMMISSION_FEE
  PENALTY_DEDUCTION
}

enum WalletTransactionStatus {
  COMPLETED
  PENDING
  FAILED
  REJECTED
}
```

Update `model TaskerProfile` and add `model WalletTransaction` as specified in spec.

- [ ] **Step 2: Run Prisma db push and generate client**

```bash
cd apps/api && npx prisma db push && npx prisma generate
```
Expected: `Your database is now in sync with your Prisma schema.` and `Generated Prisma Client`.

- [ ] **Step 3: Verify existing tests pass with new Prisma schema**

```bash
npm --prefix apps/api test
```
Expected: All existing tests PASS.

- [ ] **Step 4: Commit schema changes**

```bash
git add apps/api/prisma/schema.prisma
git commit -m "feat(prisma): add WalletTransaction model and extend TaskerProfile for HRM"
```

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

**Interfaces:**
- Consumes: PrismaService, TenancyService.
- Produces: `TaskerService` methods: `createTasker`, `getTaskers`, `getTaskerById`, `updateTasker`, `updateWorkFloor`, `toggleOnlineStatus`, `adjustDeposit`, `updateKyc`, `getTaskerTransactions`.

- [ ] **Step 1: Create DTOs with class-validator decorators**
Implement `CreateTaskerDto`, `UpdateTaskerDto`, `UpdateWorkFloorDto`, `AdjustDepositDto`, `UpdateKycDto`.

- [ ] **Step 2: Write failing unit tests in tasker.service.spec.ts**
Test creating tasker with deposit transaction, tenant isolation, adjusting deposit balance, KYC update.

- [ ] **Step 3: Implement TaskerService**
Include ACID transactions with `prisma.$transaction`:
- `createTasker`: hash password, create User + TaskerProfile, create initial `TOP_UP_DEPOSIT` if deposit > 0.
- `adjustDeposit`: update `TaskerProfile.depositBalance`, insert `WalletTransaction`.
- `updateKyc`: update `kycVerified` and optional `idCardNumber`.

- [ ] **Step 4: Run service tests to verify PASS**

```bash
npm --prefix apps/api test -- tasker.service.spec.ts
```
Expected: PASS.

- [ ] **Step 5: Commit TaskerService**

```bash
git add apps/api/src/modules/tasker/
git commit -m "feat(api): implement TaskerService with deposit ledger and multi-tenant RBAC"
```

---

### Task 3: Backend Tasker Controller & Module Wiring

**Files:**
- Create: `apps/api/src/modules/tasker/tasker.controller.ts`
- Create: `apps/api/src/modules/tasker/tasker.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/test/tasker.spec.ts`

**Interfaces:**
- Consumes: `TaskerService`, `JwtAuthGuard`, `RolesGuard`, `TenantContextGuard`.
- Produces: REST endpoints under `/api/v1/taskers`.

- [ ] **Step 1: Write integration test in test/tasker.spec.ts**
Test complete tasker lifecycle:
1. Register tasker into tenant.
2. Query taskers with tenant filtering.
3. Update work floor (radius & radar).
4. Top-up deposit balance and verify transaction ledger.
5. Approve KYC.
6. Verify tenant isolation (cross-tenant access rejected with 403).

- [ ] **Step 2: Implement TaskerController and register in AppModule**
Add endpoints with `@Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)`.

- [ ] **Step 3: Run integration test to verify PASS**

```bash
npm --prefix apps/api test -- tasker.spec.ts
```
Expected: PASS.

- [ ] **Step 4: Run full API test suite and build**

```bash
npm --prefix apps/api test && npm --prefix apps/api run build
```
Expected: 100% tests PASS, clean build.

- [ ] **Step 5: Commit TaskerController and module**

```bash
git add apps/api/src/modules/tasker/ apps/api/src/app.module.ts apps/api/test/tasker.spec.ts
git commit -m "feat(api): add TaskerController REST endpoints and integration tests"
```

---

### Task 4: Frontend Types, Schemas & API Client Updates

**Files:**
- Modify: `apps/admin/src/types/index.ts`
- Create: `apps/admin/src/schemas/tasker.schema.ts`
- Modify: `apps/admin/src/api/client.ts`
- Modify: `apps/admin/src/api/queries/useTaskers.ts`

**Interfaces:**
- Produces: `taskerSchema`, `workFloorSchema`, `depositSchema`, `api.createTasker`, `api.updateTasker`, `api.updateWorkFloor`, `api.adjustDeposit`, `api.updateKyc`, `api.getTaskerTransactions`, TanStack Query hooks.

- [ ] **Step 1: Update Tasker and WalletTransaction interfaces in types/index.ts**
Ensure all HRM fields (`maxDistanceKm`, `autoRadarEnabled`, `bankName`, etc.) are typed with zero `any`.

- [ ] **Step 2: Create Zod validation schemas in tasker.schema.ts**
Define `createTaskerSchema`, `updateTaskerSchema`, `workFloorSchema`, `depositSchema`.

- [ ] **Step 3: Connect ApiClient methods to live NestJS backend**
Implement `createTasker`, `updateTasker`, `updateWorkFloor`, `toggleTaskerStatus`, `adjustTaskerDeposit`, `updateTaskerKyc`, `getTaskerTransactions` with `fetchWithAuth`.

- [ ] **Step 4: Update useTaskers.ts with TanStack Query mutations**
Add `useCreateTaskerMutation`, `useUpdateTaskerMutation`, `useUpdateWorkFloorMutation`, `useAdjustDepositMutation`, `useUpdateKycMutation`, `useTaskerTransactionsQuery`.

- [ ] **Step 5: Verify tests and TypeScript compilation**

```bash
npm --prefix apps/admin test && npm --prefix apps/admin run build
```
Expected: PASS.

- [ ] **Step 6: Commit Frontend API layer**

```bash
git add apps/admin/src/types/index.ts apps/admin/src/schemas/tasker.schema.ts apps/admin/src/api/client.ts apps/admin/src/api/queries/useTaskers.ts
git commit -m "feat(admin): add tasker Zod schemas, API client methods and Query mutations"
```

---

### Task 5: HRM Modals & Component Ecosystem

**Files:**
- Create: `apps/admin/src/pages/taskers/HRMAlertsBanner.tsx`
- Create: `apps/admin/src/pages/taskers/TaskerModal.tsx`
- Create: `apps/admin/src/pages/taskers/WorkFloorModal.tsx`
- Create: `apps/admin/src/pages/taskers/DepositModal.tsx`
- Create: `apps/admin/src/pages/taskers/TaskerDetailDrawer.tsx`

**Interfaces:**
- Produces: Modular, accessible, responsive HRM UI components adhering to Design System.

- [ ] **Step 1: Implement HRMAlertsBanner.tsx**
Display critical alerts:
1. Low Deposit (< 100k): red badge, count, 1-click filter button.
2. Unverified KYC: yellow badge, count, 1-click filter button.
3. Low Rating (< 4.0): orange badge, count, 1-click filter button.

- [ ] **Step 2: Implement TaskerModal.tsx**
Form with React Hook Form + Zod:
- Full name, phone, email, password (optional on edit).
- ID card number (CCCD), skills multi-selection.
- Initial deposit balance.
- Bank account details (bank name, account number, account holder).

- [ ] **Step 3: Implement WorkFloorModal.tsx**
Work floor settings:
- Service radius slider / input (`maxDistanceKm`: 1 - 50 km).
- Auto radar job claiming toggle (`autoRadarEnabled`).
- Current online shift status.

- [ ] **Step 4: Implement DepositModal.tsx**
Deposit adjustment modal:
- Top-up or deduction amount.
- Quick amount chips (+200k, +500k, +1M, +2M).
- Transaction note input.

- [ ] **Step 5: Implement TaskerDetailDrawer.tsx**
Slide-over drawer showing full profile, KYC badge, bank details, and table of recent ledger transactions.

- [ ] **Step 6: Commit HRM components**

```bash
git add apps/admin/src/pages/taskers/
git commit -m "feat(admin): implement HRMAlertsBanner, TaskerModal, WorkFloorModal, DepositModal, TaskerDetailDrawer"
```

---

### Task 6: Overhaul TaskersPage & Unified HRM Experience

**Files:**
- Modify: `apps/admin/src/pages/taskers/TaskersPage.tsx`

**Interfaces:**
- Produces: Interactive enterprise HRM dashboard with alert banners, tabs, rich cards, action triggers, and responsive layout.

- [x] **Step 1: Integrate HRMAlertsBanner and Quick Alert Filters**
Clicking alert chip filters list immediately to affected taskers.

- [x] **Step 2: Enhance Filter Tabs**
Tabs: All (`ALL`), Online (`ONLINE`), Offline (`OFFLINE`), Low Deposit (`LOW_DEPOSIT`), Pending KYC (`PENDING_KYC`).

- [x] **Step 3: Upgrade Tasker Cards with Action Buttons**
Each card features:
- Avatar, name, phone, KYC verified badge.
- Online/Offline toggle switch.
- Metrics grid: Rating, completed jobs, deposit balance (colored red if < 100k).
- Skills tags.
- Action buttons: "Sửa", "Sàn & Bán kính", "Nạp ký quỹ", "Duyệt KYC" (if not verified), "Chi tiết / Sổ cái".

- [x] **Step 4: Protect critical actions with useConfirm**
KYC approval and status toggling protected with confirm modal.

- [x] **Step 5: Run admin tests and build**

```bash
npm --prefix apps/admin test && npm --prefix apps/admin run build
```
Expected: PASS with 0 errors.

- [x] **Step 6: Commit TaskersPage overhaul**

```bash
git add apps/admin/src/pages/taskers/TaskersPage.tsx
git commit -m "feat(admin): overhaul TaskersPage with HRM alerts banner, work floor controls and ledger drawer"
```

---

### Task 7: E2E Integration Testing & System Verification

**Files:**
- Create: `apps/admin/src/api/tasker-integration.spec.ts`

- [x] **Step 1: Write frontend integration test suite**
Test full flow:
1. Partner login.
2. Register new tasker.
3. Update work floor settings.
4. Top up deposit.
5. Verify KYC.
6. Check transactions list.

- [x] **Step 2: Run both API and Admin test suites**

```bash
npm --prefix apps/api test
npm --prefix apps/admin test
```
Expected: 100% tests PASS across all suites.

- [x] **Step 3: Run production builds**

```bash
npm --prefix apps/api run build
npm --prefix apps/admin run build
```
Expected: 0 errors, clean builds.

- [x] **Step 4: Commit test suite and final verification**

```bash
git add apps/admin/src/api/tasker-integration.spec.ts
git commit -m "test(admin): add comprehensive HRM tasker integration test suite"
```
