import 'package:equatable/equatable.dart';

/// Base state class for tasker availability status and deposit guard.
abstract class TaskerStatusState extends Equatable {
  const TaskerStatusState();

  @override
  List<Object?> get props => [];
}

/// Initial state before status or deposit balance is checked.
class TaskerStatusInitial extends TaskerStatusState {
  const TaskerStatusInitial();
}

/// Loading state while querying financial or profile status.
class TaskerStatusLoading extends TaskerStatusState {
  const TaskerStatusLoading();
}

/// Loaded state with verified online status and deposit balance.
class TaskerStatusLoaded extends TaskerStatusState {
  final bool isOnline;
  final double depositBalance;
  final double minDeposit;

  const TaskerStatusLoaded({
    required this.isOnline,
    required this.depositBalance,
    this.minDeposit = 500000.0,
  });

  @override
  List<Object?> get props => [isOnline, depositBalance, minDeposit];
}

/// Error state when status query fails or deposit is insufficient.
class TaskerStatusError extends TaskerStatusState {
  final String message;
  final bool isInsufficientDeposit;
  final double? currentDeposit;

  const TaskerStatusError({
    required this.message,
    this.isInsufficientDeposit = false,
    this.currentDeposit,
  });

  @override
  List<Object?> get props => [
        message,
        isInsufficientDeposit,
        currentDeposit,
      ];
}
