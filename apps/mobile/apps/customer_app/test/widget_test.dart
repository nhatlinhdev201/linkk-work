import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:linkkwork_customer_app/main.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('CustomerApp Widget & Interaction Tests', () {
    testWidgets('pumps CustomerApp and renders headers, cards, and CTA button',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        const CustomerApp(
          enableAnimations: false,
        ),
      );
      await tester.pump();

      // Verify App Bar Title
      expect(find.text('LinkkWork Khách Hàng'), findsOneWidget);

      // Verify Location Banner
      expect(find.byKey(const Key('location_picker_banner')), findsOneWidget);
      expect(find.text('ĐỊA CHỈ NHẬN VIỆC'), findsOneWidget);
      expect(find.text('Tòa Landmark 81, P. 22, Bình Thạnh, TP.HCM'),
          findsOneWidget);

      // Verify Category Chips
      expect(find.text('Tất cả'), findsOneWidget);
      expect(find.text('Dọn dẹp vệ sinh'), findsOneWidget);
      expect(find.text('Sửa điện nước'), findsOneWidget);
      expect(find.text('Điện lạnh'), findsOneWidget);

      // Verify Service Cards
      expect(find.text('Dọn dẹp nhà theo giờ'), findsOneWidget);
      expect(find.text('Vệ sinh máy lạnh treo tường'), findsOneWidget);

      // Verify Sticky CTA Button
      expect(find.byKey(const Key('customer_main_cta_btn')), findsOneWidget);
      expect(find.text('ĐẶT THỢ NGAY (TÍNH GIÁ ĐỘNG)'), findsOneWidget);
    });

    testWidgets('filters service cards when category chip is tapped',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const CustomerApp(
          enableAnimations: false,
        ),
      );
      await tester.pump();

      // Initially shows multiple categories
      expect(find.text('Dọn dẹp nhà theo giờ'), findsOneWidget);
      expect(find.text('Vệ sinh máy lạnh treo tường'), findsOneWidget);

      // Tap on 'Điện lạnh' category chip
      final acChipFinder = find.byKey(const Key('category_chip_Điện_lạnh'));
      expect(acChipFinder, findsOneWidget);
      await tester.tap(acChipFinder);
      await tester.pump();

      // Only AC service remains, cleaning is filtered out
      expect(find.text('Vệ sinh máy lạnh treo tường'), findsOneWidget);
      expect(find.text('Dọn dẹp nhà theo giờ'), findsNothing);

      // Tap back on 'Tất cả'
      final allChipFinder = find.byKey(const Key('category_chip_Tất_cả'));
      expect(allChipFinder, findsOneWidget);
      await tester.tap(allChipFinder);
      await tester.pump();

      expect(find.text('Dọn dẹp nhà theo giờ'), findsOneWidget);
      expect(find.text('Vệ sinh máy lạnh treo tường'), findsOneWidget);
    });

    testWidgets('tapping service card opens Booking Wizard with Step 1',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const CustomerApp(
          enableAnimations: false,
        ),
      );
      await tester.pump();

      // Tap the first service card
      final firstCard = find.byKey(const Key('service_card_srv-cleaning-01'));
      expect(firstCard, findsOneWidget);
      await tester.tap(firstCard);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Verify Wizard Step 1 is rendered
      expect(find.text('Bước 1 / 4'), findsOneWidget);
      expect(find.text('Khối lượng & Tính giá'), findsOneWidget);
      expect(find.text('Dự toán giá động thời gian thực'), findsOneWidget);
      expect(
          find.byKey(const Key('wizard_increase_units_btn')), findsOneWidget);

      // Increase units: default 2 -> 3
      await tester.tap(find.byKey(const Key('wizard_increase_units_btn')));
      await tester.pump();

      expect(find.text('3 giờ'), findsOneWidget);
      // 3 * 80,000 = 240,000
      expect(find.text('240.000đ'), findsWidgets);
    });

    testWidgets(
        'steps through all 4 wizard stages from Step 1 to Step 4 and completes',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const CustomerApp(
          enableAnimations: false,
        ),
      );
      await tester.pump();

      // Tap bottom sticky CTA button
      await tester.tap(find.byKey(const Key('customer_main_cta_btn')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Step 1: Khối lượng & Tính giá
      expect(find.text('Bước 1 / 4'), findsOneWidget);
      final primaryActionBtn =
          find.byKey(const Key('wizard_primary_action_btn'));

      // Move to Step 2
      await tester.tap(primaryActionBtn);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Step 2: Địa chỉ & Vị trí
      expect(find.text('Bước 2 / 4'), findsOneWidget);
      expect(find.text('Địa chỉ & Vị trí'), findsOneWidget);
      expect(find.text('Ghim tọa độ hiện trường (GPS):'), findsOneWidget);
      expect(find.byKey(const Key('wizard_back_btn')), findsOneWidget);

      // Move to Step 3
      await tester.tap(primaryActionBtn);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Step 3: Lịch & Phương thức
      expect(find.text('Bước 3 / 4'), findsOneWidget);
      expect(find.text('Lịch & Phương thức'), findsOneWidget);
      expect(find.text('Tiền mặt khi xong việc (COD)'), findsOneWidget);
      expect(find.text('Ví điện tử LinkkPay'), findsOneWidget);

      // Test back button: Step 3 -> Step 2
      await tester.tap(find.byKey(const Key('wizard_back_btn')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('Bước 2 / 4'), findsOneWidget);

      // Step 2 -> Step 3
      await tester.tap(primaryActionBtn);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('Bước 3 / 4'), findsOneWidget);

      // Submit from Step 3 -> Step 4
      await tester.tap(primaryActionBtn);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Step 4: Thành công & Điều phối Radar
      expect(find.text('Bước 4 / 4'), findsOneWidget);
      expect(find.text('ĐẶT ĐƠN THÀNH CÔNG!'), findsOneWidget);
      expect(find.text('ĐANG PHÁT RADAR TÌM THỢ GẦN BẠN'), findsOneWidget);
      expect(find.text('HOÀN TẤT & THEO DÕI ĐƠN'), findsOneWidget);

      // Complete and close sheet
      await tester.tap(primaryActionBtn);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Sheet is dismissed, back to home screen
      expect(find.text('Bước 4 / 4'), findsNothing);
      expect(find.text('LinkkWork Khách Hàng'), findsOneWidget);
    });

    testWidgets('location banner tap opens address edit dialog',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const CustomerApp(
          enableAnimations: false,
        ),
      );
      await tester.pump();

      await tester.tap(find.byKey(const Key('location_picker_banner')));
      await tester.pump();

      expect(find.text('Chọn địa chỉ nhận việc'), findsOneWidget);
      expect(find.text('Xác nhận'), findsOneWidget);

      await tester.tap(find.text('Hủy'));
      await tester.pump();

      expect(find.text('Chọn địa chỉ nhận việc'), findsNothing);
    });
  });
}
