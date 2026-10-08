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
  final String pricingType;
  final double? baseUnitPrice;

  const SelectServiceEvent({
    required this.serviceId,
    required this.serviceName,
    required this.basePrice,
    this.pricingType = 'HOURLY',
    this.baseUnitPrice,
  });

  @override
  List<Object?> get props => [
        serviceId,
        serviceName,
        basePrice,
        pricingType,
        baseUnitPrice,
      ];
}

/// Event recalculating dynamic price based on units and addons.
class CalculateDynamicPriceEvent extends BookingWizardEvent {
  final String serviceId;
  final double units;
  final List<String> addonIds;
  final String? pricingType;
  final double? baseUnitPrice;
  final double? addonsPrice;

  const CalculateDynamicPriceEvent({
    required this.serviceId,
    required this.units,
    this.addonIds = const [],
    this.pricingType,
    this.baseUnitPrice,
    this.addonsPrice,
  });

  @override
  List<Object?> get props => [
        serviceId,
        units,
        addonIds,
        pricingType,
        baseUnitPrice,
        addonsPrice,
      ];
}

/// Event navigating to a specific step in the wizard (1, 2, 3, or 4).
class GoToStepEvent extends BookingWizardEvent {
  final int step;

  const GoToStepEvent({required this.step});

  @override
  List<Object?> get props => [step];
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
