import 'package:equatable/equatable.dart';

/// Base state class for catalog domain operations.
abstract class CatalogState extends Equatable {
  const CatalogState();

  @override
  List<Object?> get props => [];
}

/// Initial state of the catalog.
class CatalogInitialState extends CatalogState {
  const CatalogInitialState();
}

/// State indicating catalog categories and services are loading.
class CatalogLoadingState extends CatalogState {
  const CatalogLoadingState();
}

/// State containing loaded catalog categories and services.
class CatalogLoadedState extends CatalogState {
  final List<Map<String, dynamic>> categories;
  final List<Map<String, dynamic>> services;
  final String? selectedCategoryId;

  const CatalogLoadedState({
    required this.categories,
    required this.services,
    this.selectedCategoryId,
  });

  /// Helper returning services filtered by [selectedCategoryId] if selected,
  /// or all services if [selectedCategoryId] is null or empty.
  List<Map<String, dynamic>> get filteredServices {
    if (selectedCategoryId == null || selectedCategoryId!.isEmpty) {
      return services;
    }
    return services
        .where((s) => s['categoryId']?.toString() == selectedCategoryId)
        .toList();
  }

  static const Object _sentinel = Object();

  CatalogLoadedState copyWith({
    List<Map<String, dynamic>>? categories,
    List<Map<String, dynamic>>? services,
    Object? selectedCategoryId = _sentinel,
  }) {
    return CatalogLoadedState(
      categories: categories ?? this.categories,
      services: services ?? this.services,
      selectedCategoryId: identical(selectedCategoryId, _sentinel)
          ? this.selectedCategoryId
          : selectedCategoryId as String?,
    );
  }

  @override
  List<Object?> get props => [categories, services, selectedCategoryId];
}

/// State indicating an error occurred while loading or operating on the catalog.
class CatalogErrorState extends CatalogState {
  final String error;

  const CatalogErrorState({required this.error});

  @override
  List<Object?> get props => [error];
}
