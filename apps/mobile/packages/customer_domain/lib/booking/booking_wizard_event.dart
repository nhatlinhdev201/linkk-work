import 'package:equatable/equatable.dart';
import 'package:linkkwork_core/models/enums.dart';

/// Base event class for the 4-step booking wizard.
abstract class BookingWizardEvent extends Equatable {
  const BookingWizardEvent();

  @override
  List<Object?> get props => [];
}

/// Event selecting a primary service from catalog.
class SelectServiceEvent extends BookingWizardEvent {
  final String serviceId;
  final String serviceName;
  final double basePrice;

  const SelectServiceEvent({
    required this.serviceId,
    required this.serviceName,
    required this.basePrice,
  });

  @override
  List<Object?> get props => [serviceId, serviceName, basePrice];
}

/// Event recalculating dynamic price based on units and addons.
class CalculateDynamicPriceEvent extends BookingWizardEvent {
  final String serviceId;
  final double units;
  final List<String> addonIds;

  const CalculateDynamicPriceEvent({
    required this.serviceId,
    required this.units,
    this.addonIds = const [],
  });

  @override
  List<Object?> get props => [serviceId, units, addonIds];
}

/// Event setting service delivery address and coordinates.
class SetBookingAddressEvent extends BookingWizardEvent {
  final String address;
  final double lat;
  final double lng;

  const SetBookingAddressEvent({
    required this.address,
    required this.lat,
    required this.lng,
  });

  @override
  List<Object?> get props => [address, lat, lng];
}

/// Event configuring scheduled work time, payment method, and optional notes.
class SetBookingScheduleAndPaymentEvent extends BookingWizardEvent {
  final DateTime scheduledAt;
  final PaymentMethod paymentMethod;
  final String? notes;

  const SetBookingScheduleAndPaymentEvent({
    required this.scheduledAt,
    required this.paymentMethod,
    this.notes,
  });

  @override
  List<Object?> get props => [scheduledAt, paymentMethod, notes];
}

/// Event submitting the booking order.
class SubmitBookingEvent extends BookingWizardEvent {
  final String customerName;
  final String customerPhone;
  final String? notes;

  const SubmitBookingEvent({
    required this.customerName,
    required this.customerPhone,
    this.notes,
  });

  @override
  List<Object?> get props => [customerName, customerPhone, notes];
}

/// Event resetting the booking wizard state back to defaults.
class ResetBookingWizardEvent extends BookingWizardEvent {
  const ResetBookingWizardEvent();
}
