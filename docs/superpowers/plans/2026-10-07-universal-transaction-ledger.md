# Kế Hoạch Triển Khai: Sổ Cái Giao Dịch Chung Toàn Hệ Thống (Universal Transaction Ledger)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng Sổ Cái Giao Dịch Chung (Universal Transaction Ledger) toàn diện với Nguồn tiền, Đích nhận, Phương thức thanh toán, mô hình kế toán kép 2 bút toán khi hoàn tất đơn, module API Finance tra cứu có tìm kiếm/bộ lọc phân quyền, và giao diện Web Admin kết nối 100% API thực.

**Architecture:** Mở rộng `WalletTransaction` trong Prisma thành Sổ cái đa thực thể liên kết đồng thời Tenant, Tasker, Customer và Booking. Cập nhật `BookingService` ghi nhận 2 bút toán song song (`CASH_COLLECTED` và `COMMISSION_FEE`) trong 1 giao dịch ACID. Xây dựng `FinanceModule` (NestJS) cung cấp endpoint `GET /finance/transactions` với tìm kiếm mờ, lọc đa chiều, và phân quyền Multi-tenancy. Nâng cấp `FinancePage.tsx` và `TransactionDetailModal.tsx` trên Web Admin Portal.

**Architecture Diagram:**

```mermaid
graph TD
    subgraph "Clients"
        AdminUI["Admin Portal (/finance)"]
        DispatchUI["Bàn Điều Phối (/dispatch)"]
    end

    subgraph "NestJS API"
        FC["FinanceController (/api/v1/finance)"]
        FS["FinanceService"]
        BC["BookingController (/api/v1/bookings)"]
        BS["BookingService"]
    end

    subgraph "Database (PostgreSQL)"
        WT["wallet_transactions (Universal Ledger)"]
        BK["bookings"]
        TP["tasker_profiles"]
    end

    AdminUI -->|Search & Filter Query| FC
    FC --> FS
    FS -->|Query Multi-tenant| WT

    DispatchUI -->|Complete Cash Order| BC
    BC --> BS
    BS -->|1. CASH_COLLECTED (Customer -> Tasker)| WT
    BS -->|2. COMMISSION_FEE (Tasker -> Tenant)| WT
    BS -->|Deduct depositBalance| TP
    BS -->|Update paymentStatus| BK
```

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL, TypeScript, React 19, Vite, TanStack Query v5, Tailwind CSS, Zod.

**Spec:** [`docs/superpowers/specs/2026-10-07-universal-transaction-ledger-design.md`](file:///Users/admin/Desktop/gb/docs/superpowers/specs/2026-10-07-universal-transaction-ledger-design.md)

## Global Constraints
- Strict typing: ZERO `any` types.
- Multi-tenancy: Super Admin xem được toàn sàn (cross-tenant), Tenant Admin bị ràng buộc tự động vào `effectiveTenantId`.
- ACID Integrity: Cả 2 bút toán và cập nhật số dư phải nằm trong cùng một `prisma.$transaction`.
- Backward Compatibility: Giữ nguyên hoạt động của các test suite hiện có (323/323 tests tiếp tục PASS).
- Docs-as-Code: Tuân thủ Điều khoản 10 CODING_STANDARDS.md.

---

### Task 1: Prisma Schema Migration & Shared Types

**Files:**
- Modify: `packages/shared-types/src/enums/payment-method.enum.ts`
- Modify: `packages/shared-types/src/index.ts`
- Modify: `packages/shared-types/test/types.spec.ts`
- Modify: `apps/api/prisma/schema.prisma`

**Interfaces:**
- Produces: `PaymentMethod.WALLET`, `WalletTransactionType.CASH_COLLECTED`, `WalletTransactionType.SUBSCRIPTION_FEE`, các trường `sourceType`, `sourceId`, `sourceName`, `targetType`, `targetId`, `targetName`, `paymentMethod`, `customerId` trong model `WalletTransaction`.

- [ ] **Step 1: Cập nhật Shared Types Enums & Unit Test**
  - Thêm `WALLET` vào `PaymentMethod` trong `packages/shared-types/src/enums/payment-method.enum.ts`.
  - Cập nhật test trong `packages/shared-types/test/types.spec.ts`.
  - Chạy `npm --prefix packages/shared-types test` xác nhận PASS.

- [ ] **Step 2: Cập nhật `schema.prisma`**
  - Bổ sung `CASH_COLLECTED` và `SUBSCRIPTION_FEE` vào `enum WalletTransactionType`.
  - Bổ sung `WALLET` vào `enum PaymentMethod`.
  - Cập nhật `model WalletTransaction` với:
    ```prisma
    customerId    String?
    sourceType    String                  @default("SYSTEM")
    sourceId      String?
    sourceName    String                  @default("Hệ thống LinkkWork")
    targetType    String                  @default("SYSTEM")
    targetId      String?
    targetName    String                  @default("Hệ thống LinkkWork")
    paymentMethod PaymentMethod           @default(CASH)
    customer      User?                   @relation("CustomerWalletTransactions", fields: [customerId], references: [id], onDelete: SetNull)
    ```
  - Bổ sung quan hệ ngược trên `model User`:
    ```prisma
    customerWalletTransactions WalletTransaction[] @relation("CustomerWalletTransactions")
    taskerWalletTransactions   WalletTransaction[] @relation("TaskerWalletTransactions")
    ```

- [ ] **Step 3: Migrate DB & Generate Prisma Client**
  - Chạy `npx prisma db push` trong `apps/api`.
  - Chạy `npx prisma generate` trong `apps/api`.
  - Chạy `npm --prefix apps/api test` kiểm tra tính tương thích.

- [ ] **Step 4: Commit**
  - `git add packages/shared-types/ apps/api/prisma/`
  - `git commit -m "feat(prisma): extend WalletTransaction with source, target, and paymentMethod"`

---

### Task 2: Booking Dual-Entry Ledger Settlement (`BookingService`)

**Files:**
- Modify: `apps/api/src/modules/booking/booking.service.ts`
- Modify: `apps/api/test/booking.spec.ts`

**Interfaces:**
- Consumes: `WalletTransactionType.CASH_COLLECTED`, `WalletTransactionType.COMMISSION_FEE`, `PaymentMethod.CASH`, `PaymentMethod.WALLET`.
- Produces: 2 bút toán kế toán kép khi hoàn tất đơn hàng (`recordCashPayment` và `transitionStatus(COMPLETED)`).

- [ ] **Step 1: Viết failing test cho luồng 2 bút toán trong `booking.spec.ts`**
  - Kiểm tra khi gọi `recordCashPayment` hoặc hoàn tất đơn:
    - Bút toán 1: `type = CASH_COLLECTED`, `amount = totalAmount`, `direction = IN`, `sourceType = CUSTOMER`, `sourceName = booking.customerName`, `targetType = TASKER`, `targetName = tasker.name`, `paymentMethod = CASH`.
    - Bút toán 2: `type = COMMISSION_FEE`, `amount = 15%`, `direction = OUT`, `sourceType = TASKER`, `sourceName = tasker.name`, `targetType = TENANT`, `targetName = servicingTenant.name`, `paymentMethod = WALLET`.
  - Chạy test kiểm tra FAIL vì chưa cập nhật service.

- [ ] **Step 2: Triển khai 2 bút toán trong `BookingService.recordCashPayment`**
  - Trong `prisma.$transaction`:
    1. Tạo bản ghi `CASH_COLLECTED`:
       - `sourceType: 'CUSTOMER'`, `sourceName: booking.customerName`, `sourceId: booking.customerId`
       - `targetType: 'TASKER'`, `targetName: tasker.name`, `targetId: tasker.id`
       - `paymentMethod: PaymentMethod.CASH`
       - `amount: amountToCollect`, `direction: 'IN'`
       - `balanceBefore: taskerProfile.depositBalance`, `balanceAfter: taskerProfile.depositBalance`
       - `notes: dto.note || 'Khách hàng thanh toán tiền mặt trực tiếp cho thợ'`
    2. Tạo bản ghi `COMMISSION_FEE`:
       - `sourceType: 'TASKER'`, `sourceName: tasker.name`, `sourceId: tasker.id`
       - `targetType: 'TENANT'`, `targetName: servicingTenant.name`, `targetId: servicingTenant.id`
       - `paymentMethod: PaymentMethod.WALLET`
       - `amount: commissionAmount`, `direction: 'OUT'`
       - `balanceBefore: taskerProfile.depositBalance`, `balanceAfter: newDepositBalance`
       - `notes: 'Khấu trừ hoa hồng sàn 15% cho đơn...'`

- [ ] **Step 3: Triển khai 2 bút toán trong `BookingService.transitionStatus(COMPLETED)`**
  - Áp dụng logic tương tự khi chuyển đơn sang `COMPLETED` mà chưa từng thanh toán trước đó.

- [ ] **Step 4: Chạy test và xác minh**
  - Chạy `npm --prefix apps/api test -- booking.spec.ts` xác nhận PASS 100%.

- [ ] **Step 5: Commit**
  - `git add apps/api/src/modules/booking/ apps/api/test/booking.spec.ts`
  - `git commit -m "feat(booking): record dual-entry ledger transactions upon cash completion"`

---

### Task 3: Backend Finance Module (`FinanceModule`, `FinanceController`, `FinanceService`)

**Files:**
- Create: `apps/api/src/modules/finance/dto/query-transactions.dto.ts`
- Create: `apps/api/src/modules/finance/finance.service.ts`
- Create: `apps/api/src/modules/finance/finance.controller.ts`
- Create: `apps/api/src/modules/finance/finance.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/finance.spec.ts`

**Interfaces:**
- Produces: REST endpoints `GET /api/v1/finance/transactions`, `GET /api/v1/finance/summary`.

- [ ] **Step 1: Tạo DTO `QueryTransactionsDto`**
  - Fields: `search?: string`, `type?: WalletTransactionType`, `paymentMethod?: PaymentMethod`, `tenantId?: string`, `taskerId?: string`, `startDate?: string`, `endDate?: string`, `page?: number`, `limit?: number`.

- [ ] **Step 2: Triển khai `FinanceService`**
  - `getTransactions(query: QueryTransactionsDto, effectiveTenantId: string | null, isSuperAdmin: boolean)`:
    - Multi-tenant isolation: nếu `!isSuperAdmin`, bắt buộc `tenantId = effectiveTenantId`.
    - Tìm kiếm mờ `search`: `code`, `sourceName`, `targetName`, `notes`, `booking.code`.
    - Lọc theo `type`, `paymentMethod`, `taskerId`, `createdAt`.
    - Trả về `{ transactions, total, page, limit, summary: { totalCashCollected, totalCommissionFee, totalDepositTopUp } }`.
  - `getFinancialSummary(tenantId?: string, effectiveTenantId: string | null, isSuperAdmin: boolean)`:
    - Tính GMV, hoa hồng, doanh thu ròng và tổng tiền cọc đang giữ từ DB thực tế.

- [ ] **Step 3: Triển khai `FinanceController` & `FinanceModule`**
  - Endpoint `GET /finance/transactions` và `GET /finance/summary`.
  - Đăng ký vào `app.module.ts`.

- [ ] **Step 4: Viết Integration Test `apps/api/test/finance.spec.ts`**
  - Test login Super Admin -> xem toàn sàn.
  - Test login Tenant Admin -> cô lập tenant.
  - Test tìm kiếm theo `search` và lọc theo `type`, `paymentMethod`.
  - Chạy `npm --prefix apps/api test` xác nhận tất cả tests PASS.

- [ ] **Step 5: Commit**
  - `git add apps/api/src/modules/finance/ apps/api/src/app.module.ts apps/api/test/finance.spec.ts`
  - `git commit -m "feat(finance): add FinanceModule with transactions ledger query and summary"`

---

### Task 4: Frontend Admin API Client & Query Hooks

**Files:**
- Modify: `apps/admin/src/types/index.ts`
- Modify: `apps/admin/src/api/client.ts`
- Modify: `apps/admin/src/api/queries/useFinance.ts`
- Create: `apps/admin/src/api/finance-integration.spec.ts`

**Interfaces:**
- Consumes: Backend `GET /finance/transactions`, `GET /finance/summary`.
- Produces: `api.getWalletTransactions(params)`, `useWalletTransactionsQuery(params)`.

- [ ] **Step 1: Cập nhật `WalletTransaction` interface trong `types/index.ts`**
  - Bổ sung `sourceType`, `sourceId`, `sourceName`, `targetType`, `targetId`, `targetName`, `paymentMethod: PaymentMethod`, `customerId?`.

- [ ] **Step 2: Cập nhật `ApiClient` trong `apps/admin/src/api/client.ts`**
  - Thay thế mock data trong `getWalletTransactions`: gọi live `GET /finance/transactions` qua `this.fetchWithAuth`.
  - Thay thế mock data trong `getFinancialSummary`: gọi live `GET /finance/summary`.
  - Giữ fallback an toàn nếu offline.

- [ ] **Step 3: Cập nhật TanStack Query Hooks trong `useFinance.ts`**
  - Cập nhật `useWalletTransactionsQuery(params: TransactionQueryParams)` để nhận query params và đưa vào queryKey `['financialTransactions', params]`.

- [ ] **Step 4: Viết test `apps/admin/src/api/finance-integration.spec.ts`**
  - Kiểm tra gọi live API và nhận đúng cấu trúc dữ liệu.
  - Chạy `npm --prefix apps/admin test` xác nhận PASS.

- [ ] **Step 5: Commit**
  - `git add apps/admin/src/types/ apps/admin/src/api/`
  - `git commit -m "feat(admin): connect finance API client and TanStack Query hooks to live backend"`

---

### Task 5: Frontend Admin UI (`FinancePage.tsx` & `TransactionDetailModal.tsx`)

**Files:**
- Create: `apps/admin/src/pages/finance/TransactionDetailModal.tsx`
- Modify: `apps/admin/src/pages/finance/FinancePage.tsx`

**Interfaces:**
- Produces: Giao diện Sổ Cái Giao Dịch Toàn Hệ Thống với Search, Filters, Nguồn/Đích và modal chi tiết.

- [ ] **Step 1: Xây dựng `TransactionDetailModal.tsx`**
  - Modal hiển thị chi tiết chứng từ kế toán:
    - Header: Mã giao dịch, Trạng thái `COMPLETED`, Thời gian.
    - Dòng tiền: Khối Nguồn (Source) -> Mũi tên -> Khối Đích (Target).
    - Phương thức thanh toán (Tiền mặt, Ví ký quỹ, Chuyển khoản).
    - Biến động số dư: `balanceBefore` -> `balanceAfter`.
    - Chứng từ đơn hàng: Mã đơn `bookingCode` kèm link sang `/dispatch`.
    - Ghi chú và người thực hiện `triggeredBy`.

- [ ] **Step 2: Nâng cấp `FinancePage.tsx`**
  - Thêm ô tìm kiếm tức thời (Search bar) với icon Search.
  - Thêm dropdown chọn Phương thức thanh toán (`CASH`, `WALLET`, `BANK_TRANSFER`, `ALL`).
  - Cập nhật Tabs phân loại nghiệp vụ: `Tất cả`, `Thu tiền mặt`, `Hoa hồng sàn`, `Ký quỹ thợ`, `Quyết toán`.
  - Cập nhật bảng dữ liệu:
    - Cột Mã bút toán (monospace + nút copy nhanh).
    - Cột Nghiệp vụ & Phương thức thanh toán (Badge).
    - Cột Dòng tiền (Nguồn ➔ Đích với icon người/thợ/sàn).
    - Cột Đơn tham chiếu (`BK-...`).
    - Cột Số tiền biến động (+ xanh / - đỏ).
    - Cột Số dư sau giao dịch.
  - Click vào dòng mở `TransactionDetailModal`.

- [ ] **Step 3: Build & Kiểm thử Frontend**
  - Chạy `npm --prefix apps/admin run build` đảm bảo 0 lỗi TypeScript.
  - Chạy `npm --prefix apps/admin test` đảm bảo 100% tests PASS.

- [ ] **Step 4: Commit**
  - `git add apps/admin/src/pages/finance/`
  - `git commit -m "feat(admin): overhaul FinancePage with universal ledger, search, filters and detail modal"`

---

### Task 6: Documentation Synchronization & Final Verification

**Files:**
- Modify: `apps/admin/src/pages/docs/SystemDocsPage.tsx`
- Modify: `docs/superpowers/specs/2026-10-07-cash-payment-workflow.md`

**Interfaces:**
- Produces: Đồng bộ tài liệu hệ thống và xác minh 100% test suites pass.

- [ ] **Step 1: Cập nhật `SystemDocsPage.tsx`**
  - Thêm các API endpoints mới (`GET /api/v1/finance/transactions`, `GET /api/v1/finance/summary`) vào API Cheat Sheet.
  - Bổ sung tài liệu cơ chế 2 bút toán kế toán kép vào Actor Super Admin và Tenant Admin.

- [ ] **Step 2: Chạy toàn bộ Test Suites dự án**
  - `npm --prefix packages/shared-types test`
  - `npm --prefix apps/api test`
  - `npm --prefix apps/admin test`
  - `npm --prefix apps/admin run build`
  - `npm --prefix apps/api run build`

- [ ] **Step 3: Commit**
  - `git add apps/admin/src/pages/docs/ docs/`
  - `git commit -m "docs(system): document universal transaction ledger and finance APIs"`
