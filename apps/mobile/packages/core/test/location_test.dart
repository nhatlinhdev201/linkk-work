import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:linkkwork_core/location/location_service.dart';

class FakeGeolocatorPlatform extends GeolocatorPlatform {
  bool isLocationServiceEnabledResult = true;
  LocationPermission checkPermissionResult = LocationPermission.whileInUse;
  LocationPermission requestPermissionResult = LocationPermission.whileInUse;
  Position? currentPositionResult;
  Stream<Position>? positionStreamResult;
  int isLocationServiceEnabledCallCount = 0;
  int checkPermissionCallCount = 0;
  int requestPermissionCallCount = 0;
  int getCurrentPositionCallCount = 0;
  int getPositionStreamCallCount = 0;

  @override
  Future<bool> isLocationServiceEnabled() async {
    isLocationServiceEnabledCallCount++;
    return isLocationServiceEnabledResult;
  }

  @override
  Future<LocationPermission> checkPermission() async {
    checkPermissionCallCount++;
    return checkPermissionResult;
  }

  @override
  Future<LocationPermission> requestPermission() async {
    requestPermissionCallCount++;
    return requestPermissionResult;
  }

  @override
  Future<Position> getCurrentPosition({
    LocationSettings? locationSettings,
  }) async {
    getCurrentPositionCallCount++;
    return currentPositionResult!;
  }

  @override
  Stream<Position> getPositionStream({
    LocationSettings? locationSettings,
  }) {
    getPositionStreamCallCount++;
    return positionStreamResult!;
  }
}

void main() {
  group('LocationService Tests', () {
    late LocationService service;
    late FakeGeolocatorPlatform fakePlatform;

    setUp(() {
      service = LocationService();
      fakePlatform = FakeGeolocatorPlatform();
      GeolocatorPlatform.instance = fakePlatform;
    });

    test('isLocationServiceEnabled delegates to Geolocator platform', () async {
      fakePlatform.isLocationServiceEnabledResult = true;
      expect(await service.isLocationServiceEnabled(), isTrue);
      expect(fakePlatform.isLocationServiceEnabledCallCount, equals(1));

      fakePlatform.isLocationServiceEnabledResult = false;
      expect(await service.isLocationServiceEnabled(), isFalse);
      expect(fakePlatform.isLocationServiceEnabledCallCount, equals(2));
    });

    test(
        'isMockLocation returns true for mocked GPS position (anti-fraud defense)',
        () {
      final mockedPosition = Position(
        latitude: 10.762622,
        longitude: 106.660172,
        timestamp: DateTime(2026, 10, 8, 12, 0),
        accuracy: 5.0,
        altitude: 10.0,
        altitudeAccuracy: 1.0,
        heading: 0.0,
        headingAccuracy: 1.0,
        speed: 0.0,
        speedAccuracy: 0.0,
        isMocked: true,
      );

      expect(service.isMockLocation(mockedPosition), isTrue);
    });

    test('isMockLocation returns false for authentic hardware GPS position',
        () {
      final genuinePosition = Position(
        latitude: 10.762622,
        longitude: 106.660172,
        timestamp: DateTime(2026, 10, 8, 12, 0),
        accuracy: 5.0,
        altitude: 10.0,
        altitudeAccuracy: 1.0,
        heading: 0.0,
        headingAccuracy: 1.0,
        speed: 0.0,
        speedAccuracy: 0.0,
        isMocked: false,
      );

      expect(service.isMockLocation(genuinePosition), isFalse);
    });

    test('checkPermission returns true when permission is already whileInUse',
        () async {
      fakePlatform.checkPermissionResult = LocationPermission.whileInUse;

      final hasPermission = await service.checkPermission();

      expect(hasPermission, isTrue);
      expect(fakePlatform.checkPermissionCallCount, equals(1));
      expect(fakePlatform.requestPermissionCallCount, equals(0));
    });

    test('checkPermission returns true when permission is already always',
        () async {
      fakePlatform.checkPermissionResult = LocationPermission.always;

      final hasPermission = await service.checkPermission();

      expect(hasPermission, isTrue);
      expect(fakePlatform.checkPermissionCallCount, equals(1));
      expect(fakePlatform.requestPermissionCallCount, equals(0));
    });

    test(
        'checkPermission requests permission when denied and returns true on grant',
        () async {
      fakePlatform.checkPermissionResult = LocationPermission.denied;
      fakePlatform.requestPermissionResult = LocationPermission.whileInUse;

      final hasPermission = await service.checkPermission();

      expect(hasPermission, isTrue);
      expect(fakePlatform.checkPermissionCallCount, equals(1));
      expect(fakePlatform.requestPermissionCallCount, equals(1));
    });

    test(
        'checkPermission requests permission when denied and returns false on denial',
        () async {
      fakePlatform.checkPermissionResult = LocationPermission.denied;
      fakePlatform.requestPermissionResult = LocationPermission.deniedForever;

      final hasPermission = await service.checkPermission();

      expect(hasPermission, isFalse);
      expect(fakePlatform.checkPermissionCallCount, equals(1));
      expect(fakePlatform.requestPermissionCallCount, equals(1));
    });

    test('getCurrentPosition requests high accuracy position', () async {
      final expectedPosition = Position(
        latitude: 10.762622,
        longitude: 106.660172,
        timestamp: DateTime(2026, 10, 8, 12, 0),
        accuracy: 3.0,
        altitude: 10.0,
        altitudeAccuracy: 1.0,
        heading: 0.0,
        headingAccuracy: 1.0,
        speed: 0.0,
        speedAccuracy: 0.0,
        isMocked: false,
      );
      fakePlatform.currentPositionResult = expectedPosition;

      final position = await service.getCurrentPosition();

      expect(position, equals(expectedPosition));
      expect(fakePlatform.getCurrentPositionCallCount, equals(1));
    });

    test('getPositionStream forwards stream from Geolocator platform',
        () async {
      final expectedPosition = Position(
        latitude: 10.762622,
        longitude: 106.660172,
        timestamp: DateTime(2026, 10, 8, 12, 0),
        accuracy: 3.0,
        altitude: 10.0,
        altitudeAccuracy: 1.0,
        heading: 0.0,
        headingAccuracy: 1.0,
        speed: 0.0,
        speedAccuracy: 0.0,
        isMocked: false,
      );
      fakePlatform.positionStreamResult =
          Stream<Position>.value(expectedPosition);

      final stream = service.getPositionStream();
      final result = await stream.first;

      expect(result, equals(expectedPosition));
      expect(fakePlatform.getPositionStreamCallCount, equals(1));
    });
  });
}
