import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:linkkwork_design_system/theme/linkk_theme.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  group('LinkkTheme Colors', () {
    test('defines required brand color palette', () {
      expect(LinkkTheme.primary, const Color(0xFF10B981));
      expect(LinkkTheme.secondary, const Color(0xFF0F172A));
      expect(LinkkTheme.alert, const Color(0xFFF59E0B));
      expect(LinkkTheme.error, const Color(0xFFEF4444));
      expect(LinkkTheme.background, const Color(0xFFF8FAFC));
      expect(LinkkTheme.surface, Colors.white);
      expect(LinkkTheme.border, const Color(0xFFE2E8F0));
      expect(LinkkTheme.textPrimary, const Color(0xFF0F172A));
      expect(LinkkTheme.textMuted, const Color(0xFF64748B));
    });

    test('defines fluid motion constants', () {
      expect(LinkkTheme.fastDuration, const Duration(milliseconds: 150));
      expect(LinkkTheme.normalDuration, const Duration(milliseconds: 300));
      expect(LinkkTheme.defaultCurve, Curves.easeOutCubic);
      expect(LinkkTheme.springCurve, Curves.fastOutSlowIn);
    });
  });

  group('LinkkTheme ThemeData', () {
    test('lightTheme generates valid Material 3 theme', () {
      final theme = LinkkTheme.lightTheme;

      expect(theme.useMaterial3, isTrue);
      expect(theme.brightness, Brightness.light);
      expect(theme.primaryColor, LinkkTheme.primary);
      expect(theme.scaffoldBackgroundColor, LinkkTheme.background);
      expect(theme.colorScheme.primary, LinkkTheme.primary);
      expect(theme.colorScheme.secondary, LinkkTheme.secondary);
      expect(theme.colorScheme.error, LinkkTheme.error);
      expect(theme.colorScheme.surface, LinkkTheme.surface);
      expect(theme.inputDecorationTheme.border, isA<OutlineInputBorder>());
      expect(theme.cardTheme.elevation, 0);
    });

    test('darkTheme generates valid Material 3 theme', () {
      final theme = LinkkTheme.darkTheme;

      expect(theme.useMaterial3, isTrue);
      expect(theme.brightness, Brightness.dark);
      expect(theme.primaryColor, LinkkTheme.primary);
      expect(theme.colorScheme.primary, LinkkTheme.primary);
      expect(theme.colorScheme.error, LinkkTheme.error);
      expect(theme.inputDecorationTheme.border, isA<OutlineInputBorder>());
    });
  });
}
