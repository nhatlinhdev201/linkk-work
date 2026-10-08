import 'package:flutter_test/flutter_test.dart';
import 'package:linkkwork_core/linkkwork_core.dart';

void main() {
  group('BookingStatus Enum Tests', () {
    test('All BookingStatus values match spec constants', () {
      expect(BookingStatus.draft.value, equals('DRAFT'));
      expect(BookingStatus.pendingDispatch.value, equals('PENDING_DISPATCH'));
      expect(BookingStatus.broadcasting.value, equals('BROADCASTING'));
      expect(BookingStatus.assigned.value, equals('ASSIGNED'));
      expect(BookingStatus.arriving.value, equals('ARRIVING'));
      expect(BookingStatus.inProgress.value, equals('IN_PROGRESS'));
      expect(
          BookingStatus.pendingAcceptance.value, equals('PENDING_ACCEPTANCE'));
      expect(BookingStatus.completed.value, equals('COMPLETED'));
      expect(BookingStatus.cancelled.value, equals('CANCELLED'));
    });

    test('BookingStatus.fromString parses valid strings correctly', () {
      expect(
        BookingStatus.fromString('DRAFT'),
        equals(BookingStatus.draft),
      );
      expect(
        BookingStatus.fromString('PENDING_DISPATCH'),
        equals(BookingStatus.pendingDispatch),
      );
      expect(
        BookingStatus.fromString('pending_dispatch'),
        equals(BookingStatus.pendingDispatch),
      );
      expect(
        BookingStatus.fromString('COMPLETED'),
        equals(BookingStatus.completed),
      );
    });

    test('BookingStatus.fromString falls back to draft on unknown string', () {
      expect(
        BookingStatus.fromString('UNKNOWN_STATUS'),
        equals(BookingStatus.draft),
      );
      expect(
        BookingStatus.fromString(''),
        equals(BookingStatus.draft),
      );
    });
  });

  group('PaymentMethod Enum Tests', () {
    test('All PaymentMethod values match spec constants', () {
      expect(PaymentMethod.cash.value, equals('CASH'));
      expect(PaymentMethod.wallet.value, equals('WALLET'));
      expect(PaymentMethod.bankTransfer.value, equals('BANK_TRANSFER'));
      expect(PaymentMethod.vnpay.value, equals('VNPAY'));
      expect(PaymentMethod.vietqr.value, equals('VIETQR'));
    });

    test('PaymentMethod.fromString parses valid strings correctly', () {
      expect(PaymentMethod.fromString('CASH'), equals(PaymentMethod.cash));
      expect(PaymentMethod.fromString('WALLET'), equals(PaymentMethod.wallet));
      expect(
        PaymentMethod.fromString('bank_transfer'),
        equals(PaymentMethod.bankTransfer),
      );
      expect(PaymentMethod.fromString('VIETQR'), equals(PaymentMethod.vietqr));
    });

    test('PaymentMethod.fromString falls back to cash on unknown string', () {
      expect(
        PaymentMethod.fromString('UNKNOWN_PAYMENT'),
        equals(PaymentMethod.cash),
      );
      expect(
        PaymentMethod.fromString(''),
        equals(PaymentMethod.cash),
      );
    });
  });

  group('UserRole Enum Tests', () {
    test('All UserRole values match spec constants', () {
      expect(UserRole.customer.value, equals('CUSTOMER'));
      expect(UserRole.tasker.value, equals('TASKER'));
      expect(UserRole.tenantAdmin.value, equals('TENANT_ADMIN'));
      expect(UserRole.superAdmin.value, equals('SUPER_ADMIN'));
    });

    test('UserRole.fromString parses valid strings correctly', () {
      expect(UserRole.fromString('CUSTOMER'), equals(UserRole.customer));
      expect(UserRole.fromString('TASKER'), equals(UserRole.tasker));
      expect(
        UserRole.fromString('tenant_admin'),
        equals(UserRole.tenantAdmin),
      );
      expect(
        UserRole.fromString('SUPER_ADMIN'),
        equals(UserRole.superAdmin),
      );
    });

    test('UserRole.fromString falls back to customer on unknown string', () {
      expect(
        UserRole.fromString('UNKNOWN_ROLE'),
        equals(UserRole.customer),
      );
      expect(
        UserRole.fromString(''),
        equals(UserRole.customer),
      );
    });
  });

  group('UserProfile Model Tests', () {
    test('UserProfile fromJson creates expected model', () {
      final json = <String, dynamic>{
        'id': 'usr-001',
        'email': 'alex@example.com',
        'phone': '+84901234567',
        'name': 'Alex Johnson',
        'role': 'TASKER',
        'tenantId': 'tenant-corp-1',
        'avatarUrl': 'https://example.com/avatar.png',
      };

      final profile = UserProfile.fromJson(json);

      expect(profile.id, equals('usr-001'));
      expect(profile.email, equals('alex@example.com'));
      expect(profile.phone, equals('+84901234567'));
      expect(profile.name, equals('Alex Johnson'));
      expect(profile.role, equals(UserRole.tasker));
      expect(profile.tenantId, equals('tenant-corp-1'));
      expect(profile.avatarUrl, equals('https://example.com/avatar.png'));
    });

    test('UserProfile toJson serializes correctly', () {
      const profile = UserProfile(
        id: 'usr-002',
        email: 'customer@example.com',
        phone: null,
        name: 'Jane Doe',
        role: UserRole.customer,
        tenantId: null,
        avatarUrl: null,
      );

      final json = profile.toJson();

      expect(json['id'], equals('usr-002'));
      expect(json['email'], equals('customer@example.com'));
      expect(json['phone'], isNull);
      expect(json['name'], equals('Jane Doe'));
      expect(json['role'], equals('CUSTOMER'));
      expect(json['tenantId'], isNull);
      expect(json['avatarUrl'], isNull);
    });

    test('UserProfile equality and props work as expected', () {
      const profile1 = UserProfile(
        id: 'usr-001',
        email: 'test@example.com',
        phone: '12345',
        name: 'Test',
        role: UserRole.tasker,
        tenantId: 't1',
        avatarUrl: 'https://test.com/a.jpg',
      );

      const profile2 = UserProfile(
        id: 'usr-001',
        email: 'test@example.com',
        phone: '12345',
        name: 'Test',
        role: UserRole.tasker,
        tenantId: 't1',
        avatarUrl: 'https://test.com/a.jpg',
      );

      expect(profile1, equals(profile2));
      expect(profile1.props, equals(profile2.props));
    });
  });
}
