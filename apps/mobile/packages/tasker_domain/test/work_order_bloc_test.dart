import 'package:bloc_test/bloc_test.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:linkkwork_core/location/location_service.dart';
import 'package:linkkwork_core/models/enums.dart';
import 'package:linkkwork_core/network/dio_client.dart';
import 'package:linkkwork_tasker_domain/execution/work_order_bloc.dart';
import 'package:linkkwork_tasker_domain/execution/work_order_event.dart';
import 'package:linkkwork_tasker_domain/execution/work_order_state.dart';
import 'package:mocktail/mocktail.dart';

class MockDioClient extends Mock implements DioClient {}

class MockDio extends Mock implements Dio {}

class MockLocationService extends Mock implements LocationService {}

void main() {
  late MockDioClient mockDioClient;
  late MockDio mockDio;
  late MockLocationService mockLocationService;

  final genuinePosition = Position(
    latitude: 10.762622,
    longitude: 106.660172,
    timestamp: DateTime(2026, 10, 8, 12, 0),
    accuracy: 5.0,
    altitude: 10.0,
    altitudeAccuracy: 1.0,
    heading: 0.0,
    headingAccuracy: 1.0,
    speed: 0.0,
    speedAccuracy: 0.0,
    isMocked: false,
  );

  final mockGpsPosition = Position(
    latitude: 10.762622,
    longitude: 106.660172,
    timestamp: DateTime(2026, 10, 8, 12, 0),
    accuracy: 5.0,
    altitude: 10.0,
    altitudeAccuracy: 1.0,
    heading: 0.0,
    headingAccuracy: 1.0,
    speed: 0.0,
    speedAccuracy: 0.0,
    isMocked: true,
  );

  final sampleBooking = <String, dynamic>{
    'id': 'booking-456',
    'code': 'BK-456',
    'status': 'ASSIGNED',
    'totalAmount': 250000.0,
  };

  setUp(() {
    mockDioClient = MockDioClient();
    mockDio = MockDio();
    mockLocationService = MockLocationService();

    when(() => mockDioClient.dio).thenReturn(mockDio);
  });

  group('WorkOrderBloc Tests', () {
    test('initial state is WorkOrderInitialState', () {
      final bloc = WorkOrderBloc(
        dioClient: mockDioClient,
        locationService: mockLocationService,
      );
      expect(bloc.state, equals(const WorkOrderInitialState()));
      bloc.close();
    });

    blocTest<WorkOrderBloc, WorkOrderState>(
      'LoadWorkOrderEvent loads booking and emits WorkOrderActiveState',
      build: () {
        when(
          () => mockDio.get<dynamic>('/bookings/booking-456'),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: '/bookings/booking-456'),
            statusCode: 200,
            data: sampleBooking,
          ),
        );
        return WorkOrderBloc(
          dioClient: mockDioClient,
          locationService: mockLocationService,
        );
      },
      act: (bloc) =>
          bloc.add(const LoadWorkOrderEvent(bookingId: 'booking-456')),
      expect: () => [
        const WorkOrderLoadingState(),
        WorkOrderActiveState(
          bookingId: 'booking-456',
          status: BookingStatus.assigned,
          booking: sampleBooking,
        ),
      ],
      verify: (_) {
        verify(() => mockDio.get<dynamic>('/bookings/booking-456')).called(1);
      },
    );

    blocTest<WorkOrderBloc, WorkOrderState>(
      'StartTravelingEvent transitions to arriving',
      build: () {
        when(
          () => mockDio.patch<dynamic>(
            '/bookings/booking-456/status',
            data: <String, dynamic>{
              'status': BookingStatus.arriving.value,
            },
          ),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions:
                RequestOptions(path: '/bookings/booking-456/status'),
            statusCode: 200,
            data: <String, dynamic>{
              'id': 'booking-456',
              'status': BookingStatus.arriving.value,
            },
          ),
        );
        return WorkOrderBloc(
          dioClient: mockDioClient,
          locationService: mockLocationService,
        );
      },
      seed: () => WorkOrderActiveState(
        bookingId: 'booking-456',
        status: BookingStatus.assigned,
        booking: sampleBooking,
      ),
      act: (bloc) =>
          bloc.add(const StartTravelingEvent(bookingId: 'booking-456')),
      expect: () => [
        WorkOrderActiveState(
          bookingId: 'booking-456',
          status: BookingStatus.arriving,
          booking: <String, dynamic>{
            'id': 'booking-456',
            'code': 'BK-456',
            'status': 'ARRIVING',
            'totalAmount': 250000.0,
          },
        ),
      ],
      verify: (_) {
        verify(
          () => mockDio.patch<dynamic>(
            '/bookings/booking-456/status',
            data: <String, dynamic>{
              'status': BookingStatus.arriving.value,
            },
          ),
        ).called(1);
      },
    );

    blocTest<WorkOrderBloc, WorkOrderState>(
      'CheckInArrivalEvent detects Mock GPS and emits WorkOrderErrorState',
      build: () {
        when(() => mockLocationService.getCurrentPosition())
            .thenAnswer((_) async => mockGpsPosition);
        when(() => mockLocationService.isMockLocation(mockGpsPosition))
            .thenReturn(true);
        return WorkOrderBloc(
          dioClient: mockDioClient,
          locationService: mockLocationService,
        );
      },
      seed: () => const WorkOrderActiveState(
        bookingId: 'booking-456',
        status: BookingStatus.arriving,
        booking: <String, dynamic>{
          'id': 'booking-456',
          'status': 'ARRIVING',
        },
      ),
      act: (bloc) => bloc.add(const CheckInArrivalEvent(
        bookingId: 'booking-456',
        checkInPhotoUrl: 'https://cdn.example.com/arrival.jpg',
      )),
      expect: () => [
        const WorkOrderErrorState(
          error:
              'Phát hiện vị trí giả lập (Mock GPS). Vui lòng tắt ứng dụng giả lập GPS để tiếp tục!',
        ),
      ],
      verify: (_) {
        verify(() => mockLocationService.getCurrentPosition()).called(1);
        verify(() => mockLocationService.isMockLocation(mockGpsPosition))
            .called(1);
        verifyNever(
          () => mockDio.patch<dynamic>(
            any(),
            data: any(named: 'data'),
          ),
        );
      },
    );

    blocTest<WorkOrderBloc, WorkOrderState>(
      'CheckInArrivalEvent with authentic GPS transitions to inProgress',
      build: () {
        when(() => mockLocationService.getCurrentPosition())
            .thenAnswer((_) async => genuinePosition);
        when(() => mockLocationService.isMockLocation(genuinePosition))
            .thenReturn(false);
        when(
          () => mockDio.patch<dynamic>(
            '/bookings/booking-456/status',
            data: <String, dynamic>{
              'status': BookingStatus.inProgress.value,
              'note': 'Check-in: https://cdn.example.com/arrival.jpg',
              'latitude': 10.762622,
              'longitude': 106.660172,
            },
          ),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions:
                RequestOptions(path: '/bookings/booking-456/status'),
            statusCode: 200,
            data: <String, dynamic>{
              'id': 'booking-456',
              'status': BookingStatus.inProgress.value,
            },
          ),
        );
        return WorkOrderBloc(
          dioClient: mockDioClient,
          locationService: mockLocationService,
        );
      },
      seed: () => const WorkOrderActiveState(
        bookingId: 'booking-456',
        status: BookingStatus.arriving,
        booking: <String, dynamic>{
          'id': 'booking-456',
          'status': 'ARRIVING',
        },
      ),
      act: (bloc) => bloc.add(const CheckInArrivalEvent(
        bookingId: 'booking-456',
        checkInPhotoUrl: 'https://cdn.example.com/arrival.jpg',
      )),
      expect: () => [
        const WorkOrderActiveState(
          bookingId: 'booking-456',
          status: BookingStatus.inProgress,
          booking: <String, dynamic>{
            'id': 'booking-456',
            'status': 'IN_PROGRESS',
          },
        ),
      ],
      verify: (_) {
        verify(() => mockLocationService.getCurrentPosition()).called(1);
        verify(() => mockLocationService.isMockLocation(genuinePosition))
            .called(1);
        verify(
          () => mockDio.patch<dynamic>(
            '/bookings/booking-456/status',
            data: <String, dynamic>{
              'status': BookingStatus.inProgress.value,
              'note': 'Check-in: https://cdn.example.com/arrival.jpg',
              'latitude': 10.762622,
              'longitude': 106.660172,
            },
          ),
        ).called(1);
      },
    );

    blocTest<WorkOrderBloc, WorkOrderState>(
      'SubmitCompletionProofEvent transitions to pendingAcceptance',
      build: () {
        when(
          () => mockDio.patch<dynamic>(
            '/bookings/booking-456/status',
            data: <String, dynamic>{
              'status': BookingStatus.pendingAcceptance.value,
              'proofPhotos': <String>[
                'https://cdn.example.com/done1.jpg',
                'https://cdn.example.com/done2.jpg',
              ],
            },
          ),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions:
                RequestOptions(path: '/bookings/booking-456/status'),
            statusCode: 200,
            data: <String, dynamic>{
              'id': 'booking-456',
              'status': BookingStatus.pendingAcceptance.value,
            },
          ),
        );
        return WorkOrderBloc(
          dioClient: mockDioClient,
          locationService: mockLocationService,
        );
      },
      seed: () => const WorkOrderActiveState(
        bookingId: 'booking-456',
        status: BookingStatus.inProgress,
        booking: <String, dynamic>{
          'id': 'booking-456',
          'status': 'IN_PROGRESS',
        },
      ),
      act: (bloc) => bloc.add(const SubmitCompletionProofEvent(
        bookingId: 'booking-456',
        proofPhotos: [
          'https://cdn.example.com/done1.jpg',
          'https://cdn.example.com/done2.jpg',
        ],
      )),
      expect: () => [
        const WorkOrderActiveState(
          bookingId: 'booking-456',
          status: BookingStatus.pendingAcceptance,
          booking: <String, dynamic>{
            'id': 'booking-456',
            'status': 'PENDING_ACCEPTANCE',
          },
        ),
      ],
      verify: (_) {
        verify(
          () => mockDio.patch<dynamic>(
            '/bookings/booking-456/status',
            data: <String, dynamic>{
              'status': BookingStatus.pendingAcceptance.value,
              'proofPhotos': <String>[
                'https://cdn.example.com/done1.jpg',
                'https://cdn.example.com/done2.jpg',
              ],
            },
          ),
        ).called(1);
      },
    );

    blocTest<WorkOrderBloc, WorkOrderState>(
      'ConfirmCashPaymentEvent calls cash record and emits WorkOrderCompletedState',
      build: () {
        when(
          () => mockDio.post<dynamic>(
            '/bookings/booking-456/record-cash-payment',
            data: <String, dynamic>{
              'amount': 250000.0,
              'deductCommission': true,
            },
          ),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(
              path: '/bookings/booking-456/record-cash-payment',
            ),
            statusCode: 201,
            data: <String, dynamic>{
              'id': 'booking-456',
              'status': 'COMPLETED',
            },
          ),
        );
        return WorkOrderBloc(
          dioClient: mockDioClient,
          locationService: mockLocationService,
        );
      },
      act: (bloc) => bloc.add(const ConfirmCashPaymentEvent(
        bookingId: 'booking-456',
        amount: 250000.0,
      )),
      expect: () => [
        const WorkOrderCompletedState(
          bookingId: 'booking-456',
          amountCollected: 250000.0,
        ),
      ],
      verify: (_) {
        verify(
          () => mockDio.post<dynamic>(
            '/bookings/booking-456/record-cash-payment',
            data: <String, dynamic>{
              'amount': 250000.0,
              'deductCommission': true,
            },
          ),
        ).called(1);
      },
    );

    blocTest<WorkOrderBloc, WorkOrderState>(
      'LoadWorkOrderEvent handles DioException and emits WorkOrderErrorState',
      build: () {
        when(
          () => mockDio.get<dynamic>('/bookings/bk-err'),
        ).thenThrow(
          DioException(
            requestOptions: RequestOptions(path: '/bookings/bk-err'),
            response: Response<dynamic>(
              requestOptions: RequestOptions(path: '/bookings/bk-err'),
              statusCode: 404,
              data: <String, dynamic>{'message': 'Đơn hàng không tồn tại'},
            ),
          ),
        );
        return WorkOrderBloc(
          dioClient: mockDioClient,
          locationService: mockLocationService,
        );
      },
      act: (bloc) => bloc.add(const LoadWorkOrderEvent(bookingId: 'bk-err')),
      expect: () => [
        const WorkOrderLoadingState(),
        const WorkOrderErrorState(error: 'Đơn hàng không tồn tại'),
      ],
    );

    blocTest<WorkOrderBloc, WorkOrderState>(
      'CheckInArrivalEvent handles location service hardware exception cleanly',
      build: () {
        when(() => mockLocationService.getCurrentPosition())
            .thenThrow(Exception('Dịch vụ định vị GPS bị tắt'));
        return WorkOrderBloc(
          dioClient: mockDioClient,
          locationService: mockLocationService,
        );
      },
      act: (bloc) => bloc.add(const CheckInArrivalEvent(
        bookingId: 'booking-456',
        checkInPhotoUrl: 'https://cdn.example.com/arrival.jpg',
      )),
      expect: () => [
        const WorkOrderErrorState(
            error: 'Exception: Dịch vụ định vị GPS bị tắt'),
      ],
    );

    blocTest<WorkOrderBloc, WorkOrderState>(
      'ConfirmCashPaymentEvent handles DioException cleanly',
      build: () {
        when(
          () => mockDio.post<dynamic>(
            '/bookings/booking-456/record-cash-payment',
            data: any(named: 'data'),
          ),
        ).thenThrow(
          DioException(
            requestOptions: RequestOptions(
              path: '/bookings/booking-456/record-cash-payment',
            ),
            response: Response<dynamic>(
              requestOptions: RequestOptions(
                path: '/bookings/booking-456/record-cash-payment',
              ),
              statusCode: 400,
              data: <String, dynamic>{
                'message': 'Số dư ký quỹ không đủ trích hoa hồng'
              },
            ),
          ),
        );
        return WorkOrderBloc(
          dioClient: mockDioClient,
          locationService: mockLocationService,
        );
      },
      act: (bloc) => bloc.add(const ConfirmCashPaymentEvent(
        bookingId: 'booking-456',
        amount: 250000.0,
      )),
      expect: () => [
        const WorkOrderErrorState(
          error: 'Số dư ký quỹ không đủ trích hoa hồng',
        ),
      ],
    );
  });
}
