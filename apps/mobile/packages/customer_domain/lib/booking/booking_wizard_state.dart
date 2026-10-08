import 'package:equatable/equatable.dart';
import 'package:linkkwork_core/models/enums.dart';

const Object _sentinel = Object();

/// State representation for the multi-step customer booking wizard.
class BookingWizardState extends Equatable {
  /// Wizard step:
  /// 1: Select Service & Options
  /// 2: Address & Location
  /// 3: Schedule & Payment
  /// 4: Confirmation & Completion
  final int step;

  final String? serviceId;
  final String? serviceName;
  final double units;
  final List<String> addonIds;
  final double estimatedTotal;

  final String? address;
  final double? lat;
  final double? lng;

  final DateTime? scheduledAt;
  final PaymentMethod paymentMethod;
  final String? notes;

  final bool isSubmitting;
  final bool isCalculatingPrice;

  final String? createdBookingId;
  final Map<String, dynamic>? createdBooking;
  final String? error;

  const BookingWizardState({
    this.step = 1,
    this.serviceId,
    this.serviceName,
    this.units = 1.0,
    this.addonIds = const [],
    this.estimatedTotal = 0.0,
    this.address,
    this.lat,
    this.lng,
    this.scheduledAt,
    this.paymentMethod = PaymentMethod.cash,
    this.notes,
    this.isSubmitting = false,
    this.isCalculatingPrice = false,
    this.createdBookingId,
    this.createdBooking,
    this.error,
  });

  BookingWizardState copyWith({
    int? step,
    String? serviceId,
    String? serviceName,
    double? units,
    List<String>? addonIds,
    double? estimatedTotal,
    String? address,
    double? lat,
    double? lng,
    DateTime? scheduledAt,
    PaymentMethod? paymentMethod,
    String? notes,
    bool? isSubmitting,
    bool? isCalculatingPrice,
    String? createdBookingId,
    Map<String, dynamic>? createdBooking,
    Object? error = _sentinel,
  }) {
    return BookingWizardState(
      step: step ?? this.step,
      serviceId: serviceId ?? this.serviceId,
      serviceName: serviceName ?? this.serviceName,
      units: units ?? this.units,
      addonIds: addonIds ?? this.addonIds,
      estimatedTotal: estimatedTotal ?? this.estimatedTotal,
      address: address ?? this.address,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      scheduledAt: scheduledAt ?? this.scheduledAt,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      notes: notes ?? this.notes,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      isCalculatingPrice: isCalculatingPrice ?? this.isCalculatingPrice,
      createdBookingId: createdBookingId ?? this.createdBookingId,
      createdBooking: createdBooking ?? this.createdBooking,
      error: identical(error, _sentinel) ? this.error : (error as String?),
    );
  }

  @override
  List<Object?> get props => [
        step,
        serviceId,
        serviceName,
        units,
        addonIds,
        estimatedTotal,
        address,
        lat,
        lng,
        scheduledAt,
        paymentMethod,
        notes,
        isSubmitting,
        isCalculatingPrice,
        createdBookingId,
        createdBooking,
        error,
      ];
}
