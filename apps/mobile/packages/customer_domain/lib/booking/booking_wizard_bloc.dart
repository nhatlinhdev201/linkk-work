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
    on<ResetBookingWizardEvent>(_onResetBookingWizard);
  }

  Future<void> _onSelectService(
    SelectServiceEvent event,
    Emitter<BookingWizardState> emit,
  ) async {
    emit(state.copyWith(
      serviceId: event.serviceId,
      serviceName: event.serviceName,
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

    try {
      final response = await dioClient.dio.post<dynamic>(
        ApiEndpoints.calculatePrice,
        data: <String, dynamic>{
          'serviceId': event.serviceId,
          'durationHours': event.units,
          'addonIds': event.addonIds,
        },
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
        estimatedTotal: finalPrice,
        isCalculatingPrice: false,
      ));
    } catch (_) {
      emit(state.copyWith(
        isCalculatingPrice: false,
        error: 'Không thể tính giá dịch vụ',
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
      'address': state.address,
      'paymentMethod': state.paymentMethod.value,
      'scheduledAt': scheduledIso,
      'notes': event.notes ?? state.notes,
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
      var errorMsg = 'Không thể đặt lịch dịch vụ';
      if (e is DioException) {
        final dynamic errData = e.response?.data;
        if (errData is Map && errData['message'] != null) {
          final dynamic msg = errData['message'];
          if (msg is List) {
            errorMsg = msg.map((dynamic m) => m.toString()).join(', ');
          } else {
            errorMsg = msg.toString();
          }
        } else if (e.message != null && e.message!.isNotEmpty) {
          errorMsg = e.message!;
        }
      } else {
        errorMsg = e.toString();
      }

      emit(state.copyWith(
        isSubmitting: false,
        error: errorMsg,
      ));
    }
  }

  Future<void> _onResetBookingWizard(
    ResetBookingWizardEvent event,
    Emitter<BookingWizardState> emit,
  ) async {
    emit(const BookingWizardState());
  }
}
