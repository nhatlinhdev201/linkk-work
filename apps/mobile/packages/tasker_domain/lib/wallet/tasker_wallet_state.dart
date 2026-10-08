import 'package:equatable/equatable.dart';

/// Base state class for tasker wallet.
abstract class TaskerWalletState extends Equatable {
  const TaskerWalletState();

  @override
  List<Object?> get props => [];
}

/// Initial state before wallet data has loaded.
class TaskerWalletInitialState extends TaskerWalletState {
  const TaskerWalletInitialState();
}

/// State emitted while loading wallet balance and transaction ledger.
class TaskerWalletLoadingState extends TaskerWalletState {
  const TaskerWalletLoadingState();
}

/// State emitted when wallet balance and transaction ledger have loaded successfully.
class TaskerWalletLoadedState extends TaskerWalletState {
  final double depositBalance;
  final List<Map<String, dynamic>> transactions;

  const TaskerWalletLoadedState({
    required this.depositBalance,
    required this.transactions,
  });

  @override
  List<Object?> get props => [depositBalance, transactions];
}

/// State emitted when an error occurs fetching wallet data.
class TaskerWalletErrorState extends TaskerWalletState {
  final String error;

  const TaskerWalletErrorState({required this.error});

  @override
  List<Object?> get props => [error];
}
