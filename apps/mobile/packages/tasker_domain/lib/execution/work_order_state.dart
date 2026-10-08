import 'package:equatable/equatable.dart';
import 'package:linkkwork_core/models/enums.dart';

/// Base state class for work order execution.
abstract class WorkOrderState extends Equatable {
  const WorkOrderState();

  @override
  List<Object?> get props => [];
}

/// Initial state before any work order data is loaded.
class WorkOrderInitialState extends WorkOrderState {
  const WorkOrderInitialState();
}

/// State emitted while loading work order data.
class WorkOrderLoadingState extends WorkOrderState {
  const WorkOrderLoadingState();
}

/// Active execution state representing one of the steps: arriving, inProgress, pendingAcceptance.
class WorkOrderActiveState extends WorkOrderState {
  final String bookingId;
  final BookingStatus status;
  final Map<String, dynamic> booking;

  const WorkOrderActiveState({
    required this.bookingId,
    required this.status,
    required this.booking,
  });

  @override
  List<Object?> get props => [bookingId, status, booking];
}

/// State emitted upon successful cash collection and double-entry ledger completion.
class WorkOrderCompletedState extends WorkOrderState {
  final String bookingId;
  final double amountCollected;

  const WorkOrderCompletedState({
    required this.bookingId,
    required this.amountCollected,
  });

  @override
  List<Object?> get props => [bookingId, amountCollected];
}

/// State emitted when an error occurs during work order execution or Mock GPS detection.
class WorkOrderErrorState extends WorkOrderState {
  final String error;

  const WorkOrderErrorState({required this.error});

  @override
  List<Object?> get props => [error];
}
