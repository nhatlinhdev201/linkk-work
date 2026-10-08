import 'package:equatable/equatable.dart';

/// Base event class for catalog domain operations.
abstract class CatalogEvent extends Equatable {
  const CatalogEvent();

  @override
  List<Object?> get props => [];
}

/// Event requesting load of catalog categories and services.
class LoadCatalogCategoriesEvent extends CatalogEvent {
  const LoadCatalogCategoriesEvent();
}

/// Event selecting a category to view or filter services.
class SelectCategoryEvent extends CatalogEvent {
  final String categoryId;

  const SelectCategoryEvent({required this.categoryId});

  @override
  List<Object?> get props => [categoryId];
}
