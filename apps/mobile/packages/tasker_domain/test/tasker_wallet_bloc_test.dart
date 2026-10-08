import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:linkkwork_core/network/dio_client.dart';
import 'package:linkkwork_tasker_domain/wallet/tasker_wallet_bloc.dart';
import 'package:linkkwork_tasker_domain/wallet/tasker_wallet_event.dart';
import 'package:linkkwork_tasker_domain/wallet/tasker_wallet_state.dart';
import 'package:mocktail/mocktail.dart';

class MockDioClient extends Mock implements DioClient {}

class MockDio extends Mock implements Dio {}

void main() {
  late MockDioClient mockDioClient;
  late MockDio mockDio;

  final sampleTransactions = <Map<String, dynamic>>[
    <String, dynamic>{
      'id': 'tx-1',
      'amount': 250000.0,
      'type': 'CASH_COLLECTED',
      'paymentMethod': 'CASH',
      'status': 'COMPLETED',
    },
    <String, dynamic>{
      'id': 'tx-2',
      'amount': 37500.0,
      'type': 'COMMISSION_FEE',
      'paymentMethod': 'WALLET',
      'status': 'COMPLETED',
    },
  ];

  setUp(() {
    mockDioClient = MockDioClient();
    mockDio = MockDio();

    when(() => mockDioClient.dio).thenReturn(mockDio);
  });

  group('TaskerWalletBloc Tests', () {
    test('initial state is TaskerWalletInitialState', () {
      final bloc = TaskerWalletBloc(dioClient: mockDioClient);
      expect(bloc.state, equals(const TaskerWalletInitialState()));
      bloc.close();
    });

    test('fetches summary and transactions in parallel', () async {
      final summaryCompleter = Completer<Response<dynamic>>();
      final txCompleter = Completer<Response<dynamic>>();

      when(() => mockDio.get<dynamic>('/finance/summary'))
          .thenAnswer((_) => summaryCompleter.future);
      when(() => mockDio.get<dynamic>('/finance/transactions'))
          .thenAnswer((_) => txCompleter.future);

      final bloc = TaskerWalletBloc(dioClient: mockDioClient);
      bloc.add(const LoadWalletDataEvent());

      await pumpEventQueue();

      // Both calls should have been initiated in parallel before either completes
      verify(() => mockDio.get<dynamic>('/finance/summary')).called(1);
      verify(() => mockDio.get<dynamic>('/finance/transactions')).called(1);

      summaryCompleter.complete(Response<dynamic>(
        requestOptions: RequestOptions(path: '/finance/summary'),
        statusCode: 200,
        data: <String, dynamic>{'depositBalance': 500000.0},
      ));
      txCompleter.complete(Response<dynamic>(
        requestOptions: RequestOptions(path: '/finance/transactions'),
        statusCode: 200,
        data: <String, dynamic>{'transactions': sampleTransactions},
      ));

      await pumpEventQueue();

      expect(
        bloc.state,
        equals(TaskerWalletLoadedState(
          depositBalance: 500000.0,
          transactions: sampleTransactions,
        )),
      );

      bloc.close();
    });

    blocTest<TaskerWalletBloc, TaskerWalletState>(
      'LoadWalletDataEvent fetches summary and transactions, emitting TaskerWalletLoadedState',
      build: () {
        when(
          () => mockDio.get<dynamic>('/finance/summary'),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: '/finance/summary'),
            statusCode: 200,
            data: <String, dynamic>{
              'depositBalance': 750000.0,
              'totalDepositHeld': 750000.0,
            },
          ),
        );
        when(
          () => mockDio.get<dynamic>('/finance/transactions'),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: '/finance/transactions'),
            statusCode: 200,
            data: <String, dynamic>{
              'transactions': sampleTransactions,
              'total': 2,
            },
          ),
        );
        return TaskerWalletBloc(dioClient: mockDioClient);
      },
      act: (bloc) => bloc.add(const LoadWalletDataEvent()),
      expect: () => [
        const TaskerWalletLoadingState(),
        TaskerWalletLoadedState(
          depositBalance: 750000.0,
          transactions: sampleTransactions,
        ),
      ],
      verify: (_) {
        verify(() => mockDio.get<dynamic>('/finance/summary')).called(1);
        verify(() => mockDio.get<dynamic>('/finance/transactions')).called(1);
      },
    );

    blocTest<TaskerWalletBloc, TaskerWalletState>(
      'RefreshWalletDataEvent updates wallet state with Zero Flickering when already loaded',
      build: () {
        when(
          () => mockDio.get<dynamic>('/finance/summary'),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: '/finance/summary'),
            statusCode: 200,
            data: <String, dynamic>{
              'depositBalance': 850000.0,
            },
          ),
        );
        when(
          () => mockDio.get<dynamic>('/finance/transactions'),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: '/finance/transactions'),
            statusCode: 200,
            data: <String, dynamic>{
              'transactions': sampleTransactions,
            },
          ),
        );
        return TaskerWalletBloc(dioClient: mockDioClient);
      },
      seed: () => TaskerWalletLoadedState(
        depositBalance: 750000.0,
        transactions: sampleTransactions,
      ),
      act: (bloc) => bloc.add(const RefreshWalletDataEvent()),
      expect: () => [
        TaskerWalletLoadedState(
          depositBalance: 850000.0,
          transactions: sampleTransactions,
        ),
      ],
      verify: (_) {
        verify(() => mockDio.get<dynamic>('/finance/summary')).called(1);
        verify(() => mockDio.get<dynamic>('/finance/transactions')).called(1);
      },
    );

    blocTest<TaskerWalletBloc, TaskerWalletState>(
      'Defensively unwraps map["data"] in _parseDeposit',
      build: () {
        when(
          () => mockDio.get<dynamic>('/finance/summary'),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: '/finance/summary'),
            statusCode: 200,
            data: <String, dynamic>{
              'data': <String, dynamic>{
                'depositBalance': 950000.0,
              },
            },
          ),
        );
        when(
          () => mockDio.get<dynamic>('/finance/transactions'),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: '/finance/transactions'),
            statusCode: 200,
            data: <String, dynamic>{
              'transactions': sampleTransactions,
            },
          ),
        );
        return TaskerWalletBloc(dioClient: mockDioClient);
      },
      act: (bloc) => bloc.add(const LoadWalletDataEvent()),
      expect: () => [
        const TaskerWalletLoadingState(),
        TaskerWalletLoadedState(
          depositBalance: 950000.0,
          transactions: sampleTransactions,
        ),
      ],
    );

    blocTest<TaskerWalletBloc, TaskerWalletState>(
      'Handles network failures on summary emitting TaskerWalletErrorState',
      build: () {
        when(
          () => mockDio.get<dynamic>('/finance/summary'),
        ).thenThrow(
          DioException(
            requestOptions: RequestOptions(path: '/finance/summary'),
            response: Response<dynamic>(
              requestOptions: RequestOptions(path: '/finance/summary'),
              statusCode: 500,
              data: <String, dynamic>{'message': 'Lỗi máy chủ tài chính'},
            ),
          ),
        );
        return TaskerWalletBloc(dioClient: mockDioClient);
      },
      act: (bloc) => bloc.add(const LoadWalletDataEvent()),
      expect: () => [
        const TaskerWalletLoadingState(),
        const TaskerWalletErrorState(error: 'Lỗi máy chủ tài chính'),
      ],
    );

    blocTest<TaskerWalletBloc, TaskerWalletState>(
      'Handles network failures on transactions emitting TaskerWalletErrorState',
      build: () {
        when(
          () => mockDio.get<dynamic>('/finance/summary'),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: '/finance/summary'),
            statusCode: 200,
            data: <String, dynamic>{'depositBalance': 600000.0},
          ),
        );
        when(
          () => mockDio.get<dynamic>('/finance/transactions'),
        ).thenThrow(
          DioException(
            requestOptions: RequestOptions(path: '/finance/transactions'),
            response: Response<dynamic>(
              requestOptions: RequestOptions(path: '/finance/transactions'),
              statusCode: 503,
              data: <String, dynamic>{'message': 'Dịch vụ sổ cái tạm ngưng'},
            ),
          ),
        );
        return TaskerWalletBloc(dioClient: mockDioClient);
      },
      act: (bloc) => bloc.add(const LoadWalletDataEvent()),
      expect: () => [
        const TaskerWalletLoadingState(),
        const TaskerWalletErrorState(error: 'Dịch vụ sổ cái tạm ngưng'),
      ],
    );

    blocTest<TaskerWalletBloc, TaskerWalletState>(
      'Safely parses alternative summary and transactions formats',
      build: () {
        when(
          () => mockDio.get<dynamic>('/finance/summary'),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: '/finance/summary'),
            statusCode: 200,
            data: <String, dynamic>{
              'taskerProfile': <String, dynamic>{
                'depositBalance': '500000.0',
              },
            },
          ),
        );
        when(
          () => mockDio.get<dynamic>('/finance/transactions'),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: '/finance/transactions'),
            statusCode: 200,
            data: <dynamic>[
              <String, dynamic>{
                'id': 'tx-direct',
                'amount': 100000.0,
              },
            ],
          ),
        );
        return TaskerWalletBloc(dioClient: mockDioClient);
      },
      act: (bloc) => bloc.add(const LoadWalletDataEvent()),
      expect: () => [
        const TaskerWalletLoadingState(),
        const TaskerWalletLoadedState(
          depositBalance: 500000.0,
          transactions: <Map<String, dynamic>>[
            <String, dynamic>{
              'id': 'tx-direct',
              'amount': 100000.0,
            },
          ],
        ),
      ],
    );
  });
}
