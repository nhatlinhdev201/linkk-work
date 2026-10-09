import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:linkkwork_core/network/api_endpoints.dart';
import 'package:linkkwork_core/network/dio_client.dart';

import 'booking_wizard_event.dart';
import 'booking_wizard_state.dart';

/// BLoC managing the customer 4-step booking wizard workflow.
class BookingWizardBloc extends Bloc<BookingWizardEvent, BookingWizardState> {
  final DioClient dioClient;

  BookingWizardBloc({required this.dioClient})
      : super(const BookingWizardState()) {
    on<SelectServiceEvent>(_onSelectService);
    on<CalculateDynamicPriceEvent>(_onCalculateDynamicPrice);
    on<SetBookingAddressEvent>(_onSetBookingAddress);
    on<SetBookingScheduleAndPaymentEvent>(_onSetBookingScheduleAndPayment);
    on<SubmitBookingEvent>(_onSubmitBooking);
    on<GoToStepEvent>(_onGoToStep);
    on<ResetBookingWizardEvent>(_onResetBookingWizard);
  }

  Future<void> _onSelectService(
    SelectServiceEvent event,
    Emitter<BookingWizardState> emit,
  ) async {
    emit(state.copyWith(
      serviceId: event.serviceId,
      serviceName: event.serviceName,
      baseUnitPrice: event.baseUnitPrice ?? event.basePrice,
      pricingType: event.pricingType,
      estimatedTotal: event.basePrice,
      step: 1,
      error: null,
    ));
  }

  Future<void> _onCalculateDynamicPrice(
    CalculateDynamicPriceEvent event,
    Emitter<BookingWizardState> emit,
  ) async {
    emit(state.copyWith(
      isCalculatingPrice: true,
      error: null,
    ));

    final pType = event.pricingType ?? state.pricingType;
    final bPrice = event.baseUnitPrice ??
        (state.baseUnitPrice > 0 ? state.baseUnitPrice : state.estimatedTotal);
    final payload = <String, dynamic>{
      'pricingType': pType,
      'baseUnitPrice': bPrice > 0 ? bPrice : 80000.0,
      if (pType == 'HOURLY') 'durationHours': event.units,
      if (pType != 'HOURLY') 'unitCount': event.units.toInt(),
      if (event.addonsPrice != null) 'addonsPrice': event.addonsPrice,
    };

    try {
      final response = await dioClient.dio.post<dynamic>(
        ApiEndpoints.calculatePrice,
        data: payload,
      );

      double finalPrice = 0.0;
      final dynamic data = response.data;
      if (data is Map) {
        final dynamic raw = data['finalPrice'] ??
            data['finalTotal'] ??
            data['total'] ??
            data['price'] ??
            0;
        if (raw is num) {
          finalPrice = raw.toDouble();
        } else if (raw is String) {
          finalPrice = double.tryParse(raw) ?? 0.0;
        }
      } else if (data is num) {
        finalPrice = data.toDouble();
      }

      emit(state.copyWith(
        serviceId: event.serviceId,
        units: event.units,
        addonIds: event.addonIds,
        pricingType: pType,
        baseUnitPrice: bPrice > 0 ? bPrice : state.baseUnitPrice,
        estimatedTotal: finalPrice,
        isCalculatingPrice: false,
      ));
    } catch (e) {
      emit(state.copyWith(
        isCalculatingPrice: false,
        error: _extractErrorMessage(e, 'Không thể tính giá dịch vụ'),
      ));
    }
  }

  Future<void> _onSetBookingAddress(
    SetBookingAddressEvent event,
    Emitter<BookingWizardState> emit,
  ) async {
    emit(state.copyWith(
      address: event.address,
      lat: event.lat,
      lng: event.lng,
      step: 3,
      error: null,
    ));
  }

  Future<void> _onSetBookingScheduleAndPayment(
    SetBookingScheduleAndPaymentEvent event,
    Emitter<BookingWizardState> emit,
  ) async {
    emit(state.copyWith(
      scheduledAt: event.scheduledAt,
      paymentMethod: event.paymentMethod,
      notes: event.notes ?? state.notes,
      error: null,
    ));
  }

  Future<void> _onSubmitBooking(
    SubmitBookingEvent event,
    Emitter<BookingWizardState> emit,
  ) async {
    // Concurrency guard: ignore if already submitting or if booking was already completed
    if (state.isSubmitting || state.step == 4) return;

    emit(state.copyWith(
      isSubmitting: true,
      error: null,
    ));

    final scheduledIso =
        (state.scheduledAt ?? DateTime.now().add(const Duration(hours: 2)))
            .toIso8601String();

    final payload = <String, dynamic>{
      'serviceId': state.serviceId,
      'customerName': event.customerName,
      'customerPhone': event.customerPhone,
      'addressText': state.address ?? '', // MANDATORY for CreateBookingDto
      'address': state.address ?? '',
      'paymentMethod': state.paymentMethod.value,
      'scheduledAt': scheduledIso,
      'note': event.notes ?? state.notes, // CreateBookingDto uses 'note'
      'notes': event.notes ?? state.notes,
      if (state.addonIds.isNotEmpty) 'addonIds': state.addonIds,
      if (state.pricingType == 'HOURLY') 'durationHours': state.units,
      if (state.pricingType != 'HOURLY') 'unitCount': state.units.toInt(),
      if (state.lat != null) 'latitude': state.lat,
      if (state.lng != null) 'longitude': state.lng,
    };

    try {
      final res = await dioClient.dio.post<dynamic>(
        ApiEndpoints.bookings,
        data: payload,
      );

      final dynamic responseData = res.data;
      final Map<String, dynamic> bookingData;
      if (responseData is Map<String, dynamic>) {
        bookingData = responseData;
      } else if (responseData is Map) {
        bookingData = Map<String, dynamic>.from(responseData);
      } else {
        bookingData = <String, dynamic>{};
      }

      final id = (bookingData['id'] ?? bookingData['bookingId'])?.toString();

      emit(state.copyWith(
        isSubmitting: false,
        createdBookingId: id,
        createdBooking: bookingData,
        step: 4,
      ));
    } catch (e) {
      emit(state.copyWith(
        isSubmitting: false,
        error: _extractErrorMessage(e, 'Không thể đặt lịch dịch vụ'),
      ));
    }
  }

  void _onGoToStep(
    GoToStepEvent event,
    Emitter<BookingWizardState> emit,
  ) {
    if (event.step >= 1 && event.step <= 4) {
      emit(state.copyWith(step: event.step));
    }
  }

  Future<void> _onResetBookingWizard(
    ResetBookingWizardEvent event,
    Emitter<BookingWizardState> emit,
  ) async {
    emit(const BookingWizardState());
  }

  String _extractErrorMessage(Object error,
      [String fallback = 'Đã có lỗi xảy ra']) {
    if (error is DioException) {
      final dynamic errData = error.response?.data;
      if (errData is Map && errData['message'] != null) {
        final dynamic msg = errData['message'];
        if (msg is List) {
          return msg.map((dynamic m) => m.toString()).join(', ');
        }
        return msg.toString();
      }
      if (error.message != null && error.message!.isNotEmpty) {
        return error.message!;
      }
    }
    return fallback;
  }
}
