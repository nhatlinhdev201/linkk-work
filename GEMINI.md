# LinkkWork Project Guidelines & Core Rules

## 1. Animation & Fluid Motion Standards (Quy chuẩn Hoạt ảnh & Trải nghiệm Mượt mà)
* **Tiêu chí mượt mà là số 1:** Toàn bộ màn hình, trang, thẻ, nút bấm và bottom sheet trên Web Admin và Mobile App (Flutter) phải có hoạt ảnh mượt mà, uyển chuyển.
* **Mobile (Flutter):**
  * Tích hợp `flutter_animate` cho các hiệu ứng xuất hiện, chuyển cảnh so le (Staggered fade-slide), ripple radar pulse.
  * Tactile tap scale (`scale: 0.97`) kèm haptic vibration khi nhấn nút/thẻ.
  * Hero transitions khi mở chi tiết dịch vụ/đơn hàng.
  * BottomSheet mở trượt từ dưới lên kèm physics spring curve (`Curves.easeOutCubic`, `Curves.fastOutSlowIn`).
  * `AnimatedSwitcher` khi chuyển các bước trong Booking Wizard (Zero Layout Shift).
* **Web Admin (React/Tailwind):**
  * Luôn có `transition-all duration-200 ease-in-out`, backdrop blur `backdrop-blur-sm`, toast slide-in, modal scale animation.

## 2. Engineering Standards
* **Zero `any` Types:** Cấm dùng `any` trong TypeScript và hạn chế tối đa `dynamic` trong Dart.
* **Zero Flickering:** TanStack Query v5 + Zustand với Optimistic Updates trên Web; BLoC/Cubit với deterministic states trên Mobile.
* **Skeleton Shimmer:** Luôn có Skeleton loading cho cold load, tuyệt đối không dùng spinner tròn đơn điệu giữa trang.
* **Multi-Tenancy Isolation:** Bảo vệ ranh giới tenant tuyệt đối.
* **Anti-Fraud:** Bắt buộc camera phần cứng và kiểm tra Mock GPS đối với thợ ngoài hiện trường.
* **Double-Entry Ledger:** Hoàn tất đơn COD phải ghi nhận đủ 2 bút toán: `CASH_COLLECTED` (IN, CASH) và `COMMISSION_FEE` (OUT, WALLET).
