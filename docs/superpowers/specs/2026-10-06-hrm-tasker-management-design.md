# LinkkWork HRM & Tasker Operations Architecture Specification

- **Document ID:** `SPEC-2026-10-06-HRM-TASKER`
- **Topic:** Phân hệ Quản trị Nhân sự & Đội ngũ Thợ (HRM, Staff Setup, Work Floor, Balances & Immutable Ledger)
- **Target Applications:** `apps/api` (NestJS) & `apps/admin` (React + Vite)
- **Author:** LinkkWork Core Engineering Team
- **Status:** Approved / Ready for Implementation

---

## 1. Executive Summary & Goals

Phân hệ Quản trị Nhân sự & Thợ (HRM & Tasker Operations) là một trong những trụ cột nghiệp vụ thiết yếu của nền tảng LinkkWork. Phân hệ chịu trách nhiệm toàn bộ vòng đời của người lao động/thợ từ khi gia nhập đối tác (Tenant onboarding), phân bổ kỹ năng chuyên môn, thiết lập sàn làm việc và bán kính nhận đơn, giám sát trạng thái thời gian thực, quản lý đa ví tài chính (Ký quỹ, Thu nhập khả dụng, Tài khoản ngân hàng, Sổ cái giao dịch bất biến), cho tới hệ thống cảnh báo vận hành tự động.

### Mục tiêu Cốt lõi:
1. **Đăng ký thợ vào Tenant (Multi-Tenant Tasker Onboarding):**
   - Hỗ trợ Tenant Admin đăng ký nhân viên/thợ trực thuộc đơn vị của mình.
   - Super Admin có thể đăng ký thợ cho bất kỳ Tenant nào hoặc thợ tự do thuộc Đội ngũ Sàn toàn quốc.
   - Khởi tạo tài khoản hệ thống `User` (`role: TASKER`) cùng hồ sơ `TaskerProfile`.
2. **Thiết lập Năng lực & Công việc (Skill Matrix & Job Setup):**
   - Phân bổ danh sách kỹ năng chuyên môn (`skills: String[]`). Chỉ thợ sở hữu kỹ năng tương ứng mới được phân phối đơn hàng phù hợp.
   - Cấu hình cơ chế lương / phân chia doanh thu: Hoa hồng theo đơn (`COMMISSION`) hoặc Lương cứng (`FIXED_SALARY`).
3. **Thiết lập Sàn làm việc & Ca trực (Work Floor & Geo-Radius):**
   - Bán kính phục vụ tối đa (`maxDistanceKm`, mặc định 15 km).
   - Quyền nhận việc tự động từ Radar sàn (`autoRadarEnabled: Boolean`) hoặc chỉ nhận điều phối nội bộ.
   - Trạng thái trực tuyến (`isOnline: Boolean`) và tọa độ làm việc (`currentLat`, `currentLng`).
4. **Vòng đời & Trạng thái Hoạt động (Tasker Lifecycle):**
   - Trạng thái công việc: `IDLE` (Rảnh rỗi, sẵn sàng nhận việc), `ARRIVING` (Đang di chuyển tới nhà khách), `IN_PROGRESS` (Đang thi công), `RESTRICTED` (Bị tạm khóa do thiếu ký quỹ hoặc vi phạm).
   - Xác thực danh tính KYC (`kycVerified: Boolean`, `idCardNumber: String`): Chặn thợ chưa duyệt KYC tham gia nhận việc toàn sàn.
5. **Cơ chế Đa Ví & Sổ cái Giao dịch Kép Bất biến (Multi-Wallet & Financial Ledger):**
   - **Ví Ký Quỹ Đảm Bảo (`depositBalance`)**: Tiền cọc an toàn thợ nạp vào trước để nhận việc. Ngưỡng an toàn tối thiểu là 100.000 VNĐ. Nếu dưới ngưỡng này, hệ thống tự động khóa nhận việc.
   - **Ví Thu Nhập Khả Dụng (`walletBalance`)**: Nơi ghi nhận tiền công thực nhận sau khi hoàn tất đơn hàng. Thợ có thể rút về ngân hàng.
   - **Tài khoản Ngân hàng (`bankName`, `bankAccountNumber`, `bankAccountHolder`)**: Lưu trữ thông tin phục vụ chi trả lương.
   - **Sổ cái Giao dịch Bất biến (`WalletTransaction`)**: Mọi biến động tiền cọc, tiền công, khấu trừ hoa hồng, hoàn cọc đều sinh bản ghi bất biến với số dư trước/sau rõ ràng.
6. **Hệ thống Cảnh báo HRM Thông minh (`HRMAlertsBanner`):**
   - Cảnh báo Ký quỹ không đủ (< 100k): Cảnh báo đỏ, chặn nhận việc, hỗ trợ nút Nạp nhanh.
   - Cảnh báo Chưa xác thực KYC: Cảnh báo vàng, hỗ trợ nút Thẩm định & Duyệt KYC nhanh.
   - Cảnh báo Đánh giá thấp (< 4.0 sao): Cảnh báo chất lượng dịch vụ để đơn vị can thiệp đào tạo.
   - Tích hợp bộ lọc 1-click trực tiếp từ Banner cảnh báo.

---

## 2. Architecture & Data Contracts

### 2.1. Prisma Schema Modifications (`apps/api/prisma/schema.prisma`)

```prisma
// Enum phân loại biến động số dư tài chính
enum WalletTransactionType {
  TOP_UP_DEPOSIT       // Nạp tiền vào ví ký quỹ
  WITHDRAW_DEPOSIT     // Rút tiền từ ví ký quỹ
  SOFT_HOLD            // Tạm giữ cọc an toàn khi nhận đơn
  HOLD_RELEASE         // Hoàn cọc an toàn khi hoàn thành/nghiệm thu đơn
  ORDER_PAYOUT         // Quyết toán tiền công đơn hàng vào ví thu nhập
  COMMISSION_FEE       // Thu phí hoa hồng nền tảng / đơn vị
  PENALTY_DEDUCTION    // Khấu trừ phạt vi phạm
}

enum WalletTransactionStatus {
  COMPLETED
  PENDING
  FAILED
  REJECTED
}

// Mở rộng TaskerProfile
model TaskerProfile {
  id                 String   @id @default(uuid())
  userId             String   @unique
  tenantId           String
  rating             Float    @default(5.0)
  completedJobsCount Int      @default(0)
  isOnline           Boolean  @default(false)
  currentLat         Float?
  currentLng         Float?
  
  // Năng lực & KYC
  skills             String[] @default([])
  idCardNumber       String?
  kycVerified        Boolean  @default(false)
  
  // Sàn làm việc & Bán kính
  maxDistanceKm      Float    @default(15.0)
  autoRadarEnabled   Boolean  @default(true)
  currentStatus      String   @default("IDLE") // "IDLE" | "ARRIVING" | "IN_PROGRESS" | "RESTRICTED"
  
  // Đa ví & Tài chính
  depositBalance     Float    @default(500000)
  walletBalance      Float    @default(0)
  salaryType         String   @default("COMMISSION") // "COMMISSION" | "FIXED_SALARY"
  
  // Thông tin Ngân hàng nhận lương
  bankName           String?
  bankAccountNumber  String?
  bankAccountHolder  String?
  
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant             Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([isOnline, currentStatus])
  @@map("tasker_profiles")
}

// Bảng Sổ cái Giao dịch Bất biến (Immutable Financial Ledger)
model WalletTransaction {
  id            String                  @id @default(uuid())
  code          String                  @unique // TX-YYYY-XXXXXX
  tenantId      String
  taskerId      String?
  bookingId     String?
  type          WalletTransactionType
  amount        Float
  direction     String                  // "IN" | "OUT"
  balanceBefore Float
  balanceAfter  Float
  status        WalletTransactionStatus @default(COMPLETED)
  bankName      String?
  bankAccount   String?
  notes         String?
  triggeredBy   String
  createdAt     DateTime                @default(now())

  tenant        Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  tasker        User?                   @relation(fields: [taskerId], references: [id], onDelete: SetNull)
  booking       Booking?                @relation(fields: [bookingId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([taskerId])
  @@index([bookingId])
  @@map("wallet_transactions")
}
```

### 2.2. Backend API Layer (`apps/api/src/modules/tasker`)

Cấu trúc module:
- `tasker.module.ts`: Khai báo controller, service, imports Prisma, Tenancy.
- `tasker.controller.ts`: Định tuyến REST endpoints với đầy đủ `@UseGuards(JwtAuthGuard, RolesGuard, TenantContextGuard)`.
- `tasker.service.ts`: Xử lý nghiệp vụ logic, ràng buộc tenant isolation, giao dịch tài chính ACID bằng `prisma.$transaction`.
- `dto/`:
  - `create-tasker.dto.ts`
  - `update-tasker.dto.ts`
  - `update-work-floor.dto.ts`
  - `adjust-deposit.dto.ts`
  - `update-kyc.dto.ts`

#### API Endpoints Chi tiết:
1. `POST /api/v1/taskers`:
   - Phân quyền: `SUPER_ADMIN`, `TENANT_ADMIN`.
   - Body: `name`, `phone`, `email`, `password?`, `tenantId?`, `idCardNumber?`, `skills?: string[]`, `depositBalance?: number`, `bankName?`, `bankAccountNumber?`, `bankAccountHolder?`.
   - Xử lý: Tạo `User` role `TASKER`, hash mật khẩu bằng bcrypt, tạo `TaskerProfile`. Nếu `depositBalance > 0`, tự động tạo bản ghi `WalletTransaction` loại `TOP_UP_DEPOSIT`.
2. `GET /api/v1/taskers`:
   - Query: `tenantId?`, `search?`, `onlineOnly?`, `kycPendingOnly?`, `lowDepositOnly?`, `page?`, `limit?`.
   - Trả về: Danh sách thợ kèm profile, số dư, kỹ năng, trạng thái.
3. `GET /api/v1/taskers/:id`:
   - Trả về: Chi tiết thợ, thông tin ngân hàng, 10 giao dịch tài chính gần nhất.
4. `PATCH /api/v1/taskers/:id`:
   - Body: `name?`, `phone?`, `skills?`, `bankName?`, `bankAccountNumber?`, `bankAccountHolder?`.
5. `PATCH /api/v1/taskers/:id/work-floor`:
   - Body: `maxDistanceKm?: number`, `autoRadarEnabled?: boolean`, `isOnline?: boolean`.
6. `PATCH /api/v1/taskers/:id/toggle-status`:
   - Đảo trạng thái `isOnline = !isOnline`.
7. `POST /api/v1/taskers/:id/deposit`:
   - Body: `amount: number` (dương = nạp, âm = khấu trừ), `notes: string`.
   - Xử lý trong transaction: Cập nhật `TaskerProfile.depositBalance`, tạo `WalletTransaction`.
8. `PATCH /api/v1/taskers/:id/kyc`:
   - Body: `kycVerified: boolean`, `idCardNumber?: string`, `notes?: string`.
9. `GET /api/v1/taskers/:id/transactions`:
   - Trả về lịch sử giao dịch của thợ.

### 2.3. Frontend Web Admin Layer (`apps/admin`)

#### 1. Models & Schemas:
- `apps/admin/src/types/index.ts`: Đồng bộ `Tasker` interface đầy đủ các trường:
  ```typescript
  export interface Tasker {
    id: string;
    code: string;
    name: string;
    phone: string;
    email?: string;
    avatarUrl?: string;
    tenantId: string;
    tenantName: string;
    rating: number;
    ratingScore: number;
    completedJobs: number;
    isOnline: boolean;
    walletBalance: number;
    depositBalance: number;
    softHoldBalance: number;
    currentStatus: 'IDLE' | 'ARRIVING' | 'IN_PROGRESS' | 'RESTRICTED';
    kycVerified: boolean;
    idCardNumber?: string;
    skills: string[];
    maxDistanceKm?: number;
    autoRadarEnabled?: boolean;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountHolder?: string;
    createdAt?: string;
  }
  ```
- `apps/admin/src/schemas/tasker.schema.ts`: Zod validation cho form Thêm/Sửa thợ, Nạp ký quỹ, Cấu hình sàn làm việc.

#### 2. Components & UI Pages:
- `apps/admin/src/pages/taskers/`:
  - `TaskersPage.tsx`: Trang chủ quản trị HRM.
    - Header: Thống kê thợ, nút "Đăng ký thợ mới" (`CreateTaskerModal`).
    - `HRMAlertsBanner.tsx`: Hiển thị cảnh báo ký quỹ yếu (< 100k), cảnh báo chờ KYC, cảnh báo rating < 4.0. Cho phép bấm vào để áp dụng bộ lọc nhanh.
    - Filter Bar: Tìm kiếm, Tabs lọc (Tất cả, Trực tuyến, Ngoại tuyến, Ký quỹ thấp, Chờ KYC).
    - Grid Card Thợ tương tác cao:
      - Nút Bật/Tắt Trực tuyến (Toggle switch).
      - Nút "Sửa hồ sơ & Kỹ năng" (`TaskerModal`).
      - Nút "Sàn làm việc & Bán kính" (`WorkFloorModal`).
      - Nút "Nạp ký quỹ" (`DepositModal`).
      - Nút "Duyệt KYC" với `useConfirm`.
      - Nút "Xem sao kê & Lương" mở Drawer lịch sử giao dịch.
  - `TaskerModal.tsx`: Modal tạo mới / cập nhật hồ sơ thợ.
  - `WorkFloorModal.tsx`: Modal thiết lập sàn làm việc, bán kính quét đơn, quyền nhận việc radar.
  - `DepositModal.tsx`: Modal nạp tiền ký quỹ nhanh hoặc khấu trừ với lý do chi tiết.
  - `TaskerDetailDrawer.tsx`: Drawer xem chi tiết hồ sơ, tài khoản ngân hàng và lịch sử giao dịch sổ cái kép.

---

## 3. Business Rules & Financial Integrity

1. **Quy tắc Ký quỹ An toàn (Safe Deposit Policy):**
   - Ngưỡng an toàn tối thiểu: `100,000 VND`.
   - Nếu `depositBalance < 100,000 VND`:
     - Trạng thái nhận việc của thợ tự động chuyển sang cảnh báo.
     - Dispatch Console không cho phép chỉ định thợ này vào đơn mới (hiển thị tooltip cảnh báo "Ký quỹ không đủ").
     - Thợ không nhận được tín hiệu quét việc từ Radar toàn sàn.
2. **Quy tắc Xác thực Danh tính (KYC Verification Policy):**
   - Thợ chưa xác minh KYC (`kycVerified === false`) chỉ có thể nhận đơn điều phối nội bộ của chính Tenant quản lý nếu được Admin phê duyệt đặc biệt.
   - Tuyệt đối không được phát sóng đơn toàn sàn hoặc cho phép thợ chưa KYC nhận đơn giá trị cao (> 2.000.000 VND).
3. **Tính Toàn vẹn của Sổ cái Giao dịch (Ledger Immutability):**
   - Tuyệt đối không có hành động `UPDATE` hoặc `DELETE` trên bảng `WalletTransaction`.
   - Mọi điều chỉnh tài chính bắt buộc phải thực hiện thông qua giao dịch bù trừ (offsetting transaction) có ghi chú và mã người duyệt.

---

## 4. Verification & Testing Strategy

1. **Backend Integration Tests (`apps/api/test/tasker.spec.ts`):**
   - Đăng ký thợ mới thuộc Tenant thành công.
   - Thử nghiệm Tenant Isolation: Tenant A không thể xem, sửa hoặc nạp cọc cho thợ của Tenant B.
   - Thử nghiệm nạp ký quỹ: Số dư `depositBalance` cập nhật chính xác và bảng `WalletTransaction` ghi nhận đúng số tiền, số dư trước/sau.
   - Thử nghiệm duyệt KYC: Cập nhật cờ `kycVerified` thành công.
   - Chặn phân công khi ký quỹ < 100k: Kiểm tra logic chặn trong dispatch.
2. **Frontend Tests (`apps/admin/src/api/tasker-integration.spec.ts`):**
   - Kiểm thử gọi API live đăng ký thợ, lấy danh sách thợ, bật tắt trạng thái trực tuyến.
   - Kiểm thử Zod schema xác thực dữ liệu đầu vào.
   - Kiểm thử 100% build sạch không có lỗi TypeScript (`tsc && vite build`).
3. **Tiêu chuẩn Kỹ thuật:**
   - Zero `any` types.
   - Toàn bộ 214+ bài kiểm thử hiện có của LinkkWork tiếp tục PASS 100%.

---
