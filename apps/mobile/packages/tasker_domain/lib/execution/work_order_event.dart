import 'package:equatable/equatable.dart';

/// Base event class for work order execution.
abstract class WorkOrderEvent extends Equatable {
  const WorkOrderEvent();

  @override
  List<Object?> get props => [];
}

/// Event to load existing booking work order.
class LoadWorkOrderEvent extends WorkOrderEvent {
  final String bookingId;

  const LoadWorkOrderEvent({required this.bookingId});

  @override
  List<Object?> get props => [bookingId];
}

/// Event to signal that the tasker has started traveling to the customer location.
class StartTravelingEvent extends WorkOrderEvent {
  final String bookingId;

  const StartTravelingEvent({required this.bookingId});

  @override
  List<Object?> get props => [bookingId];
}

/// Event to record arrival check-in with GPS verification and field photo.
class CheckInArrivalEvent extends WorkOrderEvent {
  final String bookingId;
  final String checkInPhotoUrl;

  const CheckInArrivalEvent({
    required this.bookingId,
    required this.checkInPhotoUrl,
  });

  @override
  List<Object?> get props => [bookingId, checkInPhotoUrl];
}

/// Event to submit job completion proof photos requesting acceptance.
class SubmitCompletionProofEvent extends WorkOrderEvent {
  final String bookingId;
  final List<String> proofPhotos;

  const SubmitCompletionProofEvent({
    required this.bookingId,
    required this.proofPhotos,
  });

  @override
  List<Object?> get props => [bookingId, proofPhotos];
}

/// Event to confirm cash collection and trigger ledger double-entry settlement.
class ConfirmCashPaymentEvent extends WorkOrderEvent {
  final String bookingId;
  final double amount;

  const ConfirmCashPaymentEvent({
    required this.bookingId,
    required this.amount,
  });

  @override
  List<Object?> get props => [bookingId, amount];
}
