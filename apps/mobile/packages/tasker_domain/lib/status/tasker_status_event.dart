import 'package:equatable/equatable.dart';

/// Base event class for tasker availability status and deposit guard.
abstract class TaskerStatusEvent extends Equatable {
  const TaskerStatusEvent();

  @override
  List<Object?> get props => [];
}

/// Dispatched to check current tasker online availability and deposit balance.
class CheckTaskerStatusEvent extends TaskerStatusEvent {
  const CheckTaskerStatusEvent();
}

/// Dispatched to toggle online or offline status.
class ToggleTaskerStatusEvent extends TaskerStatusEvent {
  final bool goOnline;

  const ToggleTaskerStatusEvent({required this.goOnline});

  @override
  List<Object?> get props => [goOnline];
}
