import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/services.dart';

/// Service managing audio alerts and haptic feedback for job notifications and success chimes.
class AudioAlertService {
  final AudioPlayer _player;
  bool _isPlaying = false;

  AudioAlertService({AudioPlayer? player}) : _player = player ?? AudioPlayer();

  /// Returns true if the alert audio is currently playing.
  bool get isPlaying => _isPlaying;

  /// Starts the looping radar alert audio with heavy haptic feedback.
  Future<void> startRadarAlert() async {
    if (_isPlaying) return;
    await _player.setReleaseMode(ReleaseMode.loop);
    await _player.setSource(AssetSource('sounds/radar_alert.mp3'));
    await _player.resume();
    await HapticFeedback.heavyImpact();
    _isPlaying = true;
  }

  /// Stops any playing audio alert.
  Future<void> stopAlert() async {
    await _player.stop();
    _isPlaying = false;
  }

  /// Plays a one-shot success chime with medium haptic feedback.
  Future<void> playSuccessChime() async {
    await _player.setReleaseMode(ReleaseMode.stop);
    await _player.setSource(AssetSource('sounds/success_chime.mp3'));
    await _player.resume();
    await HapticFeedback.mediumImpact();
  }
}
