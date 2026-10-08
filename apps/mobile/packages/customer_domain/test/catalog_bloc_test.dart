import 'package:bloc_test/bloc_test.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:linkkwork_core/network/api_endpoints.dart';
import 'package:linkkwork_core/network/dio_client.dart';
import 'package:linkkwork_customer_domain/catalog/catalog_bloc.dart';
import 'package:linkkwork_customer_domain/catalog/catalog_event.dart';
import 'package:linkkwork_customer_domain/catalog/catalog_state.dart';
import 'package:mocktail/mocktail.dart';

class MockDioClient extends Mock implements DioClient {}

class MockDio extends Mock implements Dio {}

void main() {
  late MockDioClient mockDioClient;
  late MockDio mockDio;

  final sampleCategories = <Map<String, dynamic>>[
    <String, dynamic>{
      'id': 'cat-1',
      'name': 'Dọn dẹp nhà cửa',
      'icon': 'cleaning_services',
    },
    <String, dynamic>{
      'id': 'cat-2',
      'name': 'Sửa chữa điện nước',
      'icon': 'plumbing',
    },
  ];

  final sampleServices = <Map<String, dynamic>>[
    <String, dynamic>{
      'id': 'srv-1',
      'categoryId': 'cat-1',
      'name': 'Dọn dẹp theo giờ',
      'baseUnitPrice': 80000.0,
      'pricingType': 'HOURLY',
    },
    <String, dynamic>{
      'id': 'srv-2',
      'categoryId': 'cat-2',
      'name': 'Sửa ống nước rò rỉ',
      'baseUnitPrice': 150000.0,
      'pricingType': 'PER_UNIT',
    },
  ];

  setUp(() {
    mockDioClient = MockDioClient();
    mockDio = MockDio();
    when(() => mockDioClient.dio).thenReturn(mockDio);
  });

  group('CatalogBloc', () {
    test('initial state is CatalogInitialState', () {
      final bloc = CatalogBloc(dioClient: mockDioClient);
      expect(bloc.state, equals(const CatalogInitialState()));
      bloc.close();
    });

    blocTest<CatalogBloc, CatalogState>(
      'LoadCatalogCategoriesEvent loads categories and services successfully',
      build: () {
        when(
          () => mockDio.get<dynamic>(ApiEndpoints.categories),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: ApiEndpoints.categories),
            statusCode: 200,
            data: sampleCategories,
          ),
        );
        when(
          () => mockDio.get<dynamic>(ApiEndpoints.services),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: ApiEndpoints.services),
            statusCode: 200,
            data: sampleServices,
          ),
        );
        return CatalogBloc(dioClient: mockDioClient);
      },
      act: (bloc) => bloc.add(const LoadCatalogCategoriesEvent()),
      expect: () => [
        const CatalogLoadingState(),
        CatalogLoadedState(
          categories: sampleCategories,
          services: sampleServices,
        ),
      ],
      verify: (_) {
        verify(() => mockDio.get<dynamic>(ApiEndpoints.categories)).called(1);
        verify(() => mockDio.get<dynamic>(ApiEndpoints.services)).called(1);
      },
    );

    blocTest<CatalogBloc, CatalogState>(
      'SelectCategoryEvent updates selectedCategoryId when state is CatalogLoadedState',
      build: () => CatalogBloc(dioClient: mockDioClient),
      seed: () => CatalogLoadedState(
        categories: sampleCategories,
        services: sampleServices,
      ),
      act: (bloc) => bloc.add(const SelectCategoryEvent(categoryId: 'cat-1')),
      expect: () => [
        CatalogLoadedState(
          categories: sampleCategories,
          services: sampleServices,
          selectedCategoryId: 'cat-1',
        ),
      ],
    );

    test(
        'filteredServices returns only matching category items or all when null',
        () {
      final loadedStateWithFilter = CatalogLoadedState(
        categories: sampleCategories,
        services: sampleServices,
        selectedCategoryId: 'cat-1',
      );
      expect(loadedStateWithFilter.filteredServices.length, equals(1));
      expect(
          loadedStateWithFilter.filteredServices.first['id'], equals('srv-1'));

      final loadedStateWithoutFilter = CatalogLoadedState(
        categories: sampleCategories,
        services: sampleServices,
      );
      expect(loadedStateWithoutFilter.filteredServices.length, equals(2));
    });

    test('CatalogLoadedState copyWith allows clearing selectedCategoryId with null', () {
      final state = CatalogLoadedState(
        categories: sampleCategories,
        services: sampleServices,
        selectedCategoryId: 'cat-1',
      );
      final cleared = state.copyWith(selectedCategoryId: null);
      expect(cleared.selectedCategoryId, isNull);

      final unchanged = state.copyWith();
      expect(unchanged.selectedCategoryId, equals('cat-1'));
    });

    blocTest<CatalogBloc, CatalogState>(
      'SelectCategoryEvent loads categories and services when initial state',
      build: () {
        when(
          () => mockDio.get<dynamic>(ApiEndpoints.categories),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: ApiEndpoints.categories),
            statusCode: 200,
            data: sampleCategories,
          ),
        );
        when(
          () => mockDio.get<dynamic>(ApiEndpoints.services),
        ).thenAnswer(
          (_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: ApiEndpoints.services),
            statusCode: 200,
            data: sampleServices,
          ),
        );
        return CatalogBloc(dioClient: mockDioClient);
      },
      act: (bloc) => bloc.add(const SelectCategoryEvent(categoryId: 'cat-2')),
      expect: () => [
        const CatalogLoadingState(),
        CatalogLoadedState(
          categories: sampleCategories,
          services: sampleServices,
          selectedCategoryId: 'cat-2',
        ),
      ],
      verify: (_) {
        verify(() => mockDio.get<dynamic>(ApiEndpoints.categories)).called(1);
        verify(() => mockDio.get<dynamic>(ApiEndpoints.services)).called(1);
      },
    );

    blocTest<CatalogBloc, CatalogState>(
      'LoadCatalogCategoriesEvent handles DioException with Vietnamese error message',
      build: () {
        when(
          () => mockDio.get<dynamic>(ApiEndpoints.categories),
        ).thenThrow(
          DioException(
            requestOptions: RequestOptions(path: ApiEndpoints.categories),
            response: Response<dynamic>(
              requestOptions: RequestOptions(path: ApiEndpoints.categories),
              statusCode: 500,
              data: <String, dynamic>{
                'message': 'Không thể kết nối đến máy chủ danh mục',
              },
            ),
          ),
        );
        return CatalogBloc(dioClient: mockDioClient);
      },
      act: (bloc) => bloc.add(const LoadCatalogCategoriesEvent()),
      expect: () => [
        const CatalogLoadingState(),
        const CatalogErrorState(
          error: 'Không thể kết nối đến máy chủ danh mục',
        ),
      ],
    );

    blocTest<CatalogBloc, CatalogState>(
      'LoadCatalogCategoriesEvent joins list of error messages if returned by server',
      build: () {
        when(
          () => mockDio.get<dynamic>(ApiEndpoints.categories),
        ).thenThrow(
          DioException(
            requestOptions: RequestOptions(path: ApiEndpoints.categories),
            response: Response<dynamic>(
              requestOptions: RequestOptions(path: ApiEndpoints.categories),
              statusCode: 400,
              data: <String, dynamic>{
                'message': ['Tenant không hợp lệ', 'Phiên hết hạn'],
              },
            ),
          ),
        );
        return CatalogBloc(dioClient: mockDioClient);
      },
      act: (bloc) => bloc.add(const LoadCatalogCategoriesEvent()),
      expect: () => [
        const CatalogLoadingState(),
        const CatalogErrorState(
          error: 'Tenant không hợp lệ, Phiên hết hạn',
        ),
      ],
    );

    blocTest<CatalogBloc, CatalogState>(
      'LoadCatalogCategoriesEvent emits default Vietnamese error on unexpected exception',
      build: () {
        when(
          () => mockDio.get<dynamic>(ApiEndpoints.categories),
        ).thenThrow(Exception('Network timeout'));
        return CatalogBloc(dioClient: mockDioClient);
      },
      act: (bloc) => bloc.add(const LoadCatalogCategoriesEvent()),
      expect: () => [
        const CatalogLoadingState(),
        const CatalogErrorState(
          error: 'Không thể tải danh mục dịch vụ',
        ),
      ],
    );

    blocTest<CatalogBloc, CatalogState>(
      'SelectCategoryEvent handles error when loading from unseeded state',
      build: () {
        when(
          () => mockDio.get<dynamic>(ApiEndpoints.categories),
        ).thenThrow(
          DioException(
            requestOptions: RequestOptions(path: ApiEndpoints.categories),
            message: 'Connection reset',
          ),
        );
        return CatalogBloc(dioClient: mockDioClient);
      },
      act: (bloc) => bloc.add(const SelectCategoryEvent(categoryId: 'cat-1')),
      expect: () => [
        const CatalogLoadingState(),
        const CatalogErrorState(
          error: 'Connection reset',
        ),
      ],
    );
  });
}
