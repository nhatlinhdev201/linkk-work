import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:linkkwork_core/audio/audio_alert_service.dart';
import 'package:linkkwork_core/network/dio_client.dart';
import 'package:linkkwork_core/socket/socket_client_service.dart';

import 'job_radar_event.dart';
import 'job_radar_state.dart';

/// BLoC managing incoming job broadcast radar alerts and atomic CAS job claims.
class JobRadarBloc extends Bloc<JobRadarEvent, JobRadarState> {
  final SocketClientService socketService;
  final DioClient dioClient;
  final AudioAlertService audioService;

  StreamSubscription<Map<String, dynamic>>? _broadcastSub;
  StreamSubscription<Map<String, dynamic>>? _claimedSub;
  Timer? _countdownTimer;

  JobRadarBloc({
    required this.socketService,
    required this.dioClient,
    required this.audioService,
  }) : super(const JobRadarIdleState()) {
    _broadcastSub = socketService.jobBroadcastStream.listen((data) {
      add(NewJobBroadcastReceivedEvent(bookingData: data));
    });

    _claimedSub = socketService.jobClaimedStream.listen((data) {
      final bookingId = (data['bookingId'] ?? data['id'])?.toString();
      if (bookingId != null && bookingId.isNotEmpty) {
        add(JobClaimedByAnotherEvent(bookingId: bookingId));
      }
    });

    on<NewJobBroadcastReceivedEvent>(_onNewJobBroadcastReceived);
    on<RadarTickEvent>(_onRadarTick);
    on<JobClaimedByAnotherEvent>(_onJobClaimedByAnother);
    on<DismissRadarAlertEvent>(_onDismissRadarAlert);
    on<ClaimJobEvent>(_onClaimJob);
  }

  Future<void> _onNewJobBroadcastReceived(
    NewJobBroadcastReceivedEvent event,
    Emitter<JobRadarState> emit,
  ) async {
    _countdownTimer?.cancel();
    _countdownTimer = null;

    await audioService.startRadarAlert();
    emit(JobRadarAlertState(
      bookingData: event.bookingData,
      remainingSeconds: 30,
    ));

    var remaining = 30;
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      remaining--;
      if (remaining <= 0) {
        timer.cancel();
        add(const RadarTickEvent(remainingSeconds: 0));
      } else {
        add(RadarTickEvent(remainingSeconds: remaining));
      }
    });
  }

  Future<void> _onRadarTick(
    RadarTickEvent event,
    Emitter<JobRadarState> emit,
  ) async {
    if (state is JobRadarAlertState) {
      if (event.remainingSeconds <= 0) {
        _countdownTimer?.cancel();
        _countdownTimer = null;
        await audioService.stopAlert();
        emit(const JobRadarIdleState());
      } else {
        final currentAlert = state as JobRadarAlertState;
        emit(JobRadarAlertState(
          bookingData: currentAlert.bookingData,
          remainingSeconds: event.remainingSeconds,
        ));
      }
    }
  }

  Future<void> _onJobClaimedByAnother(
    JobClaimedByAnotherEvent event,
    Emitter<JobRadarState> emit,
  ) async {
    if (state is JobRadarAlertState) {
      final alertState = state as JobRadarAlertState;
      final currentBookingId =
          (alertState.bookingData['bookingId'] ?? alertState.bookingData['id'])
              ?.toString();
      if (currentBookingId == null || currentBookingId == event.bookingId) {
        _countdownTimer?.cancel();
        _countdownTimer = null;
        await audioService.stopAlert();
        emit(const JobRadarIdleState());
      }
    }
  }

  Future<void> _onDismissRadarAlert(
    DismissRadarAlertEvent event,
    Emitter<JobRadarState> emit,
  ) async {
    _countdownTimer?.cancel();
    _countdownTimer = null;
    await audioService.stopAlert();
    emit(const JobRadarIdleState());
  }

  Future<void> _onClaimJob(
    ClaimJobEvent event,
    Emitter<JobRadarState> emit,
  ) async {
    _countdownTimer?.cancel();
    _countdownTimer = null;
    await audioService.stopAlert();

    emit(JobClaimingState(bookingId: event.bookingId));

    try {
      final res = await dioClient.dio.post<dynamic>(
        '/bookings/${event.bookingId}/claim',
      );

      final responseData = res.data;
      final Map<String, dynamic> booking;
      if (responseData is Map<String, dynamic>) {
        booking = responseData;
      } else if (responseData is Map) {
        booking = Map<String, dynamic>.from(responseData);
      } else {
        booking = <String, dynamic>{};
      }

      await audioService.playSuccessChime();
      emit(JobClaimSuccessState(booking: booking));
    } on DioException catch (e) {
      if (e.response?.statusCode == 409) {
        emit(const JobClaimConflictState(
          message: 'Đơn đã có thợ khác nhận trước!',
        ));
      } else {
        var errorMessage = 'Lỗi nhận đơn';
        final errData = e.response?.data;
        if (errData is Map && errData['message'] != null) {
          errorMessage = errData['message'].toString();
        } else if (e.message != null && e.message!.isNotEmpty) {
          errorMessage = e.message!;
        }
        emit(JobClaimErrorState(message: errorMessage));
      }
    } catch (e) {
      emit(JobClaimErrorState(message: e.toString()));
    }
  }

  @override
  Future<void> close() async {
    await _broadcastSub?.cancel();
    await _claimedSub?.cancel();
    _countdownTimer?.cancel();
    _countdownTimer = null;
    if (state is JobRadarAlertState) {
      await audioService.stopAlert();
    }
    return super.close();
  }
}
