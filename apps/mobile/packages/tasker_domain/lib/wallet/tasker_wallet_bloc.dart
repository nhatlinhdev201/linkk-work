import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:linkkwork_core/network/dio_client.dart';

import 'tasker_wallet_event.dart';
import 'tasker_wallet_state.dart';

/// BLoC managing tasker wallet deposit balance and double-entry transaction ledger.
class TaskerWalletBloc extends Bloc<TaskerWalletEvent, TaskerWalletState> {
  final DioClient dioClient;

  TaskerWalletBloc({
    required this.dioClient,
  }) : super(const TaskerWalletInitialState()) {
    on<LoadWalletDataEvent>(_onLoadWalletData);
    on<RefreshWalletDataEvent>(_onRefreshWalletData);
  }

  Future<void> _onLoadWalletData(
    LoadWalletDataEvent event,
    Emitter<TaskerWalletState> emit,
  ) async {
    await _fetchWalletData(emit);
  }

  Future<void> _onRefreshWalletData(
    RefreshWalletDataEvent event,
    Emitter<TaskerWalletState> emit,
  ) async {
    await _fetchWalletData(emit);
  }

  Future<void> _fetchWalletData(Emitter<TaskerWalletState> emit) async {
    if (state is! TaskerWalletLoadedState) {
      emit(const TaskerWalletLoadingState());
    }
    try {
      final results = await Future.wait([
        dioClient.dio.get<dynamic>('/finance/summary'),
        dioClient.dio.get<dynamic>('/finance/transactions'),
      ]);
      final summaryRes = results[0];
      final txRes = results[1];

      final depositBalance = _parseDeposit(summaryRes.data);
      final transactions = _parseTransactions(txRes.data);

      emit(TaskerWalletLoadedState(
        depositBalance: depositBalance,
        transactions: transactions,
      ));
    } on DioException catch (e) {
      emit(TaskerWalletErrorState(error: _extractErrorMessage(e)));
    } catch (e) {
      emit(TaskerWalletErrorState(error: e.toString()));
    }
  }

  double _parseDeposit(dynamic data) {
    if (data is Map) {
      Map<dynamic, dynamic> map = data;
      if (map['data'] is Map) {
        map = map['data'] as Map<dynamic, dynamic>;
      }
      final raw = map['depositBalance'] ??
          map['balance'] ??
          map['totalDepositHeld'] ??
          map['deposit'] ??
          (map['wallet'] is Map
              ? (map['wallet'] as Map<dynamic, dynamic>)['balance']
              : null) ??
          (map['taskerProfile'] is Map
              ? (map['taskerProfile']
                  as Map<dynamic, dynamic>)['depositBalance']
              : null);
      if (raw is num) {
        return raw.toDouble();
      }
      if (raw is String) {
        return double.tryParse(raw) ?? 0.0;
      }
    }
    return 0.0;
  }

  List<Map<String, dynamic>> _parseTransactions(dynamic data) {
    List<dynamic> rawList = <dynamic>[];
    if (data is Map) {
      final Map<dynamic, dynamic> map = data;
      if (map['transactions'] is List) {
        rawList = map['transactions'] as List<dynamic>;
      } else if (map['data'] is List) {
        rawList = map['data'] as List<dynamic>;
      }
    } else if (data is List) {
      rawList = data;
    }
    return rawList
        .whereType<Map<dynamic, dynamic>>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  String _extractErrorMessage(Object e) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map) {
        final msg = data['message'] ?? data['error'];
        if (msg is List) {
          return msg.join(', ');
        }
        if (msg != null) return msg.toString();
      }
      if (e.message != null && e.message!.isNotEmpty) {
        return e.message!;
      }
    }
    return 'Lỗi kết nối máy chủ';
  }
}
