---
title: UI Animation, Fluid Motion & Micro-Interactions Standards
trigger: always_on
---

# UI Animation, Fluid Motion & Micro-Interactions Standards

Mọi màn hình (Screens), trang (Pages), thành phần giao diện (Components/Widgets) trên cả Web Admin và Mobile App (Flutter) bắt buộc phải tuân thủ nghiêm ngặt tiêu chuẩn **Hoạt ảnh mượt mà, uyển chuyển (Fluid Motion & Smooth Transitions)**. Sự mượt mà là tiêu chí tiên quyết trong đánh giá trải nghiệm người dùng.

---

## 1. Nguyên Tắc Cốt Lõi (Core Animation Principles)

1. **60-120 FPS Fluidity (Tối ưu hóa khung hình):**
   * Không sử dụng các phép tính nặng hoặc setState không cần thiết trong Animation loops.
   * Ưu tiên các widget được tối ưu phần cứng (Hardware Accelerated): `Transform`, `Opacity` (hoặc `FadeTransition`), `SlideTransition`, `ScaleTransition`.

2. **Natural Physics Easing (Đường cong chuyển động tự nhiên):**
   * Tuyệt đối tránh chuyển động tuyến tính cứng nhắc (`Curves.linear`).
   * Sử dụng các đường cong vật lý mềm mại:
     * Vào màn hình / Xuất hiện: `Curves.easeOutCubic` hoặc `Curves.fastOutSlowIn`.
     * Rời màn hình / Ẩn đi: `Curves.easeInCubic`.
     * Tương tác đàn hồi (Spring / Bounce nhẹ): `Curves.elasticOut` hoặc `Curves.bounceOut` cho thông báo hoàn tất, checkmark thành công.

3. **Thời lượng chuẩn (Duration Guidelines):**
   * Micro-interactions (Nút bấm, Toggle, Checkbox, Icon): `150ms - 250ms`.
   * Chuyển đổi thành phần (Card expand, Accordion, Tab switch, BottomSheet): `300ms - 400ms`.
   * Chuyển trang (Page Transitions, Hero Animations): `350ms - 500ms`.

---

## 2. Tiêu Chuẩn Áp Dụng Trên Mobile App (Flutter)

1. **Thư viện chuẩn hóa:**
   * Sử dụng **`flutter_animate`** cho các hiệu ứng xuất hiện, stagger, shimmer, pulse.
   * Sử dụng **`Hero` widget** khi chuyển từ danh sách dịch vụ ➔ chi tiết dịch vụ, hoặc từ thumbnail ảnh ➔ xem toàn màn hình.

2. **Nút bấm & Thẻ tương tác (Tactile Feedback):**
   * Mọi `LinkkButton` và `LinkkCard` khi người dùng nhấn giữ (tap down) phải có hiệu ứng đàn hồi thu nhỏ nhẹ: `scale: 0.97` kèm phản hồi rung Haptic (`HapticFeedback.selectionClick()`), nhả tay bung về `1.0`.

3. **Danh sách xuất hiện mềm mại (Staggered List Animation):**
   * Khi load danh mục dịch vụ hoặc danh sách đơn hàng, các item không xuất hiện giật cục mà lướt nhẹ từ dưới lên:
     ```dart
     Animate(
       effects: [
         FadeEffect(duration: 300.ms, curve: Curves.easeOutCubic),
         SlideEffect(begin: const Offset(0, 0.1), end: Offset.zero, duration: 300.ms, curve: Curves.easeOutCubic),
       ],
       child: itemWidget,
     )
     ```
   * Thêm độ trễ so le: `.delay((index * 50).ms)`.

4. **Radar Quét Đơn & Báo động (Radar Pulse Animation):**
   * Màn hình radar của thợ phải có hiệu ứng sóng xung kích tỏa ra đa tầng lặp vô tận (Infinite Ripple Pulse).
   * BottomSheet nổ đơn đếm ngược 30 giây trượt từ dưới lên kèm hiệu ứng Spring êm ái, thanh tiến trình ProgressBar lùi dần mượt mà không khựng.

5. **Chuyển đổi trạng thái (State Transition Smoothness):**
   * Sử dụng `AnimatedSwitcher` với `FadeTransition` hoặc `SharedAxisTransition` khi chuyển bước trong Booking Wizard (Bước 1 ➔ 2 ➔ 3 ➔ 4).
   * Không nháy giật layout (Zero Layout Shift).

---

## 3. Tiêu Chuẩn Áp Dụng Trên Web Admin (React / Tailwind)

1. **Transitions:** Luôn có `transition-all duration-200 ease-in-out` trên nút, tab, modal, dropdown.
2. **Modals & Drawers:** Backdrop blur `backdrop-blur-sm`, modal zoom-in nhẹ `scale-95 ➔ scale-100`, drawer trượt mượt mà từ cạnh màn hình.
3. **Table & Tabs:** Indicator tab chuyển động trượt êm (`framer-motion` hoặc CSS layout animation).
