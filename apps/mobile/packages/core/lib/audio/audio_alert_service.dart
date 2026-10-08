import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/services.dart';

/// Service managing audio alerts and haptic feedback for job notifications and success chimes.
class AudioAlertService {
  final AudioPlayer _player;
  bool _isPlaying = false;
  Timer? _vibrationTimer;

  AudioAlertService({AudioPlayer? player}) : _player = player ?? AudioPlayer();

  /// Returns true if the alert audio is currently playing.
  bool get isPlaying => _isPlaying;

  /// Returns true if the periodic haptic vibration timer is active.
  bool get isVibrating => _vibrationTimer != null && _vibrationTimer!.isActive;

  /// Starts the looping radar alert audio with periodic heavy haptic feedback.
  Future<void> startRadarAlert() async {
    if (_isPlaying) return;
    await _player.setReleaseMode(ReleaseMode.loop);
    await _player.setSource(AssetSource('sounds/radar_alert.mp3'));
    await _player.resume();
    await HapticFeedback.heavyImpact();

    _vibrationTimer?.cancel();
    _vibrationTimer = Timer.periodic(
      const Duration(seconds: 1),
      (_) => HapticFeedback.heavyImpact(),
    );

    _isPlaying = true;
  }

  /// Stops any playing audio alert and cancels periodic vibration.
  Future<void> stopAlert() async {
    _vibrationTimer?.cancel();
    _vibrationTimer = null;
    await _player.stop();
    _isPlaying = false;
  }

  /// Plays a one-shot success chime with medium haptic feedback.
  Future<void> playSuccessChime() async {
    _vibrationTimer?.cancel();
    _vibrationTimer = null;
    _isPlaying = false;
    await _player.setReleaseMode(ReleaseMode.stop);
    await _player.setSource(AssetSource('sounds/success_chime.mp3'));
    await _player.resume();
    await HapticFeedback.mediumImpact();
  }

  /// Disposes audio player and stops any active vibration.
  Future<void> dispose() async {
    await stopAlert();
    await _player.dispose();
  }
}
