import 'package:equatable/equatable.dart';
import 'package:linkkwork_core/models/enums.dart';

/// Base event class for order tracking domain operations.
abstract class OrderTrackingEvent extends Equatable {
  const OrderTrackingEvent();

  @override
  List<Object?> get props => [];
}

/// Event dispatched when a booking status change is received.
class StatusUpdatedEvent extends OrderTrackingEvent {
  final BookingStatus status;

  const StatusUpdatedEvent({required this.status});

  @override
  List<Object?> get props => [status];
}

/// Event dispatched when real-time tasker location coordinates are received.
class TaskerLocationUpdatedEvent extends OrderTrackingEvent {
  final double latitude;
  final double longitude;

  const TaskerLocationUpdatedEvent({
    required this.latitude,
    required this.longitude,
  });

  @override
  List<Object?> get props => [latitude, longitude];
}
