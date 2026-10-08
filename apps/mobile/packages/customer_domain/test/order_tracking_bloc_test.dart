import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:linkkwork_core/models/enums.dart';
import 'package:linkkwork_core/socket/socket_client_service.dart';
import 'package:linkkwork_customer_domain/tracking/order_tracking_bloc.dart';
import 'package:linkkwork_customer_domain/tracking/order_tracking_event.dart';
import 'package:linkkwork_customer_domain/tracking/order_tracking_state.dart';
import 'package:mocktail/mocktail.dart';

class MockSocketClientService extends Mock implements SocketClientService {}

void main() {
  late MockSocketClientService mockSocket;
  late StreamController<Map<String, dynamic>> statusController;
  late StreamController<Map<String, dynamic>> locationController;

  const testBookingId = 'bk-track-001';

  setUp(() {
    mockSocket = MockSocketClientService();
    statusController = StreamController<Map<String, dynamic>>.broadcast();
    locationController = StreamController<Map<String, dynamic>>.broadcast();

    when(() => mockSocket.statusChangeStream)
        .thenAnswer((_) => statusController.stream);
    when(() => mockSocket.locationStream)
        .thenAnswer((_) => locationController.stream);
  });

  tearDown(() async {
    await statusController.close();
    await locationController.close();
  });

  group('OrderTrackingBloc', () {
    test('initial state contains initial status and bookingId', () {
      final bloc = OrderTrackingBloc(
        socketService: mockSocket,
        initialStatus: BookingStatus.assigned,
        bookingId: testBookingId,
      );

      expect(bloc.state.status, equals(BookingStatus.assigned));
      expect(bloc.state.bookingId, equals(testBookingId));
      expect(bloc.state.taskerLatitude, isNull);
      expect(bloc.state.taskerLongitude, isNull);

      bloc.close();
    });

    blocTest<OrderTrackingBloc, OrderTrackingState>(
      'StatusUpdatedEvent updates the tracking status',
      build: () => OrderTrackingBloc(
        socketService: mockSocket,
        initialStatus: BookingStatus.assigned,
        bookingId: testBookingId,
      ),
      act: (bloc) => bloc.add(const StatusUpdatedEvent(
        status: BookingStatus.arriving,
      )),
      expect: () => [
        const OrderTrackingState(
          status: BookingStatus.arriving,
          bookingId: testBookingId,
        ),
      ],
    );

    blocTest<OrderTrackingBloc, OrderTrackingState>(
      'TaskerLocationUpdatedEvent updates tasker latitude and longitude',
      build: () => OrderTrackingBloc(
        socketService: mockSocket,
        initialStatus: BookingStatus.arriving,
        bookingId: testBookingId,
      ),
      act: (bloc) => bloc.add(const TaskerLocationUpdatedEvent(
        latitude: 10.7769,
        longitude: 106.7009,
      )),
      expect: () => [
        const OrderTrackingState(
          status: BookingStatus.arriving,
          bookingId: testBookingId,
          taskerLatitude: 10.7769,
          taskerLongitude: 106.7009,
        ),
      ],
    );

    blocTest<OrderTrackingBloc, OrderTrackingState>(
      'listens to socket statusChangeStream and updates state when booking matches',
      build: () => OrderTrackingBloc(
        socketService: mockSocket,
        initialStatus: BookingStatus.assigned,
        bookingId: testBookingId,
      ),
      act: (_) {
        statusController.add(<String, dynamic>{
          'bookingId': testBookingId,
          'status': 'IN_PROGRESS',
        });
      },
      expect: () => [
        const OrderTrackingState(
          status: BookingStatus.inProgress,
          bookingId: testBookingId,
        ),
      ],
    );

    blocTest<OrderTrackingBloc, OrderTrackingState>(
      'ignores socket statusChangeStream event for a different bookingId',
      build: () => OrderTrackingBloc(
        socketService: mockSocket,
        initialStatus: BookingStatus.assigned,
        bookingId: testBookingId,
      ),
      act: (_) {
        statusController.add(<String, dynamic>{
          'bookingId': 'bk-other-999',
          'status': 'COMPLETED',
        });
      },
      expect: () => <OrderTrackingState>[],
    );

    blocTest<OrderTrackingBloc, OrderTrackingState>(
      'listens to socket locationStream and updates tasker coordinates when booking matches',
      build: () => OrderTrackingBloc(
        socketService: mockSocket,
        initialStatus: BookingStatus.arriving,
        bookingId: testBookingId,
      ),
      act: (_) {
        locationController.add(<String, dynamic>{
          'bookingId': testBookingId,
          'latitude': 10.7720,
          'longitude': 106.6980,
        });
      },
      expect: () => [
        const OrderTrackingState(
          status: BookingStatus.arriving,
          bookingId: testBookingId,
          taskerLatitude: 10.7720,
          taskerLongitude: 106.6980,
        ),
      ],
    );

    blocTest<OrderTrackingBloc, OrderTrackingState>(
      'ignores socket locationStream event for a different bookingId',
      build: () => OrderTrackingBloc(
        socketService: mockSocket,
        initialStatus: BookingStatus.arriving,
        bookingId: testBookingId,
      ),
      act: (_) {
        locationController.add(<String, dynamic>{
          'bookingId': 'bk-different-777',
          'latitude': 21.0285,
          'longitude': 105.8542,
        });
      },
      expect: () => <OrderTrackingState>[],
    );

    test('cleanly tears down stream subscriptions on close', () async {
      final bloc = OrderTrackingBloc(
        socketService: mockSocket,
        initialStatus: BookingStatus.assigned,
        bookingId: testBookingId,
      );

      await bloc.close();

      // Emit after close to verify no event added or exception thrown
      statusController.add(<String, dynamic>{
        'bookingId': testBookingId,
        'status': 'COMPLETED',
      });
      locationController.add(<String, dynamic>{
        'bookingId': testBookingId,
        'latitude': 10.0,
        'longitude': 106.0,
      });

      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(bloc.isClosed, isTrue);
    });
  });
}
