import 'package:geolocator/geolocator.dart';

/// Service managing GPS permissions, location acquisition, tracking, and anti-fraud mock detection.
class LocationService {
  /// Checks location permissions and requests them if currently denied.
  ///
  /// Returns `true` if permission is granted (`always` or `whileInUse`).
  Future<bool> checkPermission() async {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    return permission == LocationPermission.always ||
        permission == LocationPermission.whileInUse;
  }

  /// Gets the current GPS position with high accuracy.
  Future<Position> getCurrentPosition() async {
    return Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
  }

  /// Inspects whether the provided GPS position was spoofed/mocked by software.
  bool isMockLocation(Position position) {
    return position.isMocked;
  }

  /// Returns a broadcast stream of device position updates.
  Stream<Position> getPositionStream({LocationSettings? settings}) {
    return Geolocator.getPositionStream(locationSettings: settings);
  }
}
