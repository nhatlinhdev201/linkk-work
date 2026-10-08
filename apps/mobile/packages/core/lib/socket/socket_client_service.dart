import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;

/// Service managing real-time WebSocket communication via Socket.io.
class SocketClientService {
  final String serverUrl;
  final io.Socket? _customSocket;
  io.Socket? _socket;

  final StreamController<bool> _connectionController =
      StreamController<bool>.broadcast();
  final StreamController<Map<String, dynamic>> _jobBroadcastController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _statusChangeController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _jobClaimedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _locationController =
      StreamController<Map<String, dynamic>>.broadcast();

  SocketClientService({
    required this.serverUrl,
    io.Socket? customSocket,
  })  : _customSocket = customSocket,
        _socket = customSocket;

  /// Returns true if the underlying socket is connected.
  bool get isConnected => _socket?.connected ?? false;

  /// Broadcast stream emitting socket connection state (true on connect, false on disconnect/error).
  Stream<bool> get isConnectedStream => _connectionController.stream;

  /// Broadcast stream for 'job:broadcast' events.
  Stream<Map<String, dynamic>> get jobBroadcastStream =>
      _jobBroadcastController.stream;

  /// Broadcast stream for 'booking:status_changed' events.
  Stream<Map<String, dynamic>> get statusChangeStream =>
      _statusChangeController.stream;

  /// Broadcast stream for 'job:claimed' events.
  Stream<Map<String, dynamic>> get jobClaimedStream =>
      _jobClaimedController.stream;

  /// Broadcast stream for 'tasker:location_stream' events.
  Stream<Map<String, dynamic>> get locationStream => _locationController.stream;

  /// Connects to the Socket.io server with authentication and sets up event listeners.
  void connect({required String accessToken}) {
    if (_socket != null && _customSocket == null) {
      disconnect();
    }

    if (_customSocket != null) {
      _socket = _customSocket;
    } else {
      _socket = io.io(
        serverUrl,
        io.OptionBuilder()
            .setTransports(<String>['websocket'])
            .enableAutoConnect()
            .setAuth(<String, dynamic>{'token': accessToken})
            .build(),
      );
    }

    _registerListeners();

    if (!(_socket?.connected ?? false)) {
      _socket?.connect();
    }
  }

  void _registerListeners() {
    final socket = _socket;
    if (socket == null) return;

    socket.off('connect');
    socket.on('connect', (_) {
      if (!_connectionController.isClosed) {
        _connectionController.add(true);
      }
    });

    socket.off('disconnect');
    socket.on('disconnect', (_) {
      if (!_connectionController.isClosed) {
        _connectionController.add(false);
      }
    });

    socket.off('connect_error');
    socket.on('connect_error', (_) {
      if (!_connectionController.isClosed) {
        _connectionController.add(false);
      }
    });

    socket.off('error');
    socket.on('error', (_) {
      if (!_connectionController.isClosed) {
        _connectionController.add(false);
      }
    });

    socket.off('job:broadcast');
    socket.on('job:broadcast', (dynamic data) {
      final map = _safeCast(data);
      if (map != null && !_jobBroadcastController.isClosed) {
        _jobBroadcastController.add(map);
      }
    });

    socket.off('booking:status_changed');
    socket.on('booking:status_changed', (dynamic data) {
      final map = _safeCast(data);
      if (map != null && !_statusChangeController.isClosed) {
        _statusChangeController.add(map);
      }
    });

    socket.off('job:claimed');
    socket.on('job:claimed', (dynamic data) {
      final map = _safeCast(data);
      if (map != null && !_jobClaimedController.isClosed) {
        _jobClaimedController.add(map);
      }
    });

    socket.off('tasker:location_stream');
    socket.on('tasker:location_stream', (dynamic data) {
      final map = _safeCast(data);
      if (map != null && !_locationController.isClosed) {
        _locationController.add(map);
      }
    });
  }

  Map<String, dynamic>? _safeCast(dynamic data) {
    if (data is Map<dynamic, dynamic>) {
      return data.map<String, dynamic>(
        (dynamic key, dynamic value) => MapEntry(key.toString(), value),
      );
    }
    return null;
  }

  /// Emits real-time location payload to the server.
  void emitLocation(Map<String, dynamic> locationData) {
    _socket?.emit('tasker:location_stream', locationData);
  }

  /// Disconnects the socket and clears internal references.
  void disconnect() {
    if (!_connectionController.isClosed) {
      _connectionController.add(false);
    }
    _socket?.disconnect();
    _socket?.dispose();
    if (_customSocket == null) {
      _socket = null;
    }
  }

  /// Disconnects and safely closes all broadcast streams.
  void dispose() {
    disconnect();
    _connectionController.close();
    _jobBroadcastController.close();
    _statusChangeController.close();
    _jobClaimedController.close();
    _locationController.close();
  }
}
