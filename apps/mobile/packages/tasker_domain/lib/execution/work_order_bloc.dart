import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:geolocator/geolocator.dart';
import 'package:linkkwork_core/location/location_service.dart';
import 'package:linkkwork_core/models/enums.dart';
import 'package:linkkwork_core/network/dio_client.dart';

import 'work_order_event.dart';
import 'work_order_state.dart';

/// BLoC managing 4-step work order execution with anti-fraud GPS verification
/// and double-entry cash payment ledger completion.
class WorkOrderBloc extends Bloc<WorkOrderEvent, WorkOrderState> {
  final DioClient dioClient;
  final LocationService locationService;

  WorkOrderBloc({
    required this.dioClient,
    required this.locationService,
  }) : super(const WorkOrderInitialState()) {
    on<LoadWorkOrderEvent>(_onLoadWorkOrder);
    on<StartTravelingEvent>(_onStartTraveling);
    on<CheckInArrivalEvent>(_onCheckInArrival);
    on<SubmitCompletionProofEvent>(_onSubmitCompletionProof);
    on<ConfirmCashPaymentEvent>(_onConfirmCashPayment);
  }

  Future<void> _onLoadWorkOrder(
    LoadWorkOrderEvent event,
    Emitter<WorkOrderState> emit,
  ) async {
    emit(const WorkOrderLoadingState());
    try {
      final res = await dioClient.dio.get<dynamic>(
        '/bookings/${event.bookingId}',
      );
      final booking = _parseBooking(res.data, event.bookingId);
      final status = BookingStatus.fromString(booking['status']?.toString());
      emit(WorkOrderActiveState(
        bookingId: event.bookingId,
        status: status,
        booking: booking,
      ));
    } on DioException catch (e) {
      _emitError(
        emit,
        error: _extractErrorMessage(e),
        fallbackBookingId: event.bookingId,
      );
    } catch (e) {
      _emitError(
        emit,
        error: _extractErrorMessage(e),
        fallbackBookingId: event.bookingId,
      );
    }
  }

  Future<void> _onStartTraveling(
    StartTravelingEvent event,
    Emitter<WorkOrderState> emit,
  ) async {
    if (state is WorkOrderActiveState) {
      final active = state as WorkOrderActiveState;
      if (active.isUpdating) return;
      emit(active.copyWith(isUpdating: true));
    }
    try {
      final res = await dioClient.dio.patch<dynamic>(
        '/bookings/${event.bookingId}/status',
        data: <String, dynamic>{
          'status': BookingStatus.arriving.value,
        },
      );
      final booking = _mergeBooking(
        res.data,
        event.bookingId,
        BookingStatus.arriving.value,
      );
      emit(WorkOrderActiveState(
        bookingId: event.bookingId,
        status: BookingStatus.arriving,
        booking: booking,
      ));
    } on DioException catch (e) {
      _emitError(
        emit,
        error: _extractErrorMessage(e),
        fallbackBookingId: event.bookingId,
      );
    } catch (e) {
      _emitError(
        emit,
        error: _extractErrorMessage(e),
        fallbackBookingId: event.bookingId,
      );
    }
  }

  Future<void> _onCheckInArrival(
    CheckInArrivalEvent event,
    Emitter<WorkOrderState> emit,
  ) async {
    if (state is WorkOrderActiveState) {
      final active = state as WorkOrderActiveState;
      if (active.isUpdating) return;
      emit(active.copyWith(isUpdating: true));
    }
    try {
      final pos = await locationService.getCurrentPosition();

      // Anti-Fraud check: detect spoofed/mock GPS
      if (locationService.isMockLocation(pos)) {
        _emitError(
          emit,
          error:
              'Phát hiện vị trí giả lập (Mock GPS). Vui lòng tắt ứng dụng giả lập GPS để tiếp tục!',
          fallbackBookingId: event.bookingId,
        );
        return;
      }

      final res = await dioClient.dio.patch<dynamic>(
        '/bookings/${event.bookingId}/status',
        data: <String, dynamic>{
          'status': BookingStatus.inProgress.value,
          'note': 'Check-in: ${event.checkInPhotoUrl}',
          'latitude': pos.latitude,
          'longitude': pos.longitude,
        },
      );
      final booking = _mergeBooking(
        res.data,
        event.bookingId,
        BookingStatus.inProgress.value,
      );
      emit(WorkOrderActiveState(
        bookingId: event.bookingId,
        status: BookingStatus.inProgress,
        booking: booking,
      ));
    } on DioException catch (e) {
      _emitError(
        emit,
        error: _extractErrorMessage(e),
        fallbackBookingId: event.bookingId,
      );
    } catch (e) {
      _emitError(
        emit,
        error: _extractErrorMessage(e),
        fallbackBookingId: event.bookingId,
      );
    }
  }

  Future<void> _onSubmitCompletionProof(
    SubmitCompletionProofEvent event,
    Emitter<WorkOrderState> emit,
  ) async {
    if (state is WorkOrderActiveState) {
      final active = state as WorkOrderActiveState;
      if (active.isUpdating) return;
      emit(active.copyWith(isUpdating: true));
    }
    try {
      final res = await dioClient.dio.patch<dynamic>(
        '/bookings/${event.bookingId}/status',
        data: <String, dynamic>{
          'status': BookingStatus.pendingAcceptance.value,
          'proofPhotos': event.proofPhotos,
        },
      );
      final booking = _mergeBooking(
        res.data,
        event.bookingId,
        BookingStatus.pendingAcceptance.value,
      );
      emit(WorkOrderActiveState(
        bookingId: event.bookingId,
        status: BookingStatus.pendingAcceptance,
        booking: booking,
      ));
    } on DioException catch (e) {
      _emitError(
        emit,
        error: _extractErrorMessage(e),
        fallbackBookingId: event.bookingId,
      );
    } catch (e) {
      _emitError(
        emit,
        error: _extractErrorMessage(e),
        fallbackBookingId: event.bookingId,
      );
    }
  }

  Future<void> _onConfirmCashPayment(
    ConfirmCashPaymentEvent event,
    Emitter<WorkOrderState> emit,
  ) async {
    if (state is WorkOrderCompletedState ||
        (state is WorkOrderActiveState &&
            (state as WorkOrderActiveState).isUpdating)) {
      return;
    }
    if (state is WorkOrderActiveState) {
      emit((state as WorkOrderActiveState).copyWith(isUpdating: true));
    }
    try {
      final res = await dioClient.dio.post<dynamic>(
        '/bookings/${event.bookingId}/record-cash-payment',
        data: <String, dynamic>{
          'amount': event.amount,
          'deductCommission': true,
        },
      );
      final settlementData = res.data is Map<String, dynamic>
          ? res.data as Map<String, dynamic>
          : (res.data is Map
              ? Map<String, dynamic>.from(res.data as Map)
              : <String, dynamic>{});
      emit(WorkOrderCompletedState(
        bookingId: event.bookingId,
        amountCollected: event.amount,
        settlementData: settlementData,
      ));
    } on DioException catch (e) {
      _emitError(
        emit,
        error: _extractErrorMessage(e),
        fallbackBookingId: event.bookingId,
      );
    } catch (e) {
      _emitError(
        emit,
        error: _extractErrorMessage(e),
        fallbackBookingId: event.bookingId,
      );
    }
  }

  void _emitError(
    Emitter<WorkOrderState> emit, {
    required String error,
    String? fallbackBookingId,
  }) {
    final current = state;
    String? bookingId = fallbackBookingId;
    Map<String, dynamic>? booking;
    BookingStatus? previousStatus;

    if (current is WorkOrderActiveState) {
      bookingId = current.bookingId;
      booking = current.booking;
      previousStatus = current.status;
    } else if (current is WorkOrderErrorState) {
      bookingId = current.bookingId ?? fallbackBookingId;
      booking = current.booking;
      previousStatus = current.previousStatus;
    }

    emit(WorkOrderErrorState(
      error: error,
      bookingId: bookingId,
      booking: booking,
      previousStatus: previousStatus,
    ));
  }

  Map<String, dynamic> _parseBooking(dynamic data, String bookingId) {
    if (data is Map) {
      final Map<dynamic, dynamic> map = data;
      final dynamic nested = map['booking'] ?? map['data'];
      if (nested is Map) {
        return Map<String, dynamic>.from(nested);
      }
      return Map<String, dynamic>.from(map);
    }
    return <String, dynamic>{'id': bookingId};
  }

  Map<String, dynamic> _mergeBooking(
    dynamic data,
    String bookingId,
    String newStatus,
  ) {
    Map<String, dynamic> base = <String, dynamic>{};
    if (state is WorkOrderActiveState) {
      base = Map<String, dynamic>.from((state as WorkOrderActiveState).booking);
    }
    if (data is Map) {
      final Map<dynamic, dynamic> map = data;
      final dynamic nested = map['booking'] ?? map['data'];
      if (nested is Map) {
        base.addAll(Map<String, dynamic>.from(nested));
      } else {
        base.addAll(Map<String, dynamic>.from(map));
      }
    }
    base['id'] = base['id'] ?? bookingId;
    base['status'] = newStatus;
    return base;
  }

  String _extractErrorMessage(Object e) {
    if (e is LocationServiceDisabledException) {
      return 'Vui lòng bật định vị GPS để điểm danh hiện trường';
    }
    if (e is PermissionDeniedException) {
      return 'Ứng dụng chưa được cấp quyền vị trí';
    }
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map) {
        final msg = data['message'] ?? data['error'];
        if (msg is List) {
          return msg.join(', ');
        }
        if (msg != null) return msg.toString();
      }
      if (e.message != null && e.message!.isNotEmpty) {
        return e.message!;
      }
      return 'Lỗi kết nối máy chủ';
    }
    final str = e.toString();
    final lower = str.toLowerCase();
    if (lower.contains('location') && lower.contains('disabled') ||
        lower.contains('dịch vụ định vị gps bị tắt') ||
        lower.contains('gps bị tắt') ||
        lower.contains('định vị gps')) {
      return 'Vui lòng bật định vị GPS để điểm danh hiện trường';
    }
    if (lower.contains('permission') && lower.contains('denied') ||
        lower.contains('quyền vị trí') ||
        lower.contains('chưa được cấp quyền')) {
      return 'Ứng dụng chưa được cấp quyền vị trí';
    }
    return str;
  }
}
