# LinkkWork Engineering & Coding Standards

Tài liệu quy định toàn bộ tiêu chuẩn viết mã, phong cách kiến trúc và nguyên tắc chất lượng phần mềm áp dụng cho toàn bộ dự án **LinkkWork** (Bao gồm Web Admin Portal, Backend API, Mobile App và Shared Packages).

---

## 1. Nguyên Tắc Cốt Lõi (Core Principles)

1. **Type Strictness (Kiểu dữ liệu nghiêm ngặt - Tuyệt đối không fake):**
   - **Tuyệt đối cấm sử dụng `any`** trong toàn bộ codebase TypeScript/React.
   - Mọi thực thể nghiệp vụ (Tenant, Booking, Tasker, Ledger, Service...) phải có Interface/Type rõ ràng, phản ánh chính xác trạng thái thực tế của hệ thống.
   - Sử dụng Discriminated Unions cho các trạng thái máy hữu hạn (State Machine) thay vì chuỗi string tự do.
   - Các API response, mock data, props component phải được typed tường minh.

2. **UI Component Consistency & Fluid Animation (Hoạt ảnh mượt mà, uyển chuyển):**
   - **Bắt buộc tái sử dụng** bộ thư viện thành phần dùng chung (`src/components/common/` trên Web và `packages/design_system` trên Mobile).
   - **Tiêu chí mượt mà là số 1 (Fluid Motion):**
     - Mọi màn hình (Screen/Page), Modal, BottomSheet, Card, Button bắt buộc phải có hiệu ứng hoạt ảnh mượt mà uyển chuyển.
     - **Web Admin:** `transition-all duration-200 ease-in-out`, hover scale, backdrop blur `backdrop-blur-sm`, toast slide-in, tab indicator chuyển động êm ái.
     - **Mobile Flutter:** Tích hợp `flutter_animate` cho staggered lists (danh sách trượt mềm mại so le), ripple pulse animation cho radar quét đơn, tactile tap scale (`scale: 0.97`) khi bấm nút, Hero transition khi mở chi tiết, và `AnimatedSwitcher` cho các bước Booking Wizard.
     - Sử dụng đường cong chuyển động vật lý mềm mại (`Curves.easeOutCubic`, `Curves.fastOutSlowIn`), tuyệt đối tránh chuyển động giật khựng thô ráp.

3. **Skeleton Loading Rule (Bắt buộc trên 100% Trang):**
   - **Không dùng Spinner đơn điệu:** Tuyệt đối không dùng 1 vòng quay tròn ở giữa trang làm người dùng hụt hẫng.
   - **Mô phỏng chính xác cấu trúc:** Khi trang ở trạng thái `loading === true`, bắt buộc render khung xương (Skeleton) với hiệu ứng sóng Shimmer (`animate-pulse bg-slate-200`):
     - Trang Dashboard: 4 StatCard Skeletons + 1 Table Skeleton.
     - Trang Danh sách Đơn / Thợ / Dịch vụ: Filter Tabs Skeleton + Cards/Table Rows Skeletons.
     - Trang Chi tiết / Cài đặt: Form Field Skeletons.

4. **Responsive Dual-Mode Table & Pagination:**
   - Bảng dữ liệu trên màn hình lớn (`>= md`) hiển thị dạng `<table />` chuẩn, căn gióng số liệu khoa học.
   - Trên màn hình nhỏ điện thoại (`< md`), bảng phải tự động co giãn thông minh hoặc chuyển đổi sang cấu trúc Thẻ (Card View) để người dùng thao tác vuốt chạm dễ dàng.
   - Mọi bảng danh sách dữ liệu (Đơn hàng, Bút toán tài chính, Danh sách thợ, Doanh nghiệp) đều phải tích hợp **Phân trang (Pagination)** chuẩn hóa (Số bản ghi/trang, Nút Trước/Sau, Trang hiện tại).

5. **Layout Layering & Sidebar Performance:**
   - **Render đúng một lớp duy nhất:** Tránh render thừa 2 lần Sidebar trong cây DOM khi chuyển breakpoint desktop/mobile.
   - **Animation đóng/mở mượt mà:**
     - Trên desktop: Hỗ trợ thu gọn (Collapsed: icon only) hoặc mở rộng (Expanded: icon + label) với transition mượt mà.
     - Trên mobile: Menu Drawer trượt nhẹ nhàng từ bên trái (`transform -translate-x-full` sang `translate-x-0`), overlay backdrop làm mờ màn hình, tự động đóng khi bấm chuyển trang.

6. **Form Layout Consistency & Validation:**
   - Cấu trúc Form chuẩn hóa: Label rõ ràng, dấu sao đỏ `*` cho trường bắt buộc, helper text hoặc placeholder trực quan.
   - **Validation đồng bộ ngay dưới Input:** Hiển thị thông báo lỗi màu đỏ kèm viền đỏ (`border-rose-400 focus:ring-rose-500`) ngay bên dưới trường vi phạm khi submit hoặc blur:
     - Họ tên: >= 2 ký tự.
     - Số điện thoại: Regex định dạng di động Việt Nam (`/(84|0[3|5|7|8|9])+([0-9]{8})\b/`).
     - Email: Regex email chuẩn quốc tế.
     - Số tiền / Giờ: Số dương hợp lệ (> 0).

7. **Realistic Mock API & Data Persistence:**
   - Dữ liệu mock không được hardcode tĩnh trên view: phải đi qua lớp `ApiClient` handler.
   - Phải mô phỏng độ trễ mạng thực tế (`sleep(150ms - 300ms)`) để kiểm tra loading states và button loaders.
   - Dữ liệu tạo mới/sửa đổi phải persist vào `localStorage` để không bị mất khi F5 reload.

8. **Error Handling & User Feedback:**
   - Mọi tác vụ async (tạo đơn, chỉ định thợ, duyệt đối tác, lưu cấu hình) đều phải được bọc trong khối `try/catch`.
   - Thông báo phản hồi qua `ToastContext` (`toast.success`, `toast.error`, `toast.warning`, `toast.info`).
   - Màn hình trắng hoặc crash phải được chặn bởi `ErrorBoundary`.

9. **State Management, Cache & Zero-Flicker Architecture (TanStack Query v5 + Zustand):**
   - **Phân định ranh giới rành mạch giữa Server State và Client UI State:**
     - **Server State (TanStack Query v5):** Dữ liệu nghiệp vụ từ Backend/API (Bookings, Tenants, Taskers, Services, Cron Jobs, Finance, Settings). Cấu hình chuẩn: `staleTime: 120_000` (2 phút), `gcTime: 600_000` (10 phút), `refetchOnWindowFocus: false`.
     - **Client UI State (Zustand Store):** Trạng thái giao diện người dùng (Sidebar collapsed, Mobile Drawer open/close, Modals, Local filter preferences).
   - **Tuyệt đối cấm kích hoạt lại Skeleton toàn trang sau Mutation (Anti-Flicker):**
     - Tuyệt đối không gọi các hàm `loadData()` gây `setLoading(true)` sau khi hoàn thành mutation (Gán việc, Tạo đơn, Duyệt đối tác, Toggle switch dịch vụ/cron). Hành vi này làm unmount toàn bộ view và hiển thị lại Skeleton gây nháy giật giao diện ("flict UI").
   - **Optimistic UI Updates (Phản hồi 0ms trên Cache):**
     - Mọi Mutation thao tác dữ liệu phải triển khai Optimistic Update:
       1. Cancel refetch đang chạy (`queryClient.cancelQueries`).
       2. Lưu snapshot cache hiện tại (`previousData`).
       3. Cập nhật trực tiếp `queryClient.setQueryData` với dữ liệu mới ngay lập tức.
       4. Rollback hoàn tác tại `onError` nếu API trả lỗi.
       5. Đồng bộ ngầm tại `onSettled` (`queryClient.invalidateQueries`) mà không làm xáo trộn hiển thị.
   - **Skeleton chỉ áp dụng cho Initial Cold Load:**
     - Chỉ kích hoạt Skeleton Loading khi `isLoading && !data` (lần đầu vào trang chưa có cache).
     - Khi người dùng bấm action hoặc đang revalidate ở background (`isFetching`), chỉ hiển thị trạng thái xử lý cục bộ trên nút (`isPending`), giữ nguyên bảng/thẻ dữ liệu.

---

## 2. Quy Chuẩn Đặt Tên & Cấu Trúc File (Naming & Structure)

| Đối tượng | Quy chuẩn | Ví dụ |
| :--- | :--- | :--- |
| **Component React** | PascalCase, 1 component chính/file | `BookingsPage.tsx`, `StatCard.tsx`, `Pagination.tsx` |
| **Hook Custom** | camelCase bắt đầu bằng `use` | `useAuth.ts`, `useToast.ts` |
| **File tiện ích / API** | kebab-case hoặc camelCase | `client.ts`, `mock-data.ts` |
| **Interface / Type** | PascalCase | `Booking`, `Tasker`, `WalletTransaction` |
| **Hằng số / Constant** | UPPER_SNAKE_CASE | `INITIAL_BOOKINGS`, `STORAGE_KEYS` |
| **Biến / Hàm** | camelCase | `handleCreateBooking()`, `activeTenantId` |

---

## 3. Checklist Trước Khi Hoàn Tất Bất Kỳ Tính Năng Nào

- [ ] Toàn bộ Types được khai báo chính xác trong `types/index.ts`, không còn `any`.
- [ ] Bắt buộc có Skeleton Loading đúng layout khi `isLoading && !data` (chỉ ở initial cold load).
- [ ] Áp dụng TanStack Query v5 & Zustand; mọi Mutation phải Optimistic Update (0ms flicker-free).
- [ ] Bảng danh sách có Phân trang (Pagination) và hiển thị thân thiện trên mobile.
- [ ] Form có validation logic rõ ràng, hiển thị lỗi màu đỏ dưới input.
- [ ] Sidebar đóng mở có animation mượt mà, không bị duplicate DOM node.
- [ ] Đã thêm Toast feedback cho cả 2 trường hợp thành công và thất bại.
- [ ] Chạy `npm run build` đạt 0 lỗi TypeScript và 0 cảnh báo nghiêm trọng.
