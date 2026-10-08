class ApiEndpoints {
  const ApiEndpoints._();

  static const String login = '/auth/login';
  static const String refreshToken = '/auth/refresh-token';
  static const String me = '/auth/me';
  static const String categories = '/catalog/categories';
  static const String services = '/catalog/services';
  static const String calculatePrice = '/catalog/calculate-price';
  static const String bookings = '/bookings';
  static const String transactions = '/finance/transactions';
  static const String summary = '/finance/summary';
}
