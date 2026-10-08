import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:linkkwork_design_system/theme/linkk_theme.dart';
import 'package:linkkwork_design_system/widgets/linkk_badge.dart';

void main() {
  group('LinkkBadge Widget Tests', () {
    testWidgets('renders badge text and default emerald color', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: LinkkBadge(
              text: 'Active',
            ),
          ),
        ),
      );

      expect(find.text('Active'), findsOneWidget);

      final container = tester.widget<Container>(find.byType(Container));
      final decoration = container.decoration as BoxDecoration;

      expect(decoration.color, LinkkTheme.primary.withValues(alpha: 0.12));
      expect(decoration.borderRadius, BorderRadius.circular(999));
    });

    testWidgets('renders custom color and optional icon', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: LinkkBadge(
              text: 'Warning',
              color: LinkkTheme.alert,
              icon: Icon(Icons.warning, key: Key('warn-icon')),
            ),
          ),
        ),
      );

      expect(find.text('Warning'), findsOneWidget);
      expect(find.byKey(const Key('warn-icon')), findsOneWidget);

      final container = tester.widget<Container>(find.byType(Container));
      final decoration = container.decoration as BoxDecoration;

      expect(decoration.color, LinkkTheme.alert.withValues(alpha: 0.12));
    });
  });
}
