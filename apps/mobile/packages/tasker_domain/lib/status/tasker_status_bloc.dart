import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:linkkwork_core/network/dio_client.dart';

import 'tasker_status_event.dart';
import 'tasker_status_state.dart';

/// BLoC enforcing minimum deposit guard and controlling tasker availability status.
class TaskerStatusBloc extends Bloc<TaskerStatusEvent, TaskerStatusState> {
  final DioClient dioClient;
  final double minDepositRequired;

  TaskerStatusBloc({
    required this.dioClient,
    this.minDepositRequired = 500000.0,
  }) : super(const TaskerStatusInitial()) {
    on<CheckTaskerStatusEvent>(_onCheckTaskerStatus);
    on<ToggleTaskerStatusEvent>(_onToggleTaskerStatus);
  }

  Future<void> _onCheckTaskerStatus(
    CheckTaskerStatusEvent event,
    Emitter<TaskerStatusState> emit,
  ) async {
    emit(const TaskerStatusLoading());
    try {
      final res = await dioClient.dio.get<dynamic>('/finance/summary');
      final balance = _parseDeposit(res.data);
      emit(TaskerStatusLoaded(
        isOnline: false,
        depositBalance: balance,
        minDeposit: minDepositRequired,
      ));
    } on DioException catch (e) {
      final errorMsg =
          _extractErrorMessage(e) ?? 'Không thể kết nối máy chủ tài chính';
      emit(TaskerStatusError(message: errorMsg));
    } catch (e) {
      emit(TaskerStatusError(message: e.toString()));
    }
  }

  Future<void> _onToggleTaskerStatus(
    ToggleTaskerStatusEvent event,
    Emitter<TaskerStatusState> emit,
  ) async {
    double balance = 0.0;
    if (state is TaskerStatusLoaded) {
      balance = (state as TaskerStatusLoaded).depositBalance;
    } else if (state is TaskerStatusError &&
        (state as TaskerStatusError).currentDeposit != null) {
      balance = (state as TaskerStatusError).currentDeposit!;
    } else {
      try {
        final res = await dioClient.dio.get<dynamic>('/finance/summary');
        balance = _parseDeposit(res.data);
      } on DioException catch (e) {
        final errorMsg =
            _extractErrorMessage(e) ?? 'Không thể kết nối máy chủ tài chính';
        emit(TaskerStatusError(
          message: 'Không thể xác thực số dư ký quỹ: $errorMsg',
        ));
        return;
      } catch (e) {
        emit(TaskerStatusError(
          message: 'Không thể xác thực số dư ký quỹ: ${e.toString()}',
        ));
        return;
      }
    }

    if (event.goOnline) {
      if (balance < minDepositRequired) {
        emit(TaskerStatusError(
          message:
              'Số dư ví ký quỹ không đủ điều kiện nhận việc (tối thiểu ${_formatCurrency(minDepositRequired)}). Vui lòng nạp thêm cọc.',
          isInsufficientDeposit: true,
          currentDeposit: balance,
        ));
        return;
      }
    }

    try {
      await dioClient.dio.patch<dynamic>(
        '/taskers/me/status',
        data: <String, dynamic>{'isOnline': event.goOnline},
      );
      emit(TaskerStatusLoaded(
        isOnline: event.goOnline,
        depositBalance: balance,
        minDeposit: minDepositRequired,
      ));
    } on DioException catch (e) {
      final errorMsg =
          _extractErrorMessage(e) ?? 'Không thể cập nhật trạng thái';
      emit(TaskerStatusError(
        message: errorMsg,
        currentDeposit: balance,
      ));
    } catch (e) {
      emit(TaskerStatusError(
        message: e.toString(),
        currentDeposit: balance,
      ));
    }
  }

  String _formatCurrency(double amount) {
    final s = amount.toInt().toString();
    final formatted = s.replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]}.',
    );
    return '$formattedđ';
  }

  double _parseDeposit(dynamic data) {
    if (data is Map) {
      final raw = data['depositBalance'] ??
          data['balance'] ??
          data['totalDepositHeld'] ??
          data['deposit'] ??
          (data['wallet'] is Map
              ? (data['wallet'] as Map<dynamic, dynamic>)['balance']
              : null) ??
          (data['taskerProfile'] is Map
              ? (data['taskerProfile']
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

  String? _extractErrorMessage(DioException e) {
    final data = e.response?.data;
    if (data is Map) {
      final msg = data['message'];
      if (msg is List) {
        return msg.join(', ');
      }
      if (msg != null) return msg.toString();
    }
    return e.message;
  }
}
