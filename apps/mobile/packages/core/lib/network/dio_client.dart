import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';

import '../storage/secure_storage_service.dart';
import 'api_endpoints.dart';

class DioClient {
  final Dio dio;
  final Dio _refreshDio;
  final SecureStorageService storage;
  Completer<String?>? _refreshCompleter;

  DioClient({
    required String baseUrl,
    required this.storage,
    Dio? customDio,
    Dio? refreshDio,
  })  : dio = customDio ??
            Dio(
              BaseOptions(
                baseUrl: baseUrl,
                connectTimeout: const Duration(seconds: 10),
                receiveTimeout: const Duration(seconds: 10),
                headers: <String, dynamic>{'Content-Type': 'application/json'},
              ),
            ),
        _refreshDio = refreshDio ??
            Dio(
              BaseOptions(
                baseUrl: baseUrl,
                connectTimeout: const Duration(seconds: 10),
                receiveTimeout: const Duration(seconds: 10),
                headers: <String, dynamic>{'Content-Type': 'application/json'},
              ),
            ) {
    if (dio.options.baseUrl.isEmpty) {
      dio.options.baseUrl = baseUrl;
    }
    if (_refreshDio.options.baseUrl.isEmpty) {
      _refreshDio.options.baseUrl = baseUrl;
    }
    if (customDio != null && refreshDio == null) {
      _refreshDio.httpClientAdapter = dio.httpClientAdapter;
    }
    _setupInterceptors();
  }

  void _setupInterceptors() {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final existingAuth = options.headers['Authorization'];
          if (existingAuth == null) {
            final token = await storage.getAccessToken();
            if (token != null && token.isNotEmpty) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          } else if (existingAuth == '') {
            options.headers.remove('Authorization');
          }

          final existingTenant = options.headers['x-tenant-id'];
          if (existingTenant == null) {
            final tenantId = await storage.getTenantId();
            if (tenantId != null && tenantId.isNotEmpty) {
              options.headers['x-tenant-id'] = tenantId;
            }
          }

          return handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode != 401) {
            return handler.next(error);
          }

          // 1. Retry Guard: do not re-intercept an already retried request
          if (error.requestOptions.extra['is_retry'] == true) {
            return handler.next(error);
          }

          // Prevent recursion if the refresh endpoint itself failed with 401
          if (error.requestOptions.path.contains(ApiEndpoints.refreshToken)) {
            await storage.clearAll();
            return handler.next(error);
          }

          // 2. Concurrency Check: If a refresh is already in progress, await its completion
          if (_refreshCompleter != null) {
            try {
              final refreshedToken = await _refreshCompleter!.future;
              if (refreshedToken != null && refreshedToken.isNotEmpty) {
                await _retryRequest(
                  error.requestOptions,
                  refreshedToken,
                  handler,
                );
                return;
              }
            } catch (_) {}
            return handler.next(error);
          }

          // 3. Stored Token Check: If storage already has a newer token than the failed request header, use it directly
          final currentAccessToken = await storage.getAccessToken();
          final requestAuthHeader =
              error.requestOptions.headers['Authorization'] as String?;
          if (currentAccessToken != null &&
              currentAccessToken.isNotEmpty &&
              requestAuthHeader != null &&
              requestAuthHeader != 'Bearer $currentAccessToken') {
            await _retryRequest(
              error.requestOptions,
              currentAccessToken,
              handler,
            );
            return;
          }

          // 4. Token Refresh Execution: Synchronized with Completer
          final completer = Completer<String?>();
          _refreshCompleter = completer;
          String? newAccessToken;

          try {
            final refreshToken = await storage.getRefreshToken();
            if (refreshToken == null || refreshToken.isEmpty) {
              await storage.clearAll();
              completer.complete(null);
              return handler.next(error);
            }

            final refreshRes = await _refreshDio.post<dynamic>(
              ApiEndpoints.refreshToken,
              data: <String, dynamic>{'refreshToken': refreshToken},
            );

            Map<String, dynamic>? data;
            if (refreshRes.data is Map<String, dynamic>) {
              data = refreshRes.data as Map<String, dynamic>;
            } else if (refreshRes.data is Map) {
              data = Map<String, dynamic>.from(refreshRes.data as Map);
            } else if (refreshRes.data is String) {
              try {
                final Object? decoded = jsonDecode(refreshRes.data as String);
                if (decoded is Map) {
                  data = Map<String, dynamic>.from(decoded);
                }
              } catch (_) {}
            }

            final newAccess = data?['accessToken'] as String?;
            final newRefresh =
                (data?['refreshToken'] as String?) ?? refreshToken;

            if (newAccess != null && newAccess.isNotEmpty) {
              await storage.saveTokens(
                accessToken: newAccess,
                refreshToken: newRefresh,
              );
              newAccessToken = newAccess;
              completer.complete(newAccess);
            } else {
              await storage.clearAll();
              completer.complete(null);
              return handler.next(error);
            }
          } catch (refreshErr) {
            await storage.clearAll();
            if (!completer.isCompleted) {
              completer.complete(null);
            }
            return handler.next(error);
          } finally {
            _refreshCompleter = null;
          }

          // 5. Retried Request Execution: Separate from refresh try/catch block
          if (newAccessToken.isNotEmpty) {
            await _retryRequest(error.requestOptions, newAccessToken, handler);
            return;
          }

          return handler.next(error);
        },
      ),
    );
  }

  Future<void> _retryRequest(
    RequestOptions originalOptions,
    String newAccessToken,
    ErrorInterceptorHandler handler,
  ) async {
    final retryOptions = originalOptions;
    retryOptions.extra['is_retry'] = true;
    retryOptions.headers['Authorization'] = 'Bearer $newAccessToken';

    try {
      final clonedResponse = await dio.fetch<dynamic>(retryOptions);
      return handler.resolve(clonedResponse);
    } on DioException catch (fetchError) {
      return handler.reject(fetchError);
    } catch (err) {
      return handler.reject(
        DioException(
          requestOptions: retryOptions,
          error: err,
        ),
      );
    }
  }
}
