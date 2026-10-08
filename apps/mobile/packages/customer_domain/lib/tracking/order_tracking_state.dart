import 'package:equatable/equatable.dart';
import 'package:linkkwork_core/models/enums.dart';

/// State representation for live order tracking and tasker GPS breadcrumbs.
class OrderTrackingState extends Equatable {
  final BookingStatus status;
  final double? taskerLatitude;
  final double? taskerLongitude;
  final String? bookingId;

  const OrderTrackingState({
    this.status = BookingStatus.draft,
    this.taskerLatitude,
    this.taskerLongitude,
    this.bookingId,
  });

  OrderTrackingState copyWith({
    BookingStatus? status,
    double? taskerLatitude,
    double? taskerLongitude,
    String? bookingId,
  }) {
    return OrderTrackingState(
      status: status ?? this.status,
      taskerLatitude: taskerLatitude ?? this.taskerLatitude,
      taskerLongitude: taskerLongitude ?? this.taskerLongitude,
      bookingId: bookingId ?? this.bookingId,
    );
  }

  @override
  List<Object?> get props => [
        status,
        taskerLatitude,
        taskerLongitude,
        bookingId,
      ];
}
