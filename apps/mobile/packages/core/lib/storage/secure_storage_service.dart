import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/user_profile.dart';

class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const _keyAccessToken = 'access_token';
  static const _keyRefreshToken = 'refresh_token';
  static const _keyUserId = 'user_id';
  static const _keyTenantId = 'tenant_id';
  static const _keyUserProfile = 'user_profile';

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: _keyAccessToken, value: accessToken);
    await _storage.write(key: _keyRefreshToken, value: refreshToken);
  }

  Future<String?> getAccessToken() => _storage.read(key: _keyAccessToken);

  Future<String?> getRefreshToken() => _storage.read(key: _keyRefreshToken);

  Future<void> saveTenantId(String tenantId) =>
      _storage.write(key: _keyTenantId, value: tenantId);

  Future<String?> getTenantId() => _storage.read(key: _keyTenantId);

  Future<void> saveUserId(String userId) =>
      _storage.write(key: _keyUserId, value: userId);

  Future<String?> getUserId() => _storage.read(key: _keyUserId);

  Future<void> saveUserProfile(UserProfile profile) async {
    final serialized = jsonEncode(profile.toJson());
    await _storage.write(key: _keyUserProfile, value: serialized);
    await _storage.write(key: _keyUserId, value: profile.id);
    if (profile.tenantId != null && profile.tenantId!.isNotEmpty) {
      await _storage.write(key: _keyTenantId, value: profile.tenantId!);
    }
  }

  Future<UserProfile?> getUserProfile() async {
    final raw = await _storage.read(key: _keyUserProfile);
    if (raw == null || raw.isEmpty) return null;
    try {
      final Object? decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) {
        return UserProfile.fromJson(decoded);
      } else if (decoded is Map) {
        final converted = decoded.map(
          (dynamic key, dynamic value) => MapEntry(key.toString(), value),
        );
        return UserProfile.fromJson(converted);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<void> clearAll() => _storage.deleteAll();
}
