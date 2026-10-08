import 'package:audioplayers/audioplayers.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:linkkwork_core/audio/audio_alert_service.dart';
import 'package:mocktail/mocktail.dart';

class MockAudioPlayer extends Mock implements AudioPlayer {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    registerFallbackValue(ReleaseMode.loop);
    registerFallbackValue(AssetSource('sounds/radar_alert.mp3'));
  });

  group('AudioAlertService Tests', () {
    late MockAudioPlayer mockPlayer;
    late AudioAlertService service;

    setUp(() {
      mockPlayer = MockAudioPlayer();
      when(() => mockPlayer.setReleaseMode(any())).thenAnswer((_) async {});
      when(() => mockPlayer.setSource(any())).thenAnswer((_) async {});
      when(() => mockPlayer.resume()).thenAnswer((_) async {});
      when(() => mockPlayer.stop()).thenAnswer((_) async {});
      when(() => mockPlayer.dispose()).thenAnswer((_) async {});

      service = AudioAlertService(player: mockPlayer);
    });

    test('initial state is not playing and not vibrating', () {
      expect(service.isPlaying, isFalse);
      expect(service.isVibrating, isFalse);
    });

    test(
        'startRadarAlert loops audio, sets radar_alert asset, starts vibration timer and marks isPlaying true',
        () async {
      await service.startRadarAlert();

      expect(service.isPlaying, isTrue);
      expect(service.isVibrating, isTrue);
      verify(() => mockPlayer.setReleaseMode(ReleaseMode.loop)).called(1);
      verify(
        () => mockPlayer.setSource(
          any(
            that: isA<AssetSource>().having(
              (AssetSource s) => s.path,
              'path',
              'sounds/radar_alert.mp3',
            ),
          ),
        ),
      ).called(1);
      verify(() => mockPlayer.resume()).called(1);
    });

    test('startRadarAlert is idempotent when already playing', () async {
      await service.startRadarAlert();
      expect(service.isPlaying, isTrue);
      expect(service.isVibrating, isTrue);

      // Call second time
      await service.startRadarAlert();

      // Ensure resume was only called once
      verify(() => mockPlayer.resume()).called(1);
      expect(service.isVibrating, isTrue);
    });

    test(
        'stopAlert stops audio player, cancels vibration timer and marks isPlaying false',
        () async {
      await service.startRadarAlert();
      expect(service.isPlaying, isTrue);
      expect(service.isVibrating, isTrue);

      await service.stopAlert();
      expect(service.isPlaying, isFalse);
      expect(service.isVibrating, isFalse);
      verify(() => mockPlayer.stop()).called(1);
    });

    test(
        'playSuccessChime sets stop release mode, resets isPlaying, cancels vibration and plays chime sound',
        () async {
      // Start alert first so playing and vibrating are true
      await service.startRadarAlert();
      expect(service.isPlaying, isTrue);
      expect(service.isVibrating, isTrue);

      await service.playSuccessChime();

      expect(service.isPlaying, isFalse);
      expect(service.isVibrating, isFalse);
      verify(() => mockPlayer.setReleaseMode(ReleaseMode.stop)).called(1);
      verify(
        () => mockPlayer.setSource(
          any(
            that: isA<AssetSource>().having(
              (AssetSource s) => s.path,
              'path',
              'sounds/success_chime.mp3',
            ),
          ),
        ),
      ).called(1);
      verify(() => mockPlayer.resume())
          .called(2); // once for radar, once for chime
    });

    test('dispose stops alert, cancels vibration and disposes player',
        () async {
      await service.startRadarAlert();
      expect(service.isPlaying, isTrue);
      expect(service.isVibrating, isTrue);

      await service.dispose();

      expect(service.isPlaying, isFalse);
      expect(service.isVibrating, isFalse);
      verify(() => mockPlayer.stop()).called(1);
      verify(() => mockPlayer.dispose()).called(1);
    });
  });
}
