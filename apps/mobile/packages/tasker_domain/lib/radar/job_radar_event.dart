import 'package:equatable/equatable.dart';

/// Base event class for job radar interactions.
abstract class JobRadarEvent extends Equatable {
  const JobRadarEvent();

  @override
  List<Object?> get props => [];
}

/// Dispatched when a new job broadcast is received via WebSocket.
class NewJobBroadcastReceivedEvent extends JobRadarEvent {
  final Map<String, dynamic> bookingData;

  const NewJobBroadcastReceivedEvent({required this.bookingData});

  @override
  List<Object?> get props => [bookingData];
}

/// Dispatched when tasker initiates atomic CAS job claim.
class ClaimJobEvent extends JobRadarEvent {
  final String bookingId;

  const ClaimJobEvent({required this.bookingId});

  @override
  List<Object?> get props => [bookingId];
}

/// Dispatched when tasker manually dismisses or skips the radar alert.
class DismissRadarAlertEvent extends JobRadarEvent {
  const DismissRadarAlertEvent();
}

/// Dispatched every second during the 30-second countdown.
class RadarTickEvent extends JobRadarEvent {
  final int remainingSeconds;

  const RadarTickEvent({required this.remainingSeconds});

  @override
  List<Object?> get props => [remainingSeconds];
}

/// Dispatched when another tasker claims the broadcasted booking first.
class JobClaimedByAnotherEvent extends JobRadarEvent {
  final String bookingId;

  const JobClaimedByAnotherEvent({required this.bookingId});

  @override
  List<Object?> get props => [bookingId];
}
