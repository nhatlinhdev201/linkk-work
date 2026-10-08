import 'dart:convert';

import 'package:dio/dio.dart';

import '../storage/secure_storage_service.dart';
import 'api_endpoints.dart';

class DioClient {
  final Dio dio;
  final SecureStorageService storage;

  DioClient({
    required String baseUrl,
    required this.storage,
    Dio? customDio,
  }) : dio = customDio ??
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
          if (error.response?.statusCode == 401) {
            final isRefreshEndpoint =
                error.requestOptions.path.contains(ApiEndpoints.refreshToken);

            if (!isRefreshEndpoint) {
              final refreshToken = await storage.getRefreshToken();
              if (refreshToken != null && refreshToken.isNotEmpty) {
                try {
                  final refreshRes = await dio.post<dynamic>(
                    ApiEndpoints.refreshToken,
                    data: <String, dynamic>{'refreshToken': refreshToken},
                    options: Options(
                      headers: <String, dynamic>{
                        'Authorization': '',
                      },
                    ),
                  );

                  Map<String, dynamic>? data;
                  if (refreshRes.data is Map<String, dynamic>) {
                    data = refreshRes.data as Map<String, dynamic>;
                  } else if (refreshRes.data is Map) {
                    data = Map<String, dynamic>.from(refreshRes.data as Map);
                  } else if (refreshRes.data is String) {
                    try {
                      final Object? decoded =
                          jsonDecode(refreshRes.data as String);
                      if (decoded is Map) {
                        data = Map<String, dynamic>.from(decoded);
                      }
                    } catch (_) {}
                  }

                  if (data != null) {
                    final newAccess = data['accessToken'] as String?;
                    final newRefresh =
                        (data['refreshToken'] as String?) ?? refreshToken;

                    if (newAccess != null && newAccess.isNotEmpty) {
                      await storage.saveTokens(
                        accessToken: newAccess,
                        refreshToken: newRefresh,
                      );

                      final retryOptions = error.requestOptions;
                      retryOptions.headers['Authorization'] =
                          'Bearer $newAccess';
                      final clonedResponse =
                          await dio.fetch<dynamic>(retryOptions);
                      return handler.resolve(clonedResponse);
                    } else {
                      await storage.clearAll();
                    }
                  } else {
                    await storage.clearAll();
                  }
                } catch (_) {
                  await storage.clearAll();
                }
              }
            }
          }

          return handler.next(error);
        },
      ),
    );
  }
}
