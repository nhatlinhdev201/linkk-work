import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:linkkwork_core/linkkwork_core.dart';
import 'package:mocktail/mocktail.dart';

class MockFlutterSecureStorage extends Mock implements FlutterSecureStorage {}

/// A custom HttpClientAdapter for deterministic unit testing of Dio requests and interceptors.
class FakeHttpClientAdapter implements HttpClientAdapter {
  final Future<ResponseBody> Function(RequestOptions options) handler;

  FakeHttpClientAdapter(this.handler);

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) {
    return handler(options);
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  setUpAll(() {
    registerFallbackValue(const Duration());
  });

  group('ApiEndpoints Constants', () {
    test('ApiEndpoints paths match API contracts', () {
      expect(ApiEndpoints.login, equals('/auth/login'));
      expect(ApiEndpoints.refreshToken, equals('/auth/refresh-token'));
      expect(ApiEndpoints.me, equals('/auth/me'));
      expect(ApiEndpoints.categories, equals('/catalog/categories'));
      expect(ApiEndpoints.services, equals('/catalog/services'));
      expect(ApiEndpoints.calculatePrice, equals('/catalog/calculate-price'));
      expect(ApiEndpoints.bookings, equals('/bookings'));
      expect(ApiEndpoints.transactions, equals('/finance/transactions'));
      expect(ApiEndpoints.summary, equals('/finance/summary'));
    });
  });

  group('SecureStorageService Tests', () {
    late MockFlutterSecureStorage mockStorage;
    late SecureStorageService storageService;

    setUp(() {
      mockStorage = MockFlutterSecureStorage();
      storageService = SecureStorageService(storage: mockStorage);
    });

    test('saveTokens writes accessToken and refreshToken to secure storage',
        () async {
      when(
        () => mockStorage.write(
          key: any(named: 'key'),
          value: any(named: 'value'),
        ),
      ).thenAnswer((_) async {});

      await storageService.saveTokens(
        accessToken: 'mock_access',
        refreshToken: 'mock_refresh',
      );

      verify(() => mockStorage.write(key: 'access_token', value: 'mock_access'))
          .called(1);
      verify(() =>
              mockStorage.write(key: 'refresh_token', value: 'mock_refresh'))
          .called(1);
    });

    test('getAccessToken and getRefreshToken read keys', () async {
      when(() => mockStorage.read(key: 'access_token'))
          .thenAnswer((_) async => 'acc_123');
      when(() => mockStorage.read(key: 'refresh_token'))
          .thenAnswer((_) async => 'ref_123');

      final access = await storageService.getAccessToken();
      final refresh = await storageService.getRefreshToken();

      expect(access, equals('acc_123'));
      expect(refresh, equals('ref_123'));
    });

    test('saveTenantId and getTenantId operate correctly', () async {
      when(
        () => mockStorage.write(
          key: 'tenant_id',
          value: 'tenant_abc',
        ),
      ).thenAnswer((_) async {});
      when(() => mockStorage.read(key: 'tenant_id'))
          .thenAnswer((_) async => 'tenant_abc');

      await storageService.saveTenantId('tenant_abc');
      final tenantId = await storageService.getTenantId();

      verify(() => mockStorage.write(key: 'tenant_id', value: 'tenant_abc'))
          .called(1);
      expect(tenantId, equals('tenant_abc'));
    });

    test(
        'saveUserProfile saves tenantId when present and deletes when null or empty',
        () async {
      when(
        () => mockStorage.write(
          key: any(named: 'key'),
          value: any(named: 'value'),
        ),
      ).thenAnswer((_) async {});
      when(() => mockStorage.delete(key: any(named: 'key')))
          .thenAnswer((_) async {});

      const profileWithTenant = UserProfile(
        id: 'usr_99',
        email: 'test@linkk.vn',
        phone: '0909090909',
        name: 'Nguyen Van A',
        role: UserRole.tasker,
        tenantId: 'tenant_99',
        avatarUrl: null,
      );

      await storageService.saveUserProfile(profileWithTenant);
      verify(() => mockStorage.write(key: 'tenant_id', value: 'tenant_99'))
          .called(1);

      const profileWithoutTenant = UserProfile(
        id: 'usr_99',
        email: 'test@linkk.vn',
        phone: '0909090909',
        name: 'Nguyen Van A',
        role: UserRole.tasker,
        tenantId: null,
        avatarUrl: null,
      );

      await storageService.saveUserProfile(profileWithoutTenant);
      verify(() => mockStorage.delete(key: 'tenant_id')).called(1);
    });

    test(
        'saveUserProfile and getUserProfile serialize and deserialize correctly',
        () async {
      const profile = UserProfile(
        id: 'usr_99',
        email: 'test@linkk.vn',
        phone: '0909090909',
        name: 'Nguyen Van A',
        role: UserRole.tasker,
        tenantId: 'tenant_99',
        avatarUrl: 'https://cdn.linkk.vn/avatar.png',
      );

      when(
        () => mockStorage.write(
          key: any(named: 'key'),
          value: any(named: 'value'),
        ),
      ).thenAnswer((_) async {});

      await storageService.saveUserProfile(profile);

      verify(() => mockStorage.write(
          key: 'user_profile', value: jsonEncode(profile.toJson()))).called(1);
      verify(() => mockStorage.write(key: 'user_id', value: 'usr_99'))
          .called(1);

      when(() => mockStorage.read(key: 'user_profile'))
          .thenAnswer((_) async => jsonEncode(profile.toJson()));

      final loaded = await storageService.getUserProfile();
      expect(loaded, equals(profile));
    });

    test(
        'getUserProfile returns null when storage has no profile or invalid json',
        () async {
      when(() => mockStorage.read(key: 'user_profile'))
          .thenAnswer((_) async => null);
      final empty = await storageService.getUserProfile();
      expect(empty, isNull);

      when(() => mockStorage.read(key: 'user_profile'))
          .thenAnswer((_) async => 'invalid-json');
      final invalid = await storageService.getUserProfile();
      expect(invalid, isNull);
    });

    test('clearAll calls deleteAll on storage', () async {
      when(() => mockStorage.deleteAll()).thenAnswer((_) async {});

      await storageService.clearAll();

      verify(() => mockStorage.deleteAll()).called(1);
    });
  });

  group('DioClient Tests', () {
    late MockFlutterSecureStorage mockStorage;
    late SecureStorageService storageService;

    setUp(() {
      mockStorage = MockFlutterSecureStorage();
      storageService = SecureStorageService(storage: mockStorage);
    });

    test('DioClient initializes with expected timeouts and headers', () {
      final client = DioClient(
        baseUrl: 'https://api.linkk.vn',
        storage: storageService,
      );

      expect(client.dio.options.baseUrl, equals('https://api.linkk.vn'));
      expect(client.dio.options.connectTimeout,
          equals(const Duration(seconds: 10)));
      expect(client.dio.options.receiveTimeout,
          equals(const Duration(seconds: 10)));
    });

    test('onRequest adds Authorization and x-tenant-id headers when present',
        () async {
      when(() => mockStorage.read(key: 'access_token'))
          .thenAnswer((_) async => 'jwt_token_123');
      when(() => mockStorage.read(key: 'tenant_id'))
          .thenAnswer((_) async => 'tenant_test');

      RequestOptions? capturedOptions;
      final adapter = FakeHttpClientAdapter((options) async {
        capturedOptions = options;
        return ResponseBody.fromString(
          jsonEncode({'success': true}),
          200,
          headers: {
            'content-type': ['application/json'],
          },
        );
      });

      final dio = Dio(BaseOptions(baseUrl: 'https://api.linkk.vn'));
      dio.httpClientAdapter = adapter;

      final client = DioClient(
        baseUrl: 'https://api.linkk.vn',
        storage: storageService,
        customDio: dio,
      );

      final response =
          await client.dio.get<Map<String, dynamic>>('/catalog/services');

      expect(response.statusCode, equals(200));
      expect(capturedOptions, isNotNull);
      expect(capturedOptions!.headers['Authorization'],
          equals('Bearer jwt_token_123'));
      expect(capturedOptions!.headers['x-tenant-id'], equals('tenant_test'));
    });

    test('onError refreshes token and retries request on 401', () async {
      when(() => mockStorage.read(key: 'access_token'))
          .thenAnswer((_) async => 'expired_token');
      when(() => mockStorage.read(key: 'refresh_token'))
          .thenAnswer((_) async => 'valid_refresh_token');
      when(() => mockStorage.read(key: 'tenant_id'))
          .thenAnswer((_) async => null);
      when(() => mockStorage.write(
          key: any(named: 'key'),
          value: any(named: 'value'))).thenAnswer((_) async {});

      var callCount = 0;
      final adapter = FakeHttpClientAdapter((options) async {
        callCount++;
        // 1st call: GET /bookings fails with 401
        if (callCount == 1) {
          expect(options.path, equals('/bookings'));
          return ResponseBody.fromString(
            jsonEncode({'message': 'Unauthorized'}),
            401,
            headers: {
              'content-type': ['application/json']
            },
          );
        }

        // 2nd call: POST /auth/refresh-token succeeds
        if (callCount == 2) {
          expect(options.path, equals('/auth/refresh-token'));
          return ResponseBody.fromString(
            jsonEncode({
              'accessToken': 'new_refreshed_access_token',
              'refreshToken': 'new_refreshed_refresh_token',
            }),
            200,
            headers: {
              'content-type': ['application/json']
            },
          );
        }

        // 3rd call: retried GET /bookings succeeds with new token and retry guard
        if (callCount == 3) {
          expect(options.path, equals('/bookings'));
          expect(options.extra['is_retry'], isTrue);
          expect(options.headers['Authorization'],
              equals('Bearer new_refreshed_access_token'));
          return ResponseBody.fromString(
            jsonEncode({'bookings': <dynamic>[]}),
            200,
            headers: {
              'content-type': ['application/json']
            },
          );
        }

        throw Exception('Unexpected call');
      });

      final dio = Dio(BaseOptions(baseUrl: 'https://api.linkk.vn'));
      dio.httpClientAdapter = adapter;

      final client = DioClient(
        baseUrl: 'https://api.linkk.vn',
        storage: storageService,
        customDio: dio,
      );

      final response = await client.dio.get<Map<String, dynamic>>('/bookings');

      expect(callCount, equals(3));
      expect(response.statusCode, equals(200));
      expect(response.data!['bookings'], isNotNull);

      verify(() => mockStorage.write(
          key: 'access_token', value: 'new_refreshed_access_token')).called(1);
      verify(() => mockStorage.write(
          key: 'refresh_token',
          value: 'new_refreshed_refresh_token')).called(1);
    });

    test('onError calls clearAll when refresh request fails', () async {
      when(() => mockStorage.read(key: 'access_token'))
          .thenAnswer((_) async => 'expired_token');
      when(() => mockStorage.read(key: 'refresh_token'))
          .thenAnswer((_) async => 'invalid_refresh_token');
      when(() => mockStorage.read(key: 'tenant_id'))
          .thenAnswer((_) async => null);
      when(() => mockStorage.deleteAll()).thenAnswer((_) async {});

      var callCount = 0;
      final adapter = FakeHttpClientAdapter((options) async {
        callCount++;
        // 1st call: GET /bookings fails with 401
        if (callCount == 1) {
          return ResponseBody.fromString(
            jsonEncode({'message': 'Unauthorized'}),
            401,
            headers: {
              'content-type': ['application/json']
            },
          );
        }

        // 2nd call: POST /auth/refresh-token fails with 401
        if (callCount == 2) {
          return ResponseBody.fromString(
            jsonEncode({'message': 'Refresh token expired'}),
            401,
            headers: {
              'content-type': ['application/json']
            },
          );
        }

        throw Exception('Unexpected call');
      });

      final dio = Dio(BaseOptions(baseUrl: 'https://api.linkk.vn'));
      dio.httpClientAdapter = adapter;

      final client = DioClient(
        baseUrl: 'https://api.linkk.vn',
        storage: storageService,
        customDio: dio,
      );

      expect(
        () async => client.dio.get<Map<String, dynamic>>('/bookings'),
        throwsA(isA<DioException>()),
      );

      await pumpEventQueue();

      verify(() => mockStorage.deleteAll()).called(1);
    });

    test('500 server error on retried request does NOT call storage.clearAll',
        () async {
      when(() => mockStorage.read(key: 'access_token'))
          .thenAnswer((_) async => 'expired_token');
      when(() => mockStorage.read(key: 'refresh_token'))
          .thenAnswer((_) async => 'valid_refresh_token');
      when(() => mockStorage.read(key: 'tenant_id'))
          .thenAnswer((_) async => null);
      when(() => mockStorage.write(
          key: any(named: 'key'),
          value: any(named: 'value'))).thenAnswer((_) async {});
      when(() => mockStorage.deleteAll()).thenAnswer((_) async {});

      var callCount = 0;
      final adapter = FakeHttpClientAdapter((options) async {
        callCount++;
        // 1st call: GET /bookings fails with 401
        if (callCount == 1) {
          return ResponseBody.fromString(
            jsonEncode({'message': 'Unauthorized'}),
            401,
            headers: {
              'content-type': ['application/json']
            },
          );
        }

        // 2nd call: POST /auth/refresh-token succeeds
        if (callCount == 2) {
          return ResponseBody.fromString(
            jsonEncode({
              'accessToken': 'new_access_token',
              'refreshToken': 'new_refresh_token',
            }),
            200,
            headers: {
              'content-type': ['application/json']
            },
          );
        }

        // 3rd call: retried GET /bookings fails with 500 internal server error
        if (callCount == 3) {
          return ResponseBody.fromString(
            jsonEncode({'message': 'Internal Server Error'}),
            500,
            headers: {
              'content-type': ['application/json']
            },
          );
        }

        throw Exception('Unexpected call');
      });

      final dio = Dio(BaseOptions(baseUrl: 'https://api.linkk.vn'));
      dio.httpClientAdapter = adapter;

      final client = DioClient(
        baseUrl: 'https://api.linkk.vn',
        storage: storageService,
        customDio: dio,
      );

      expect(
        () async => client.dio.get<Map<String, dynamic>>('/bookings'),
        throwsA(
          isA<DioException>()
              .having((e) => e.response?.statusCode, 'statusCode', 500),
        ),
      );

      await pumpEventQueue();

      // Session must NOT be wiped when server has a 500 error!
      verifyNever(() => mockStorage.deleteAll());
    });

    test(
        'concurrent 401 requests share a single refresh call and both retry successfully',
        () async {
      when(() => mockStorage.read(key: 'access_token'))
          .thenAnswer((_) async => 'expired_token');
      when(() => mockStorage.read(key: 'refresh_token'))
          .thenAnswer((_) async => 'valid_refresh_token');
      when(() => mockStorage.read(key: 'tenant_id'))
          .thenAnswer((_) async => null);
      when(() => mockStorage.write(
          key: any(named: 'key'),
          value: any(named: 'value'))).thenAnswer((_) async {});

      var refreshCallCount = 0;
      final adapter = FakeHttpClientAdapter((options) async {
        final path = options.path;

        if (path == '/auth/refresh-token') {
          refreshCallCount++;
          return ResponseBody.fromString(
            jsonEncode({
              'accessToken': 'shared_new_access_token',
              'refreshToken': 'shared_new_refresh_token',
            }),
            200,
            headers: {
              'content-type': ['application/json']
            },
          );
        }

        // Initial calls with expired token return 401
        if (options.headers['Authorization'] !=
            'Bearer shared_new_access_token') {
          return ResponseBody.fromString(
            jsonEncode({'message': 'Unauthorized'}),
            401,
            headers: {
              'content-type': ['application/json']
            },
          );
        }

        // Retried calls with new token succeed
        return ResponseBody.fromString(
          jsonEncode({'path': path, 'success': true}),
          200,
          headers: {
            'content-type': ['application/json']
          },
        );
      });

      final dio = Dio(BaseOptions(baseUrl: 'https://api.linkk.vn'));
      dio.httpClientAdapter = adapter;

      final client = DioClient(
        baseUrl: 'https://api.linkk.vn',
        storage: storageService,
        customDio: dio,
      );

      // Execute two requests concurrently
      final responses = await Future.wait([
        client.dio.get<Map<String, dynamic>>('/bookings'),
        client.dio.get<Map<String, dynamic>>('/finance/summary'),
      ]);

      expect(responses[0].statusCode, equals(200));
      expect(responses[1].statusCode, equals(200));

      // Refresh must only have been invoked ONCE across both concurrent requests
      expect(refreshCallCount, equals(1));
    });

    test(
        'onError does not loop infinitely if /auth/refresh-token itself returns 401',
        () async {
      when(() => mockStorage.read(key: 'access_token'))
          .thenAnswer((_) async => 'token');
      when(() => mockStorage.read(key: 'refresh_token'))
          .thenAnswer((_) async => 'refresh');
      when(() => mockStorage.read(key: 'tenant_id'))
          .thenAnswer((_) async => null);
      when(() => mockStorage.deleteAll()).thenAnswer((_) async {});

      var refreshCallCount = 0;
      final adapter = FakeHttpClientAdapter((options) async {
        if (options.path.contains('/auth/refresh-token')) {
          refreshCallCount++;
          return ResponseBody.fromString(
            jsonEncode({'message': 'Unauthorized'}),
            401,
            headers: {
              'content-type': ['application/json']
            },
          );
        }
        throw Exception('Unexpected call');
      });

      final dio = Dio(BaseOptions(baseUrl: 'https://api.linkk.vn'));
      dio.httpClientAdapter = adapter;

      final client = DioClient(
        baseUrl: 'https://api.linkk.vn',
        storage: storageService,
        customDio: dio,
      );

      expect(
        () async => client.dio.post<Map<String, dynamic>>(
          '/auth/refresh-token',
          data: {'refreshToken': 'refresh'},
        ),
        throwsA(isA<DioException>()),
      );

      await pumpEventQueue();

      expect(refreshCallCount, equals(1));
    });
  });
}
