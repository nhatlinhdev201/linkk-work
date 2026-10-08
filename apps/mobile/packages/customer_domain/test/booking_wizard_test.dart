import 'package:bloc_test/bloc_test.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:linkkwork_core/models/enums.dart';
import 'package:linkkwork_core/network/api_endpoints.dart';
import 'package:linkkwork_core/network/dio_client.dart';
import 'package:linkkwork_customer_domain/booking/booking_wizard_bloc.dart';
import 'package:linkkwork_customer_domain/booking/booking_wizard_event.dart';
import 'package:linkkwork_customer_domain/booking/booking_wizard_state.dart';
import 'package:mocktail/mocktail.dart';

class MockDioClient extends Mock implements DioClient {}

class MockDio extends Mock implements Dio {}

void main() {
  late MockDioClient mockDioClient;
  late MockDio mockDio;

  final fixedSchedule = DateTime(2026, 10, 15, 14, 30);

  setUp(() {
    mockDioClient = MockDioClient();
    mockDio = MockDio();
    when(() => mockDioClient.dio).thenReturn(mockDio);
  });

  group('BookingWizardBloc', () {
    test('initial state defaults to step 1 and default values', () {
      final bloc = BookingWizardBloc(dioClient: mockDioClient);
      expect(bloc.state.step, equals(1));
      expect(bloc.state.paymentMethod, equals(PaymentMethod.cash));
      expect(bloc.state.units, equals(1.0));
      expect(bloc.state.isSubmitting, isFalse);
      expect(bloc.state.isCalculatingPrice, isFalse);
      expect(bloc.state.error, isNull);
      bloc.close();
    });

    blocTest<BookingWizardBloc, BookingWizardState>(
      'SelectServiceEvent sets service info, estimated total, and step 1',
      build: () => BookingWizardBloc(dioClient: mockDioClient),
      act: (bloc) => bloc.add(const SelectServiceEvent(
        serviceId: 'srv-clean-hourly',
        serviceName: 'Dọn dẹp nhà theo giờ',
        basePrice: 160000.0,
      )),
      expect: () => [
        const BookingWizardState(
          step: 1,
          serviceId: 'srv-clean-hourly',
          serviceName: 'Dọn dẹp nhà theo giờ',
          estimatedTotal: 160000.0,
        ),
      ],
    );

    blocTest<BookingWizardBloc, BookingWizardState>(
      'CalculateDynamicPriceEvent calls /catalog/calculate-price and updates estimatedTotal',
      build: () {
        when(
          () => mockDio.post<dynamic>(
            ApiEndpoints.calculatePrice,
            data: any(named: 'data'),
          ),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: ApiEndpoints.calculatePrice),
            statusCode: 200,
            data: <String, dynamic>{
              'finalPrice': 320000.0,
              'subtotal': 300000.0,
            },
          ),
        );
        return BookingWizardBloc(dioClient: mockDioClient);
      },
      seed: () => const BookingWizardState(
        step: 1,
        serviceId: 'srv-clean-hourly',
        serviceName: 'Dọn dẹp nhà theo giờ',
        estimatedTotal: 160000.0,
      ),
      act: (bloc) => bloc.add(const CalculateDynamicPriceEvent(
        serviceId: 'srv-clean-hourly',
        units: 2.0,
        addonIds: ['addon-vacuum'],
      )),
      expect: () => [
        const BookingWizardState(
          step: 1,
          serviceId: 'srv-clean-hourly',
          serviceName: 'Dọn dẹp nhà theo giờ',
          estimatedTotal: 160000.0,
          isCalculatingPrice: true,
        ),
        const BookingWizardState(
          step: 1,
          serviceId: 'srv-clean-hourly',
          serviceName: 'Dọn dẹp nhà theo giờ',
          units: 2.0,
          addonIds: ['addon-vacuum'],
          estimatedTotal: 320000.0,
          isCalculatingPrice: false,
        ),
      ],
      verify: (_) {
        verify(
          () => mockDio.post<dynamic>(
            ApiEndpoints.calculatePrice,
            data: <String, dynamic>{
              'serviceId': 'srv-clean-hourly',
              'durationHours': 2.0,
              'addonIds': ['addon-vacuum'],
            },
          ),
        ).called(1);
      },
    );

    blocTest<BookingWizardBloc, BookingWizardState>(
      'CalculateDynamicPriceEvent handles error by emitting error message',
      build: () {
        when(
          () => mockDio.post<dynamic>(
            ApiEndpoints.calculatePrice,
            data: any(named: 'data'),
          ),
        ).thenThrow(
          DioException(
            requestOptions: RequestOptions(path: ApiEndpoints.calculatePrice),
          ),
        );
        return BookingWizardBloc(dioClient: mockDioClient);
      },
      act: (bloc) => bloc.add(const CalculateDynamicPriceEvent(
        serviceId: 'srv-clean-hourly',
        units: 2.0,
      )),
      expect: () => [
        const BookingWizardState(
          isCalculatingPrice: true,
        ),
        const BookingWizardState(
          isCalculatingPrice: false,
          error: 'Không thể tính giá dịch vụ',
        ),
      ],
    );

    blocTest<BookingWizardBloc, BookingWizardState>(
      'SetBookingAddressEvent sets address, coordinates, and advances to step 3',
      build: () => BookingWizardBloc(dioClient: mockDioClient),
      seed: () => const BookingWizardState(
        step: 2,
        serviceId: 'srv-clean-hourly',
      ),
      act: (bloc) => bloc.add(const SetBookingAddressEvent(
        address: '72 Lê Thánh Tôn, Bến Nghé, Quận 1',
        lat: 10.7781,
        lng: 106.7023,
      )),
      expect: () => [
        const BookingWizardState(
          step: 3,
          serviceId: 'srv-clean-hourly',
          address: '72 Lê Thánh Tôn, Bến Nghé, Quận 1',
          lat: 10.7781,
          lng: 106.7023,
        ),
      ],
    );

    blocTest<BookingWizardBloc, BookingWizardState>(
      'SetBookingScheduleAndPaymentEvent updates scheduled time, payment method and notes',
      build: () => BookingWizardBloc(dioClient: mockDioClient),
      seed: () => const BookingWizardState(
        step: 3,
        serviceId: 'srv-clean-hourly',
        address: '72 Lê Thánh Tôn, Bến Nghé, Quận 1',
      ),
      act: (bloc) => bloc.add(SetBookingScheduleAndPaymentEvent(
        scheduledAt: fixedSchedule,
        paymentMethod: PaymentMethod.cash,
        notes: 'Mang theo nước lau kính chuyên dụng',
      )),
      expect: () => [
        BookingWizardState(
          step: 3,
          serviceId: 'srv-clean-hourly',
          address: '72 Lê Thánh Tôn, Bến Nghé, Quận 1',
          scheduledAt: fixedSchedule,
          paymentMethod: PaymentMethod.cash,
          notes: 'Mang theo nước lau kính chuyên dụng',
        ),
      ],
    );

    blocTest<BookingWizardBloc, BookingWizardState>(
      'SubmitBookingEvent submits booking successfully and advances to step 4',
      build: () {
        when(
          () => mockDio.post<dynamic>(
            ApiEndpoints.bookings,
            data: any(named: 'data'),
          ),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: ApiEndpoints.bookings),
            statusCode: 201,
            data: <String, dynamic>{
              'id': 'bk-customer-999',
              'status': 'PENDING_DISPATCH',
              'code': 'BK-2026-112233',
            },
          ),
        );
        return BookingWizardBloc(dioClient: mockDioClient);
      },
      seed: () => BookingWizardState(
        step: 3,
        serviceId: 'srv-clean-hourly',
        serviceName: 'Dọn dẹp nhà theo giờ',
        address: '72 Lê Thánh Tôn, Bến Nghé, Quận 1',
        lat: 10.7781,
        lng: 106.7023,
        scheduledAt: fixedSchedule,
        paymentMethod: PaymentMethod.cash,
        notes: 'Căn hộ tầng 12',
      ),
      act: (bloc) => bloc.add(const SubmitBookingEvent(
        customerName: 'Trần Thị Mai',
        customerPhone: '0912345678',
      )),
      expect: () => [
        BookingWizardState(
          step: 3,
          serviceId: 'srv-clean-hourly',
          serviceName: 'Dọn dẹp nhà theo giờ',
          address: '72 Lê Thánh Tôn, Bến Nghé, Quận 1',
          lat: 10.7781,
          lng: 106.7023,
          scheduledAt: fixedSchedule,
          paymentMethod: PaymentMethod.cash,
          notes: 'Căn hộ tầng 12',
          isSubmitting: true,
        ),
        BookingWizardState(
          step: 4,
          serviceId: 'srv-clean-hourly',
          serviceName: 'Dọn dẹp nhà theo giờ',
          address: '72 Lê Thánh Tôn, Bến Nghé, Quận 1',
          lat: 10.7781,
          lng: 106.7023,
          scheduledAt: fixedSchedule,
          paymentMethod: PaymentMethod.cash,
          notes: 'Căn hộ tầng 12',
          isSubmitting: false,
          createdBookingId: 'bk-customer-999',
          createdBooking: const <String, dynamic>{
            'id': 'bk-customer-999',
            'status': 'PENDING_DISPATCH',
            'code': 'BK-2026-112233',
          },
        ),
      ],
      verify: (_) {
        verify(
          () => mockDio.post<dynamic>(
            ApiEndpoints.bookings,
            data: <String, dynamic>{
              'serviceId': 'srv-clean-hourly',
              'customerName': 'Trần Thị Mai',
              'customerPhone': '0912345678',
              'address': '72 Lê Thánh Tôn, Bến Nghé, Quận 1',
              'paymentMethod': 'CASH',
              'scheduledAt': fixedSchedule.toIso8601String(),
              'notes': 'Căn hộ tầng 12',
              'latitude': 10.7781,
              'longitude': 106.7023,
            },
          ),
        ).called(1);
      },
    );

    blocTest<BookingWizardBloc, BookingWizardState>(
      'SubmitBookingEvent handles DioException with Vietnamese error message',
      build: () {
        when(
          () => mockDio.post<dynamic>(
            ApiEndpoints.bookings,
            data: any(named: 'data'),
          ),
        ).thenThrow(
          DioException(
            requestOptions: RequestOptions(path: ApiEndpoints.bookings),
            response: Response<dynamic>(
              requestOptions: RequestOptions(path: ApiEndpoints.bookings),
              statusCode: 400,
              data: <String, dynamic>{
                'message': 'Số điện thoại không hợp lệ',
              },
            ),
          ),
        );
        return BookingWizardBloc(dioClient: mockDioClient);
      },
      seed: () => const BookingWizardState(
        step: 3,
        serviceId: 'srv-clean-hourly',
        address: '72 Lê Thánh Tôn',
      ),
      act: (bloc) => bloc.add(const SubmitBookingEvent(
        customerName: 'Trần Thị Mai',
        customerPhone: 'invalid-phone',
      )),
      expect: () => [
        const BookingWizardState(
          step: 3,
          serviceId: 'srv-clean-hourly',
          address: '72 Lê Thánh Tôn',
          isSubmitting: true,
        ),
        const BookingWizardState(
          step: 3,
          serviceId: 'srv-clean-hourly',
          address: '72 Lê Thánh Tôn',
          isSubmitting: false,
          error: 'Số điện thoại không hợp lệ',
        ),
      ],
    );

    blocTest<BookingWizardBloc, BookingWizardState>(
      'SubmitBookingEvent ignores double submission when isSubmitting is true',
      build: () => BookingWizardBloc(dioClient: mockDioClient),
      seed: () => const BookingWizardState(
        step: 3,
        serviceId: 'srv-clean-hourly',
        isSubmitting: true,
      ),
      act: (bloc) => bloc.add(const SubmitBookingEvent(
        customerName: 'Trần Thị Mai',
        customerPhone: '0912345678',
      )),
      expect: () => <BookingWizardState>[],
      verify: (_) {
        verifyNever(
          () => mockDio.post<dynamic>(any(), data: any(named: 'data')),
        );
      },
    );

    blocTest<BookingWizardBloc, BookingWizardState>(
      'SubmitBookingEvent ignores submission when already completed at step 4',
      build: () => BookingWizardBloc(dioClient: mockDioClient),
      seed: () => const BookingWizardState(
        step: 4,
        createdBookingId: 'bk-already-done',
      ),
      act: (bloc) => bloc.add(const SubmitBookingEvent(
        customerName: 'Trần Thị Mai',
        customerPhone: '0912345678',
      )),
      expect: () => <BookingWizardState>[],
      verify: (_) {
        verifyNever(
          () => mockDio.post<dynamic>(any(), data: any(named: 'data')),
        );
      },
    );

    blocTest<BookingWizardBloc, BookingWizardState>(
      'ResetBookingWizardEvent resets state back to default initial state',
      build: () => BookingWizardBloc(dioClient: mockDioClient),
      seed: () => const BookingWizardState(
        step: 4,
        serviceId: 'srv-clean-hourly',
        createdBookingId: 'bk-123',
      ),
      act: (bloc) => bloc.add(const ResetBookingWizardEvent()),
      expect: () => [
        const BookingWizardState(),
      ],
    );
  });
}
