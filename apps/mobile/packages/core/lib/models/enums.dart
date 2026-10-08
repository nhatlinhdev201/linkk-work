enum BookingStatus {
  draft('DRAFT'),
  pendingDispatch('PENDING_DISPATCH'),
  broadcasting('BROADCASTING'),
  assigned('ASSIGNED'),
  arriving('ARRIVING'),
  inProgress('IN_PROGRESS'),
  pendingAcceptance('PENDING_ACCEPTANCE'),
  completed('COMPLETED'),
  cancelled('CANCELLED');

  final String value;
  const BookingStatus(this.value);

  static BookingStatus fromString(String? val) {
    if (val == null) return BookingStatus.draft;
    final normalized = val.trim().toUpperCase();
    return BookingStatus.values.firstWhere(
      (e) => e.value == normalized,
      orElse: () => BookingStatus.draft,
    );
  }
}

enum PaymentMethod {
  cash('CASH'),
  wallet('WALLET'),
  bankTransfer('BANK_TRANSFER'),
  vnpay('VNPAY'),
  vietqr('VIETQR');

  final String value;
  const PaymentMethod(this.value);

  static PaymentMethod fromString(String? val) {
    if (val == null) return PaymentMethod.cash;
    final normalized = val.trim().toUpperCase();
    return PaymentMethod.values.firstWhere(
      (e) => e.value == normalized,
      orElse: () => PaymentMethod.cash,
    );
  }
}

enum UserRole {
  customer('CUSTOMER'),
  tasker('TASKER'),
  tenantAdmin('TENANT_ADMIN'),
  superAdmin('SUPER_ADMIN');

  final String value;
  const UserRole(this.value);

  static UserRole fromString(String? val) {
    if (val == null) return UserRole.customer;
    final normalized = val.trim().toUpperCase();
    return UserRole.values.firstWhere(
      (e) => e.value == normalized,
      orElse: () => UserRole.customer,
    );
  }
}
