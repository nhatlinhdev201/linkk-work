# LinkkWork Engineering & Coding Standards

Tài liệu quy định toàn bộ tiêu chuẩn viết mã, phong cách kiến trúc và nguyên tắc chất lượng phần mềm áp dụng cho toàn bộ dự án **LinkkWork** (Bao gồm Web Admin Portal, Backend API, Mobile App và Shared Packages).

---

## 1. Nguyên Tắc Cốt Lõi (Core Principles)

1. **Type Strictness (Kiểu dữ liệu nghiêm ngặt - Không fake):**
   - **Tuyệt đối cấm sử dụng `any`** trong toàn bộ codebase TypeScript/React.
   - Mọi thực thể nghiệp vụ (Tenant, Booking, Tasker, Ledger, Service...) phải có Interface/Type rõ ràng, phản ánh chính xác trạng thái thực tế của hệ thống.
   - Sử dụng Discriminated Unions cho các trạng thái máy hữu hạn (State Machine) thay vì chuỗi string tự do.
   - Các API response, mock data, props component phải được typed tường minh.

2. **UI Component Consistency (Ưu tiên Common Components):**
   - **Bắt buộc tái sử dụng** bộ thư viện thành phần dùng chung (`src/components/common/`):
     - `Button`, `Input`, `Select`, `Badge`, `Card`, `Modal`, `Switch`, `Table`, `StatCard`, `EmptyState`, `Tabs`.
   - **Không viết style HTML trần trụi:** Không tạo các nút bấm hoặc ô nhập liệu dạng `<button className="...">` hay `<input className="...">` rời rạc trên từng trang.
   - Giữ tính nhất quán về visual hierarchy, padding, typography và semantic color palette.

3. **Responsive-First Design:**
   - 100% màn hình, modal, bảng biểu và form phải hiển thị hoàn hảo trên mọi kích thước thiết bị:
     - **Mobile:** `< 640px` (Drawer menu trượt, card view hoặc scrollable table, touch target >= 44px).
     - **Tablet:** `640px - 1024px` (Grid 2 cột, bảng dữ liệu rút gọn).
     - **Desktop & Widescreen:** `>= 1024px` (Sidebar cố định, grid 3-4 cột, dashboard toàn cảnh).
   - Layout shell không được phép tràn ngang (no horizontal overflow ở cấp body/main).

4. **Tone Màu & Design System Standards:**
   - Màu nhấn chủ đạo: **Cam sáng `#F97316` (`brand-500`)**.
   - Màu trung tính: Nền chính `bg-slate-50`, card `bg-white`, đường viền `border-slate-200/90`, chữ chính `text-slate-900`, chữ phụ `text-slate-500`.
   - Màu trạng thái nghiệp vụ (Semantic Tokens):
     - `success`: `emerald-600` (Đơn hoàn thành, Tasker online, KYC đã xác thực).
     - `warning`: `amber-600` (Đang chờ điều phối, đơn chưa gán thợ, cảnh báo cọc).
     - `danger`: `rose-600` (Đơn đã hủy, tiến trình lỗi, từ chối hồ sơ).
     - `info`: `sky-600` (Đang bắn đơn, đang di chuyển, thông tin tiến trình).

5. **Realistic Mock API & Data Persistence:**
   - Dữ liệu mock không được hardcode tĩnh trên view: phải đi qua lớp `ApiClient` handler.
   - Phải mô phỏng độ trễ mạng thực tế (`sleep(150ms - 300ms)`) để kiểm tra loading states và button loaders.
   - Dữ liệu tạo mới/sửa đổi phải persist vào `localStorage` để không bị mất khi F5 reload.

6. **Error Handling & User Feedback:**
   - Mọi tác vụ async (tạo đơn, chỉ định thợ, duyệt đối tác, lưu cấu hình) đều phải được bọc trong khối `try/catch`.
   - Thông báo phản hồi qua `ToastContext` (`toast.success`, `toast.error`, `toast.warning`, `toast.info`).
   - Màn hình trắng hoặc crash phải được chặn bởi `ErrorBoundary`.

---

## 2. Quy Chuẩn Đặt Tên & Cấu Trúc File (Naming & Structure)

| Đối tượng | Quy chuẩn | Ví dụ |
| :--- | :--- | :--- |
| **Component React** | PascalCase, 1 component chính/file | `BookingsPage.tsx`, `StatCard.tsx` |
| **Hook Custom** | camelCase bắt đầu bằng `use` | `useAuth.ts`, `useToast.ts` |
| **File tiện ích / API** | kebab-case hoặc camelCase | `client.ts`, `mock-data.ts` |
| **Interface / Type** | PascalCase | `Booking`, `Tasker`, `WalletTransaction` |
| **Hằng số / Constant** | UPPER_SNAKE_CASE | `INITIAL_BOOKINGS`, `STORAGE_KEYS` |
| **Biến / Hàm** | camelCase | `handleCreateBooking()`, `activeTenantId` |

---

## 3. Checklist Trước Khi Hoàn Tất Bất Kỳ Tính Năng Nào

- [ ] Toàn bộ Types được khai báo chính xác trong `types/index.ts`, không còn `any`.
- [ ] Sử dụng các Common Components (`StatCard`, `EmptyState`, `Table`, `Badge`, `Button`, `Modal`).
- [ ] Giao diện hỗ trợ đầy đủ responsive trên mobile breakpoint (`< 640px`).
- [ ] Đã thêm Toast feedback cho cả 2 trường hợp thành công và thất bại.
- [ ] Chạy `npm run build` đạt 0 lỗi TypeScript và 0 cảnh báo nghiêm trọng.
