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

      service = AudioAlertService(player: mockPlayer);
    });

    test('initial state is not playing', () {
      expect(service.isPlaying, isFalse);
    });

    test(
        'startRadarAlert loops audio, sets radar_alert asset, resumes player and marks isPlaying true',
        () async {
      await service.startRadarAlert();

      expect(service.isPlaying, isTrue);
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

      // Call second time
      await service.startRadarAlert();

      // Ensure resume was only called once
      verify(() => mockPlayer.resume()).called(1);
    });

    test('stopAlert stops audio player and marks isPlaying false', () async {
      await service.startRadarAlert();
      expect(service.isPlaying, isTrue);

      await service.stopAlert();
      expect(service.isPlaying, isFalse);
      verify(() => mockPlayer.stop()).called(1);
    });

    test('playSuccessChime sets stop release mode and plays chime sound',
        () async {
      await service.playSuccessChime();

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
      verify(() => mockPlayer.resume()).called(1);
    });
  });
}
