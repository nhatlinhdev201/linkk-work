import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:linkkwork_core/models/enums.dart';
import 'package:linkkwork_core/socket/socket_client_service.dart';

import 'order_tracking_event.dart';
import 'order_tracking_state.dart';

/// BLoC managing real-time customer order tracking and tasker GPS breadcrumb stream.
class OrderTrackingBloc extends Bloc<OrderTrackingEvent, OrderTrackingState> {
  final SocketClientService socketService;
  final String bookingId;

  StreamSubscription<Map<String, dynamic>>? _statusSub;
  StreamSubscription<Map<String, dynamic>>? _locationSub;

  OrderTrackingBloc({
    required this.socketService,
    required BookingStatus initialStatus,
    required this.bookingId,
  }) : super(OrderTrackingState(
          status: initialStatus,
          bookingId: bookingId,
        )) {
    _statusSub = socketService.statusChangeStream.listen((data) {
      if (!isClosed) {
        final incomingId = (data['bookingId'] ?? data['id'])?.toString();
        if (incomingId == null || incomingId == bookingId) {
          final rawStatus = data['status']?.toString();
          if (rawStatus != null) {
            add(StatusUpdatedEvent(
              status: BookingStatus.fromString(rawStatus),
            ));
          }
        }
      }
    });

    _locationSub = socketService.locationStream.listen((data) {
      if (!isClosed) {
        final incomingId = (data['bookingId'] ?? data['id'])?.toString();
        if (incomingId == null || incomingId == bookingId) {
          final dynamic rawLat = data['latitude'] ?? data['lat'];
          final dynamic rawLng = data['longitude'] ?? data['lng'];
          final lat = rawLat is num
              ? rawLat.toDouble()
              : (rawLat is String ? double.tryParse(rawLat) : null);
          final lng = rawLng is num
              ? rawLng.toDouble()
              : (rawLng is String ? double.tryParse(rawLng) : null);

          if (lat != null && lng != null) {
            add(TaskerLocationUpdatedEvent(
              latitude: lat,
              longitude: lng,
            ));
          }
        }
      }
    });

    on<StatusUpdatedEvent>(_onStatusUpdated);
    on<TaskerLocationUpdatedEvent>(_onTaskerLocationUpdated);
  }

  Future<void> _onStatusUpdated(
    StatusUpdatedEvent event,
    Emitter<OrderTrackingState> emit,
  ) async {
    emit(state.copyWith(status: event.status));
  }

  Future<void> _onTaskerLocationUpdated(
    TaskerLocationUpdatedEvent event,
    Emitter<OrderTrackingState> emit,
  ) async {
    emit(state.copyWith(
      taskerLatitude: event.latitude,
      taskerLongitude: event.longitude,
    ));
  }

  @override
  Future<void> close() async {
    await _statusSub?.cancel();
    _statusSub = null;
    await _locationSub?.cancel();
    _locationSub = null;
    return super.close();
  }
}
