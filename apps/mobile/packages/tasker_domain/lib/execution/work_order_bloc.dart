import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
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
      emit(WorkOrderErrorState(error: _extractErrorMessage(e)));
    } catch (e) {
      emit(WorkOrderErrorState(error: e.toString()));
    }
  }

  Future<void> _onStartTraveling(
    StartTravelingEvent event,
    Emitter<WorkOrderState> emit,
  ) async {
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
      emit(WorkOrderErrorState(error: _extractErrorMessage(e)));
    } catch (e) {
      emit(WorkOrderErrorState(error: e.toString()));
    }
  }

  Future<void> _onCheckInArrival(
    CheckInArrivalEvent event,
    Emitter<WorkOrderState> emit,
  ) async {
    try {
      final pos = await locationService.getCurrentPosition();

      // Anti-Fraud check: detect spoofed/mock GPS
      if (locationService.isMockLocation(pos)) {
        emit(const WorkOrderErrorState(
          error:
              'Phát hiện vị trí giả lập (Mock GPS). Vui lòng tắt ứng dụng giả lập GPS để tiếp tục!',
        ));
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
      emit(WorkOrderErrorState(error: _extractErrorMessage(e)));
    } catch (e) {
      emit(WorkOrderErrorState(error: e.toString()));
    }
  }

  Future<void> _onSubmitCompletionProof(
    SubmitCompletionProofEvent event,
    Emitter<WorkOrderState> emit,
  ) async {
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
      emit(WorkOrderErrorState(error: _extractErrorMessage(e)));
    } catch (e) {
      emit(WorkOrderErrorState(error: e.toString()));
    }
  }

  Future<void> _onConfirmCashPayment(
    ConfirmCashPaymentEvent event,
    Emitter<WorkOrderState> emit,
  ) async {
    try {
      await dioClient.dio.post<dynamic>(
        '/bookings/${event.bookingId}/record-cash-payment',
        data: <String, dynamic>{
          'amount': event.amount,
          'deductCommission': true,
        },
      );
      emit(WorkOrderCompletedState(
        bookingId: event.bookingId,
        amountCollected: event.amount,
      ));
    } on DioException catch (e) {
      emit(WorkOrderErrorState(error: _extractErrorMessage(e)));
    } catch (e) {
      emit(WorkOrderErrorState(error: e.toString()));
    }
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

  String _extractErrorMessage(dynamic e) {
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
    }
    return e.toString();
  }
}
