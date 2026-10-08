import 'package:bloc_test/bloc_test.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:linkkwork_core/network/dio_client.dart';
import 'package:linkkwork_tasker_domain/status/tasker_status_bloc.dart';
import 'package:linkkwork_tasker_domain/status/tasker_status_event.dart';
import 'package:linkkwork_tasker_domain/status/tasker_status_state.dart';
import 'package:mocktail/mocktail.dart';

class MockDioClient extends Mock implements DioClient {}

class MockDio extends Mock implements Dio {}

void main() {
  late MockDioClient mockDioClient;
  late MockDio mockDio;

  setUp(() {
    mockDioClient = MockDioClient();
    mockDio = MockDio();

    when(() => mockDioClient.dio).thenReturn(mockDio);
  });

  group('TaskerStatusBloc', () {
    test('initial state is TaskerStatusInitial', () {
      final bloc = TaskerStatusBloc(dioClient: mockDioClient);
      expect(bloc.state, equals(const TaskerStatusInitial()));
      bloc.close();
    });

    blocTest<TaskerStatusBloc, TaskerStatusState>(
      'CheckTaskerStatusEvent loads deposit balance and offline state',
      build: () {
        when(() => mockDio.get<dynamic>('/finance/summary')).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: '/finance/summary'),
            statusCode: 200,
            data: <String, dynamic>{
              'totalDepositHeld': 650000.0,
              'depositBalance': 650000.0,
            },
          ),
        );
        return TaskerStatusBloc(dioClient: mockDioClient);
      },
      act: (bloc) => bloc.add(const CheckTaskerStatusEvent()),
      expect: () => [
        const TaskerStatusLoading(),
        const TaskerStatusLoaded(
          isOnline: false,
          depositBalance: 650000.0,
          minDeposit: 500000.0,
        ),
      ],
      verify: (_) {
        verify(() => mockDio.get<dynamic>('/finance/summary')).called(1);
      },
    );

    blocTest<TaskerStatusBloc, TaskerStatusState>(
      'CheckTaskerStatusEvent handles DioException and emits TaskerStatusError',
      build: () {
        when(() => mockDio.get<dynamic>('/finance/summary')).thenThrow(
          DioException(
            requestOptions: RequestOptions(path: '/finance/summary'),
            response: Response<dynamic>(
              requestOptions: RequestOptions(path: '/finance/summary'),
              statusCode: 500,
              data: <String, dynamic>{
                'message': 'Không thể kết nối máy chủ tài chính',
              },
            ),
          ),
        );
        return TaskerStatusBloc(dioClient: mockDioClient);
      },
      act: (bloc) => bloc.add(const CheckTaskerStatusEvent()),
      expect: () => [
        const TaskerStatusLoading(),
        const TaskerStatusError(
          message: 'Không thể kết nối máy chủ tài chính',
        ),
      ],
    );

    blocTest<TaskerStatusBloc, TaskerStatusState>(
      'toggle online fails with isInsufficientDeposit when balance < 500,000',
      build: () => TaskerStatusBloc(dioClient: mockDioClient),
      seed: () => const TaskerStatusLoaded(
        isOnline: false,
        depositBalance: 300000.0,
        minDeposit: 500000.0,
      ),
      act: (bloc) => bloc.add(const ToggleTaskerStatusEvent(goOnline: true)),
      expect: () => [
        const TaskerStatusError(
          message:
              'Số dư ví ký quỹ không đủ điều kiện nhận việc (tối thiểu 500.000đ). Vui lòng nạp thêm cọc.',
          isInsufficientDeposit: true,
          currentDeposit: 300000.0,
        ),
      ],
      verify: (_) {
        verifyNever(
          () => mockDio.patch<dynamic>(
            any(),
            data: any(named: 'data'),
          ),
        );
      },
    );

    blocTest<TaskerStatusBloc, TaskerStatusState>(
      'toggle online succeeds when balance >= 500,000',
      build: () {
        when(
          () => mockDio.patch<dynamic>(
            '/taskers/me/status',
            data: <String, dynamic>{'isOnline': true},
          ),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: '/taskers/me/status'),
            statusCode: 200,
            data: <String, dynamic>{'success': true},
          ),
        );
        return TaskerStatusBloc(dioClient: mockDioClient);
      },
      seed: () => const TaskerStatusLoaded(
        isOnline: false,
        depositBalance: 750000.0,
        minDeposit: 500000.0,
      ),
      act: (bloc) => bloc.add(const ToggleTaskerStatusEvent(goOnline: true)),
      expect: () => [
        const TaskerStatusLoaded(
          isOnline: true,
          depositBalance: 750000.0,
          minDeposit: 500000.0,
        ),
      ],
      verify: (_) {
        verify(
          () => mockDio.patch<dynamic>(
            '/taskers/me/status',
            data: <String, dynamic>{'isOnline': true},
          ),
        ).called(1);
      },
    );

    blocTest<TaskerStatusBloc, TaskerStatusState>(
      'toggle offline succeeds',
      build: () {
        when(
          () => mockDio.patch<dynamic>(
            '/taskers/me/status',
            data: <String, dynamic>{'isOnline': false},
          ),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: '/taskers/me/status'),
            statusCode: 200,
            data: <String, dynamic>{'success': true},
          ),
        );
        return TaskerStatusBloc(dioClient: mockDioClient);
      },
      seed: () => const TaskerStatusLoaded(
        isOnline: true,
        depositBalance: 750000.0,
        minDeposit: 500000.0,
      ),
      act: (bloc) => bloc.add(const ToggleTaskerStatusEvent(goOnline: false)),
      expect: () => [
        const TaskerStatusLoaded(
          isOnline: false,
          depositBalance: 750000.0,
          minDeposit: 500000.0,
        ),
      ],
      verify: (_) {
        verify(
          () => mockDio.patch<dynamic>(
            '/taskers/me/status',
            data: <String, dynamic>{'isOnline': false},
          ),
        ).called(1);
      },
    );

    blocTest<TaskerStatusBloc, TaskerStatusState>(
      'toggle online handles DioException from PATCH endpoint',
      build: () {
        when(
          () => mockDio.patch<dynamic>(
            '/taskers/me/status',
            data: <String, dynamic>{'isOnline': true},
          ),
        ).thenThrow(
          DioException(
            requestOptions: RequestOptions(path: '/taskers/me/status'),
            response: Response<dynamic>(
              requestOptions: RequestOptions(path: '/taskers/me/status'),
              statusCode: 400,
              data: <String, dynamic>{
                'message': 'Hồ sơ KYC chưa được phê duyệt',
              },
            ),
          ),
        );
        return TaskerStatusBloc(dioClient: mockDioClient);
      },
      seed: () => const TaskerStatusLoaded(
        isOnline: false,
        depositBalance: 800000.0,
        minDeposit: 500000.0,
      ),
      act: (bloc) => bloc.add(const ToggleTaskerStatusEvent(goOnline: true)),
      expect: () => [
        const TaskerStatusError(
          message: 'Hồ sơ KYC chưa được phê duyệt',
          currentDeposit: 800000.0,
        ),
      ],
    );

    blocTest<TaskerStatusBloc, TaskerStatusState>(
      'toggle online unseeded fails with network error when deposit check fails',
      build: () {
        when(() => mockDio.get<dynamic>('/finance/summary')).thenThrow(
          DioException(
            requestOptions: RequestOptions(path: '/finance/summary'),
            response: Response<dynamic>(
              requestOptions: RequestOptions(path: '/finance/summary'),
              statusCode: 503,
              data: <String, dynamic>{
                'message': 'Không thể kết nối máy chủ tài chính',
              },
            ),
          ),
        );
        return TaskerStatusBloc(dioClient: mockDioClient);
      },
      act: (bloc) => bloc.add(const ToggleTaskerStatusEvent(goOnline: true)),
      expect: () => [
        const TaskerStatusError(
          message:
              'Không thể xác thực số dư ký quỹ: Không thể kết nối máy chủ tài chính',
        ),
      ],
      verify: (_) {
        verify(() => mockDio.get<dynamic>('/finance/summary')).called(1);
        verifyNever(
          () => mockDio.patch<dynamic>(
            any(),
            data: any(named: 'data'),
          ),
        );
      },
    );

    blocTest<TaskerStatusBloc, TaskerStatusState>(
      'toggle online unseeded joins List error messages from finance summary',
      build: () {
        when(() => mockDio.get<dynamic>('/finance/summary')).thenThrow(
          DioException(
            requestOptions: RequestOptions(path: '/finance/summary'),
            response: Response<dynamic>(
              requestOptions: RequestOptions(path: '/finance/summary'),
              statusCode: 400,
              data: <String, dynamic>{
                'message': ['Lỗi xác thực', 'Token không hợp lệ'],
              },
            ),
          ),
        );
        return TaskerStatusBloc(dioClient: mockDioClient);
      },
      act: (bloc) => bloc.add(const ToggleTaskerStatusEvent(goOnline: true)),
      expect: () => [
        const TaskerStatusError(
          message:
              'Không thể xác thực số dư ký quỹ: Lỗi xác thực, Token không hợp lệ',
        ),
      ],
    );

    blocTest<TaskerStatusBloc, TaskerStatusState>(
      'toggle online dynamically interpolates custom minDepositRequired in error message',
      build: () => TaskerStatusBloc(
        dioClient: mockDioClient,
        minDepositRequired: 1000000.0,
      ),
      seed: () => const TaskerStatusLoaded(
        isOnline: false,
        depositBalance: 800000.0,
        minDeposit: 1000000.0,
      ),
      act: (bloc) => bloc.add(const ToggleTaskerStatusEvent(goOnline: true)),
      expect: () => [
        const TaskerStatusError(
          message:
              'Số dư ví ký quỹ không đủ điều kiện nhận việc (tối thiểu 1.000.000đ). Vui lòng nạp thêm cọc.',
          isInsufficientDeposit: true,
          currentDeposit: 800000.0,
        ),
      ],
    );

    blocTest<TaskerStatusBloc, TaskerStatusState>(
      'toggle online unseeded queries finance summary and succeeds when balance >= 500k',
      build: () {
        when(() => mockDio.get<dynamic>('/finance/summary')).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: '/finance/summary'),
            statusCode: 200,
            data: <String, dynamic>{
              'wallet': <String, dynamic>{'balance': 900000.0},
            },
          ),
        );
        when(
          () => mockDio.patch<dynamic>(
            '/taskers/me/status',
            data: <String, dynamic>{'isOnline': true},
          ),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: '/taskers/me/status'),
            statusCode: 200,
            data: <String, dynamic>{'success': true},
          ),
        );
        return TaskerStatusBloc(dioClient: mockDioClient);
      },
      act: (bloc) => bloc.add(const ToggleTaskerStatusEvent(goOnline: true)),
      expect: () => [
        const TaskerStatusLoaded(
          isOnline: true,
          depositBalance: 900000.0,
          minDeposit: 500000.0,
        ),
      ],
      verify: (_) {
        verify(() => mockDio.get<dynamic>('/finance/summary')).called(1);
        verify(
          () => mockDio.patch<dynamic>(
            '/taskers/me/status',
            data: <String, dynamic>{'isOnline': true},
          ),
        ).called(1);
      },
    );

    blocTest<TaskerStatusBloc, TaskerStatusState>(
      'CheckTaskerStatusEvent parses deposit from taskerProfile',
      build: () {
        when(() => mockDio.get<dynamic>('/finance/summary')).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: '/finance/summary'),
            statusCode: 200,
            data: <String, dynamic>{
              'taskerProfile': <String, dynamic>{
                'depositBalance': '550000',
              },
            },
          ),
        );
        return TaskerStatusBloc(dioClient: mockDioClient);
      },
      act: (bloc) => bloc.add(const CheckTaskerStatusEvent()),
      expect: () => [
        const TaskerStatusLoading(),
        const TaskerStatusLoaded(
          isOnline: false,
          depositBalance: 550000.0,
          minDeposit: 500000.0,
        ),
      ],
    );
  });
}
