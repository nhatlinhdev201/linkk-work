import 'package:flutter_test/flutter_test.dart';
import 'package:linkkwork_core/socket/socket_client_service.dart';
import 'package:mocktail/mocktail.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

class MockSocket extends Mock implements io.Socket {}

void main() {
  group('SocketClientService Tests', () {
    late MockSocket mockSocket;
    late Map<String, dynamic Function(dynamic)> listeners;

    setUp(() {
      mockSocket = MockSocket();
      listeners = <String, dynamic Function(dynamic)>{};

      when(() => mockSocket.on(any(), any())).thenAnswer((invocation) {
        final event = invocation.positionalArguments[0] as String;
        final handler =
            invocation.positionalArguments[1] as dynamic Function(dynamic);
        listeners[event] = handler;
        return () {};
      });

      when(() => mockSocket.off(any())).thenAnswer((invocation) {
        final event = invocation.positionalArguments[0] as String;
        listeners.remove(event);
      });

      when(() => mockSocket.connected).thenReturn(true);
      when(() => mockSocket.connect()).thenReturn(mockSocket);
      when(() => mockSocket.disconnect()).thenReturn(mockSocket);
      when(() => mockSocket.dispose()).thenAnswer((_) {});
    });

    test('exposes strongly typed broadcast streams', () {
      final service = SocketClientService(
        serverUrl: 'http://localhost:3000',
        customSocket: mockSocket,
      );

      expect(service.jobBroadcastStream, isNotNull);
      expect(service.statusChangeStream, isNotNull);
      expect(service.jobClaimedStream, isNotNull);
      expect(service.locationStream, isNotNull);
    });

    test('isConnected reflects socket connection status', () {
      when(() => mockSocket.connected).thenReturn(true);
      final connectedService = SocketClientService(
        serverUrl: 'http://localhost:3000',
        customSocket: mockSocket,
      );
      expect(connectedService.isConnected, isTrue);

      when(() => mockSocket.connected).thenReturn(false);
      final disconnectedService = SocketClientService(
        serverUrl: 'http://localhost:3000',
        customSocket: mockSocket,
      );
      expect(disconnectedService.isConnected, isFalse);

      final noSocketService = SocketClientService(
        serverUrl: 'http://localhost:3000',
      );
      expect(noSocketService.isConnected, isFalse);
    });

    test('connect registers event listeners and safe map casting delivers data',
        () async {
      final service = SocketClientService(
        serverUrl: 'http://localhost:3000',
        customSocket: mockSocket,
      );

      service.connect(accessToken: 'mock_token_123');

      expect(listeners.containsKey('job:broadcast'), isTrue);
      expect(listeners.containsKey('booking:status_changed'), isTrue);
      expect(listeners.containsKey('job:claimed'), isTrue);
      expect(listeners.containsKey('tasker:location_stream'), isTrue);

      // Verify job:broadcast stream
      final jobBroadcastFuture = service.jobBroadcastStream.first;
      listeners['job:broadcast']?.call(<dynamic, dynamic>{
        'bookingId': 'bk_001',
        'serviceName': 'Plumbing Repair',
        'totalAmount': 500000,
      });
      final jobData = await jobBroadcastFuture;
      expect(jobData['bookingId'], equals('bk_001'));
      expect(jobData['serviceName'], equals('Plumbing Repair'));
      expect(jobData['totalAmount'], equals(500000));

      // Verify booking:status_changed stream
      final statusFuture = service.statusChangeStream.first;
      listeners['booking:status_changed']?.call(<String, dynamic>{
        'bookingId': 'bk_001',
        'status': 'IN_PROGRESS',
      });
      final statusData = await statusFuture;
      expect(statusData['bookingId'], equals('bk_001'));
      expect(statusData['status'], equals('IN_PROGRESS'));

      // Verify job:claimed stream
      final jobClaimedFuture = service.jobClaimedStream.first;
      listeners['job:claimed']?.call(<String, dynamic>{
        'bookingId': 'bk_001',
        'taskerId': 'tsk_999',
      });
      final claimedData = await jobClaimedFuture;
      expect(claimedData['bookingId'], equals('bk_001'));
      expect(claimedData['taskerId'], equals('tsk_999'));

      // Verify tasker:location_stream stream
      final locationFuture = service.locationStream.first;
      listeners['tasker:location_stream']?.call(<String, dynamic>{
        'latitude': 10.762622,
        'longitude': 106.660172,
      });
      final locationData = await locationFuture;
      expect(locationData['latitude'], equals(10.762622));
      expect(locationData['longitude'], equals(106.660172));
    });

    test('ignores non-map event payloads safely without exception', () async {
      final service = SocketClientService(
        serverUrl: 'http://localhost:3000',
        customSocket: mockSocket,
      );

      service.connect(accessToken: 'mock_token_123');

      var received = false;
      final sub = service.jobBroadcastStream.listen((_) {
        received = true;
      });

      // Pass invalid types: string, null, list
      listeners['job:broadcast']?.call('invalid_string_data');
      listeners['job:broadcast']?.call(null);
      listeners['job:broadcast']?.call(<dynamic>[1, 2, 3]);

      await Future<void>.delayed(const Duration(milliseconds: 20));
      expect(received, isFalse);
      await sub.cancel();
    });

    test('emitLocation sends tasker:location_stream event with data', () {
      final service = SocketClientService(
        serverUrl: 'http://localhost:3000',
        customSocket: mockSocket,
      );

      final locationData = <String, dynamic>{
        'bookingId': 'bk_001',
        'latitude': 10.762622,
        'longitude': 106.660172,
      };

      service.emitLocation(locationData);

      verify(
        () => mockSocket.emit('tasker:location_stream', locationData),
      ).called(1);
    });

    test('disconnect closes socket connection and cleans up', () {
      final service = SocketClientService(
        serverUrl: 'http://localhost:3000',
        customSocket: mockSocket,
      );

      service.disconnect();

      verify(() => mockSocket.disconnect()).called(1);
      verify(() => mockSocket.dispose()).called(1);
    });

    test('dispose disconnects and closes all broadcast streams', () async {
      final service = SocketClientService(
        serverUrl: 'http://localhost:3000',
        customSocket: mockSocket,
      );

      service.dispose();

      verify(() => mockSocket.disconnect()).called(1);
      verify(() => mockSocket.dispose()).called(1);

      expect(service.jobBroadcastStream.isBroadcast, isTrue);
      // Verify adding to stream after dispose does not crash
      expect(
        () => listeners['job:broadcast']?.call(<String, dynamic>{'a': 'b'}),
        returnsNormally,
      );
    });
  });
}
