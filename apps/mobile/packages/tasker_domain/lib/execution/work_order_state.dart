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
  final bool isUpdating;

  const WorkOrderActiveState({
    required this.bookingId,
    required this.status,
    required this.booking,
    this.isUpdating = false,
  });

  WorkOrderActiveState copyWith({
    String? bookingId,
    BookingStatus? status,
    Map<String, dynamic>? booking,
    bool? isUpdating,
  }) {
    return WorkOrderActiveState(
      bookingId: bookingId ?? this.bookingId,
      status: status ?? this.status,
      booking: booking ?? this.booking,
      isUpdating: isUpdating ?? this.isUpdating,
    );
  }

  @override
  List<Object?> get props => [bookingId, status, booking, isUpdating];
}

/// State emitted upon successful cash collection and double-entry ledger completion.
class WorkOrderCompletedState extends WorkOrderState {
  final String bookingId;
  final double amountCollected;
  final Map<String, dynamic> settlementData;

  const WorkOrderCompletedState({
    required this.bookingId,
    required this.amountCollected,
    this.settlementData = const <String, dynamic>{},
  });

  @override
  List<Object?> get props => [bookingId, amountCollected, settlementData];
}

/// State emitted when an error occurs during work order execution or Mock GPS detection.
class WorkOrderErrorState extends WorkOrderState {
  final String error;
  final String? bookingId;
  final Map<String, dynamic>? booking;
  final BookingStatus? previousStatus;

  const WorkOrderErrorState({
    required this.error,
    this.bookingId,
    this.booking,
    this.previousStatus,
  });

  @override
  List<Object?> get props => [error, bookingId, booking, previousStatus];
}
