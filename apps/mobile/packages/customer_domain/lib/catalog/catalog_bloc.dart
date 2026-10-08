import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:linkkwork_core/network/api_endpoints.dart';
import 'package:linkkwork_core/network/dio_client.dart';

import 'catalog_event.dart';
import 'catalog_state.dart';

/// BLoC managing dynamic service catalog categories and services listing.
class CatalogBloc extends Bloc<CatalogEvent, CatalogState> {
  final DioClient dioClient;

  CatalogBloc({required this.dioClient}) : super(const CatalogInitialState()) {
    on<LoadCatalogCategoriesEvent>(_onLoadCatalogCategories);
    on<SelectCategoryEvent>(_onSelectCategory);
  }

  Future<void> _onLoadCatalogCategories(
    LoadCatalogCategoriesEvent event,
    Emitter<CatalogState> emit,
  ) async {
    emit(const CatalogLoadingState());

    try {
      final results = await Future.wait([
        dioClient.dio.get<dynamic>(ApiEndpoints.categories),
        dioClient.dio.get<dynamic>(ApiEndpoints.services),
      ]);

      final categoriesResponse = results[0];
      final servicesResponse = results[1];

      final categories = _parseList(categoriesResponse.data);
      final services = _parseList(servicesResponse.data);

      emit(CatalogLoadedState(
        categories: categories,
        services: services,
      ));
    } catch (e) {
      emit(CatalogErrorState(
        error: _extractErrorMessage(e, 'Không thể tải danh mục dịch vụ'),
      ));
    }
  }

  Future<void> _onSelectCategory(
    SelectCategoryEvent event,
    Emitter<CatalogState> emit,
  ) async {
    final currentState = state;
    if (currentState is CatalogLoadedState) {
      emit(currentState.copyWith(
        selectedCategoryId: event.categoryId,
      ));
      return;
    }

    emit(const CatalogLoadingState());
    try {
      final results = await Future.wait([
        dioClient.dio.get<dynamic>(ApiEndpoints.categories),
        dioClient.dio.get<dynamic>(ApiEndpoints.services),
      ]);

      final categories = _parseList(results[0].data);
      final services = _parseList(results[1].data);

      emit(CatalogLoadedState(
        categories: categories,
        services: services,
        selectedCategoryId: event.categoryId,
      ));
    } catch (e) {
      emit(CatalogErrorState(
        error: _extractErrorMessage(e, 'Không thể tải danh mục dịch vụ'),
      ));
    }
  }

  List<Map<String, dynamic>> _parseList(dynamic data) {
    if (data is List) {
      return data.map((dynamic item) {
        if (item is Map<String, dynamic>) {
          return item;
        } else if (item is Map) {
          return Map<String, dynamic>.from(item);
        }
        return <String, dynamic>{};
      }).toList();
    }
    return <Map<String, dynamic>>[];
  }

  String _extractErrorMessage(Object error, String fallback) {
    if (error is DioException) {
      final dynamic errData = error.response?.data;
      if (errData is Map && errData['message'] != null) {
        final dynamic msg = errData['message'];
        if (msg is List) {
          return msg.map((dynamic m) => m.toString()).join(', ');
        }
        return msg.toString();
      }
      if (error.message != null && error.message!.isNotEmpty) {
        return error.message!;
      }
    }
    return fallback;
  }
}
