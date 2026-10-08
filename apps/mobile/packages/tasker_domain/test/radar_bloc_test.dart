import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:linkkwork_core/audio/audio_alert_service.dart';
import 'package:linkkwork_core/network/dio_client.dart';
import 'package:linkkwork_core/socket/socket_client_service.dart';
import 'package:linkkwork_tasker_domain/radar/job_radar_bloc.dart';
import 'package:linkkwork_tasker_domain/radar/job_radar_event.dart';
import 'package:linkkwork_tasker_domain/radar/job_radar_state.dart';
import 'package:mocktail/mocktail.dart';

class MockSocketClientService extends Mock implements SocketClientService {}

class MockDioClient extends Mock implements DioClient {}

class MockDio extends Mock implements Dio {}

class MockAudioAlertService extends Mock implements AudioAlertService {}

void main() {
  late MockSocketClientService mockSocket;
  late MockDioClient mockDioClient;
  late MockDio mockDio;
  late MockAudioAlertService mockAudio;
  late StreamController<Map<String, dynamic>> broadcastController;
  late StreamController<Map<String, dynamic>> claimedController;

  setUp(() {
    mockSocket = MockSocketClientService();
    mockDioClient = MockDioClient();
    mockDio = MockDio();
    mockAudio = MockAudioAlertService();

    broadcastController = StreamController<Map<String, dynamic>>.broadcast();
    claimedController = StreamController<Map<String, dynamic>>.broadcast();

    when(() => mockSocket.jobBroadcastStream)
        .thenAnswer((_) => broadcastController.stream);
    when(() => mockSocket.jobClaimedStream)
        .thenAnswer((_) => claimedController.stream);
    when(() => mockDioClient.dio).thenReturn(mockDio);

    when(() => mockAudio.startRadarAlert()).thenAnswer((_) async {});
    when(() => mockAudio.stopAlert()).thenAnswer((_) async {});
    when(() => mockAudio.playSuccessChime()).thenAnswer((_) async {});
  });

  tearDown(() async {
    await broadcastController.close();
    await claimedController.close();
  });

  group('JobRadarBloc', () {
    const testBookingData = <String, dynamic>{
      'bookingId': 'bk-123',
      'serviceName': 'Sửa chữa điện',
      'totalAmount': 350000.0,
    };

    test('initial state is JobRadarIdleState', () {
      final bloc = JobRadarBloc(
        socketService: mockSocket,
        dioClient: mockDioClient,
        audioService: mockAudio,
      );
      expect(bloc.state, equals(const JobRadarIdleState()));
      bloc.close();
    });

    blocTest<JobRadarBloc, JobRadarState>(
      'emits JobRadarAlertState and starts radar alert audio when NewJobBroadcastReceivedEvent is added',
      build: () => JobRadarBloc(
        socketService: mockSocket,
        dioClient: mockDioClient,
        audioService: mockAudio,
      ),
      act: (bloc) => bloc.add(const NewJobBroadcastReceivedEvent(
        bookingData: testBookingData,
      )),
      expect: () => [
        const JobRadarAlertState(
          bookingData: testBookingData,
          remainingSeconds: 30,
        ),
      ],
      verify: (_) {
        verify(() => mockAudio.startRadarAlert()).called(1);
      },
    );

    blocTest<JobRadarBloc, JobRadarState>(
      'receives broadcast from socket stream and emits JobRadarAlertState',
      build: () => JobRadarBloc(
        socketService: mockSocket,
        dioClient: mockDioClient,
        audioService: mockAudio,
      ),
      act: (_) {
        broadcastController.add(testBookingData);
      },
      expect: () => [
        const JobRadarAlertState(
          bookingData: testBookingData,
          remainingSeconds: 30,
        ),
      ],
      verify: (_) {
        verify(() => mockAudio.startRadarAlert()).called(1);
      },
    );

    blocTest<JobRadarBloc, JobRadarState>(
      'updates remainingSeconds on RadarTickEvent and auto-dismisses when reaching 0',
      build: () => JobRadarBloc(
        socketService: mockSocket,
        dioClient: mockDioClient,
        audioService: mockAudio,
      ),
      seed: () => const JobRadarAlertState(
        bookingData: testBookingData,
        remainingSeconds: 2,
      ),
      act: (bloc) {
        bloc.add(const RadarTickEvent(remainingSeconds: 1));
        bloc.add(const RadarTickEvent(remainingSeconds: 0));
      },
      expect: () => [
        const JobRadarAlertState(
          bookingData: testBookingData,
          remainingSeconds: 1,
        ),
        const JobRadarIdleState(),
      ],
      verify: (_) {
        verify(() => mockAudio.stopAlert()).called(1);
      },
    );

    blocTest<JobRadarBloc, JobRadarState>(
      'dismiss alert event stops audio and emits JobRadarIdleState',
      build: () => JobRadarBloc(
        socketService: mockSocket,
        dioClient: mockDioClient,
        audioService: mockAudio,
      ),
      seed: () => const JobRadarAlertState(
        bookingData: testBookingData,
        remainingSeconds: 25,
      ),
      act: (bloc) => bloc.add(const DismissRadarAlertEvent()),
      expect: () => [
        const JobRadarIdleState(),
      ],
      verify: (_) {
        verify(() => mockAudio.stopAlert()).called(1);
      },
    );

    blocTest<JobRadarBloc, JobRadarState>(
      'claim job success emits JobClaimingState then JobClaimSuccessState and plays chime',
      build: () {
        when(
          () => mockDio.post<dynamic>(
            '/bookings/bk-123/claim',
            data: any(named: 'data'),
          ),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: '/bookings/bk-123/claim'),
            statusCode: 200,
            data: <String, dynamic>{
              'id': 'bk-123',
              'status': 'ASSIGNED',
            },
          ),
        );
        return JobRadarBloc(
          socketService: mockSocket,
          dioClient: mockDioClient,
          audioService: mockAudio,
        );
      },
      seed: () => const JobRadarAlertState(
        bookingData: testBookingData,
        remainingSeconds: 20,
      ),
      act: (bloc) => bloc.add(const ClaimJobEvent(bookingId: 'bk-123')),
      expect: () => [
        const JobClaimingState(bookingId: 'bk-123'),
        const JobClaimSuccessState(booking: <String, dynamic>{
          'id': 'bk-123',
          'status': 'ASSIGNED',
        }),
      ],
      verify: (_) {
        verify(() => mockAudio.stopAlert()).called(1);
        verify(() => mockAudio.playSuccessChime()).called(1);
        verify(() => mockDio.post<dynamic>('/bookings/bk-123/claim')).called(1);
      },
    );

    blocTest<JobRadarBloc, JobRadarState>(
      'claim job 409 conflict emits JobClaimConflictState',
      build: () {
        when(
          () => mockDio.post<dynamic>(
            '/bookings/bk-123/claim',
            data: any(named: 'data'),
          ),
        ).thenThrow(
          DioException(
            requestOptions: RequestOptions(path: '/bookings/bk-123/claim'),
            response: Response<dynamic>(
              requestOptions: RequestOptions(path: '/bookings/bk-123/claim'),
              statusCode: 409,
              data: <String, dynamic>{
                'message': 'Đơn hàng đã được thợ khác tiếp nhận!',
              },
            ),
          ),
        );
        return JobRadarBloc(
          socketService: mockSocket,
          dioClient: mockDioClient,
          audioService: mockAudio,
        );
      },
      seed: () => const JobRadarAlertState(
        bookingData: testBookingData,
        remainingSeconds: 20,
      ),
      act: (bloc) => bloc.add(const ClaimJobEvent(bookingId: 'bk-123')),
      expect: () => [
        const JobClaimingState(bookingId: 'bk-123'),
        const JobClaimConflictState(
          message: 'Đơn đã có thợ khác nhận trước!',
        ),
      ],
      verify: (_) {
        verify(() => mockAudio.stopAlert()).called(1);
      },
    );

    blocTest<JobRadarBloc, JobRadarState>(
      'claim job error other than 409 emits JobClaimErrorState',
      build: () {
        when(
          () => mockDio.post<dynamic>(
            '/bookings/bk-123/claim',
            data: any(named: 'data'),
          ),
        ).thenThrow(
          DioException(
            requestOptions: RequestOptions(path: '/bookings/bk-123/claim'),
            response: Response<dynamic>(
              requestOptions: RequestOptions(path: '/bookings/bk-123/claim'),
              statusCode: 500,
              data: <String, dynamic>{
                'message': 'Máy chủ bận, vui lòng thử lại sau',
              },
            ),
          ),
        );
        return JobRadarBloc(
          socketService: mockSocket,
          dioClient: mockDioClient,
          audioService: mockAudio,
        );
      },
      seed: () => const JobRadarAlertState(
        bookingData: testBookingData,
        remainingSeconds: 20,
      ),
      act: (bloc) => bloc.add(const ClaimJobEvent(bookingId: 'bk-123')),
      expect: () => [
        const JobClaimingState(bookingId: 'bk-123'),
        const JobClaimErrorState(
          message: 'Máy chủ bận, vui lòng thử lại sau',
        ),
      ],
      verify: (_) {
        verify(() => mockAudio.stopAlert()).called(1);
      },
    );

    blocTest<JobRadarBloc, JobRadarState>(
      'claim job claimed by another tasker via event dismisses alert',
      build: () => JobRadarBloc(
        socketService: mockSocket,
        dioClient: mockDioClient,
        audioService: mockAudio,
      ),
      seed: () => const JobRadarAlertState(
        bookingData: testBookingData,
        remainingSeconds: 18,
      ),
      act: (bloc) =>
          bloc.add(const JobClaimedByAnotherEvent(bookingId: 'bk-123')),
      expect: () => [
        const JobRadarIdleState(),
      ],
      verify: (_) {
        verify(() => mockAudio.stopAlert()).called(1);
      },
    );

    blocTest<JobRadarBloc, JobRadarState>(
      'claimed by another tasker via socket claimed stream dismisses alert',
      build: () => JobRadarBloc(
        socketService: mockSocket,
        dioClient: mockDioClient,
        audioService: mockAudio,
      ),
      seed: () => const JobRadarAlertState(
        bookingData: testBookingData,
        remainingSeconds: 18,
      ),
      act: (_) {
        claimedController.add(<String, dynamic>{'bookingId': 'bk-123'});
      },
      expect: () => [
        const JobRadarIdleState(),
      ],
      verify: (_) {
        verify(() => mockAudio.stopAlert()).called(1);
      },
    );

    blocTest<JobRadarBloc, JobRadarState>(
      'claimed by another tasker with different bookingId does not dismiss alert',
      build: () => JobRadarBloc(
        socketService: mockSocket,
        dioClient: mockDioClient,
        audioService: mockAudio,
      ),
      seed: () => const JobRadarAlertState(
        bookingData: testBookingData,
        remainingSeconds: 18,
      ),
      act: (bloc) => bloc
          .add(const JobClaimedByAnotherEvent(bookingId: 'bk-different-999')),
      expect: () => <JobRadarState>[],
      verify: (_) {
        // stopAlert is only called during bloc.close() teardown because the alert was not dismissed
        verify(() => mockAudio.stopAlert()).called(1);
      },
    );

    blocTest<JobRadarBloc, JobRadarState>(
      'claim job is ignored when not in JobRadarAlertState (e.g. idle)',
      build: () => JobRadarBloc(
        socketService: mockSocket,
        dioClient: mockDioClient,
        audioService: mockAudio,
      ),
      act: (bloc) => bloc.add(const ClaimJobEvent(bookingId: 'bk-123')),
      expect: () => <JobRadarState>[],
      verify: (_) {
        verifyNever(
          () => mockDio.post<dynamic>(any(), data: any(named: 'data')),
        );
      },
    );

    blocTest<JobRadarBloc, JobRadarState>(
      'claim job double-tap ignored when state is already JobClaimingState',
      build: () => JobRadarBloc(
        socketService: mockSocket,
        dioClient: mockDioClient,
        audioService: mockAudio,
      ),
      seed: () => const JobClaimingState(bookingId: 'bk-123'),
      act: (bloc) => bloc.add(const ClaimJobEvent(bookingId: 'bk-123')),
      expect: () => <JobRadarState>[],
      verify: (_) {
        verifyNever(
          () => mockDio.post<dynamic>(any(), data: any(named: 'data')),
        );
      },
    );

    blocTest<JobRadarBloc, JobRadarState>(
      'new broadcast ignored while in JobClaimingState',
      build: () => JobRadarBloc(
        socketService: mockSocket,
        dioClient: mockDioClient,
        audioService: mockAudio,
      ),
      seed: () => const JobClaimingState(bookingId: 'bk-123'),
      act: (bloc) => bloc.add(const NewJobBroadcastReceivedEvent(
        bookingData: testBookingData,
      )),
      expect: () => <JobRadarState>[],
      verify: (_) {
        verifyNever(() => mockAudio.startRadarAlert());
      },
    );

    blocTest<JobRadarBloc, JobRadarState>(
      'new broadcast ignored while in JobClaimSuccessState',
      build: () => JobRadarBloc(
        socketService: mockSocket,
        dioClient: mockDioClient,
        audioService: mockAudio,
      ),
      seed: () => const JobClaimSuccessState(booking: testBookingData),
      act: (bloc) => bloc.add(const NewJobBroadcastReceivedEvent(
        bookingData: testBookingData,
      )),
      expect: () => <JobRadarState>[],
      verify: (_) {
        verifyNever(() => mockAudio.startRadarAlert());
      },
    );

    blocTest<JobRadarBloc, JobRadarState>(
      'claim job error joins List messages if present in response',
      build: () {
        when(
          () => mockDio.post<dynamic>(
            '/bookings/bk-123/claim',
            data: any(named: 'data'),
          ),
        ).thenThrow(
          DioException(
            requestOptions: RequestOptions(path: '/bookings/bk-123/claim'),
            response: Response<dynamic>(
              requestOptions: RequestOptions(path: '/bookings/bk-123/claim'),
              statusCode: 400,
              data: <String, dynamic>{
                'message': ['Tài khoản tạm khóa', 'Chưa hoàn tất đơn hiện tại'],
              },
            ),
          ),
        );
        return JobRadarBloc(
          socketService: mockSocket,
          dioClient: mockDioClient,
          audioService: mockAudio,
        );
      },
      seed: () => const JobRadarAlertState(
        bookingData: testBookingData,
        remainingSeconds: 20,
      ),
      act: (bloc) => bloc.add(const ClaimJobEvent(bookingId: 'bk-123')),
      expect: () => [
        const JobClaimingState(bookingId: 'bk-123'),
        const JobClaimErrorState(
          message: 'Tài khoản tạm khóa, Chưa hoàn tất đơn hiện tại',
        ),
      ],
      verify: (_) {
        verify(() => mockAudio.stopAlert()).called(1);
      },
    );
  });
}
