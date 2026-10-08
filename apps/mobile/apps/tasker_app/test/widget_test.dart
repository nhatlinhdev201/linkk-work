import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:linkkwork_tasker_app/main.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('TaskerApp Widget & Integration Flow Tests', () {
    testWidgets(
        'pumps TaskerApp and renders top bar, online status, radar scanner, and incoming job card',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        const TaskerApp(
          enableAnimations: false,
          initialOnline: true,
          initialIncomingJob: true,
        ),
      );
      await tester.pump();

      // Verify App Bar Title
      expect(find.text('LinkkWork Thợ Đối Tác'), findsOneWidget);

      // Verify Tasker Info & Status Badge
      expect(find.text('Nguyễn Văn An'), findsOneWidget);
      expect(find.byKey(const Key('tasker_status_badge')), findsOneWidget);
      expect(find.text('ONLINE'), findsOneWidget);
      expect(find.byKey(const Key('tasker_availability_switch')), findsOneWidget);

      // Verify Center Radar Screen
      expect(find.byKey(const Key('tasker_radar_container')), findsOneWidget);
      expect(find.text('Đang quét việc trong bán kính 10km...'), findsOneWidget);

      // Verify Incoming Job Alert Card with 30s countdown and claim CTA
      expect(find.byKey(const Key('tasker_incoming_job_card')), findsOneWidget);
      expect(find.text('ĐƠN VIỆC MỚI BẮN RADAR'), findsOneWidget);
      expect(find.text('30 s'), findsOneWidget);
      expect(find.text('Vệ sinh 2 bộ máy lạnh treo tường Inverter'), findsOneWidget);
      expect(find.byKey(const Key('tasker_claim_job_btn')), findsOneWidget);
      expect(find.text('NHẬN VIỆC NGAY - ATOMIC CAS'), findsOneWidget);
    });

    testWidgets('toggles availability switch between ONLINE and OFFLINE',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        const TaskerApp(
          enableAnimations: false,
          initialOnline: true,
          initialIncomingJob: false,
        ),
      );
      await tester.pump();

      // Initially ONLINE
      expect(find.text('ONLINE'), findsOneWidget);
      expect(find.text('Đang quét việc trong bán kính 10km...'), findsOneWidget);

      // Toggle switch to OFFLINE
      await tester.tap(find.byKey(const Key('tasker_availability_switch')));
      await tester.pump();

      expect(find.text('OFFLINE'), findsOneWidget);
      expect(find.text('Đang Offline - Không quét việc'), findsOneWidget);

      // Toggle switch back to ONLINE
      await tester.tap(find.byKey(const Key('tasker_availability_switch')));
      await tester.pump();

      expect(find.text('ONLINE'), findsOneWidget);
      expect(find.text('Đang quét việc trong bán kính 10km...'), findsOneWidget);
    });

    testWidgets(
        'claims job and transitions through 4-step work order execution workflow',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        const TaskerApp(
          enableAnimations: false,
          initialOnline: true,
          initialIncomingJob: true,
        ),
      );
      await tester.pump();

      // Incoming job is visible
      expect(find.byKey(const Key('tasker_claim_job_btn')), findsOneWidget);

      // Tap claim job button
      await tester.tap(find.byKey(const Key('tasker_claim_job_btn')));
      await tester.pump();

      // Incoming alert card dismissed, Work order progress track is shown at Step 1: Xuất phát
      expect(find.byKey(const Key('tasker_incoming_job_card')), findsNothing);
      expect(find.byKey(const Key('tasker_work_order_track')), findsOneWidget);
      expect(find.text('Bước 1 / 4'), findsOneWidget);
      expect(find.text('Bước 1: Xuất phát tới địa điểm'), findsOneWidget);

      // Step 1 -> Step 2: Check-in hiện trường
      final advanceBtn = find.byKey(const Key('tasker_advance_step_btn'));
      await tester.tap(advanceBtn);
      await tester.pump();

      expect(find.text('Bước 2 / 4'), findsOneWidget);
      expect(find.text('Bước 2: Check-in hiện trường & Phòng chống gian lận'), findsOneWidget);
      expect(find.textContaining('Mock GPS'), findsOneWidget);

      // Step 2 -> Step 3: Nghiệm thu
      await tester.tap(advanceBtn);
      await tester.pump();

      expect(find.text('Bước 3 / 4'), findsOneWidget);
      expect(find.text('Bước 3: Nghiệm thu công việc'), findsOneWidget);

      // Step 3 -> Step 4: Thu COD & Sổ cái kép
      await tester.tap(advanceBtn);
      await tester.pump();

      expect(find.text('Bước 4 / 4'), findsOneWidget);
      expect(find.text('Bước 4: Thu tiền mặt COD & Sổ cái kế toán kép'), findsOneWidget);
      expect(find.textContaining('Bút toán 1: +300.000đ'), findsOneWidget);
      expect(find.textContaining('Bút toán 2: -45.000đ'), findsOneWidget);

      // Complete Step 4 and return to radar
      await tester.tap(advanceBtn);
      await tester.pump();

      // Work order track closed, back to radar
      expect(find.byKey(const Key('tasker_work_order_track')), findsNothing);
      expect(find.text('Đang quét việc trong bán kính 10km...'), findsOneWidget);
    });
  });
}
