import 'package:equatable/equatable.dart';

/// Base event class for tasker wallet and ledger balance.
abstract class TaskerWalletEvent extends Equatable {
  const TaskerWalletEvent();

  @override
  List<Object?> get props => [];
}

/// Event to load financial summary and transaction ledger for tasker.
class LoadWalletDataEvent extends TaskerWalletEvent {
  const LoadWalletDataEvent();
}

/// Event to refresh financial summary and transaction ledger.
class RefreshWalletDataEvent extends TaskerWalletEvent {
  const RefreshWalletDataEvent();
}
