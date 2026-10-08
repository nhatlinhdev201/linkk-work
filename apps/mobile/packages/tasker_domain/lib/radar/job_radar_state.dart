import 'package:equatable/equatable.dart';

/// Base state class for job radar.
abstract class JobRadarState extends Equatable {
  const JobRadarState();

  @override
  List<Object?> get props => [];
}

/// Idle radar state when listening for incoming jobs without active alerts.
class JobRadarIdleState extends JobRadarState {
  const JobRadarIdleState();
}

/// Active radar alert state displaying job info with 30-second countdown.
class JobRadarAlertState extends JobRadarState {
  final Map<String, dynamic> bookingData;
  final int remainingSeconds;

  const JobRadarAlertState({
    required this.bookingData,
    this.remainingSeconds = 30,
  });

  @override
  List<Object?> get props => [bookingData, remainingSeconds];
}

/// In-flight state while atomic CAS claim request is being processed.
class JobClaimingState extends JobRadarState {
  final String bookingId;

  const JobClaimingState({required this.bookingId});

  @override
  List<Object?> get props => [bookingId];
}

/// State emitted when job is successfully claimed by the tasker.
class JobClaimSuccessState extends JobRadarState {
  final Map<String, dynamic> booking;

  const JobClaimSuccessState({required this.booking});

  @override
  List<Object?> get props => [booking];
}

/// State emitted when another tasker claimed the job faster (HTTP 409 conflict).
class JobClaimConflictState extends JobRadarState {
  final String message;

  const JobClaimConflictState({required this.message});

  @override
  List<Object?> get props => [message];
}

/// State emitted when claiming encounters an error (non-409).
class JobClaimErrorState extends JobRadarState {
  final String message;

  const JobClaimErrorState({required this.message});

  @override
  List<Object?> get props => [message];
}
