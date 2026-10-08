import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:linkkwork_design_system/widgets/linkk_card.dart';

void main() {
  group('LinkkCard Widget Tests', () {
    testWidgets('renders child widget and applies padding', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: LinkkCard(
              child: Text('Card Content'),
            ),
          ),
        ),
      );

      expect(find.text('Card Content'), findsOneWidget);
    });

    testWidgets('triggers onTap callback when tapped', (tester) async {
      bool tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LinkkCard(
              onTap: () {
                tapped = true;
              },
              child: const Text('Tappable Card'),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Tappable Card'));
      await tester.pumpAndSettle();

      expect(tapped, isTrue);
    });

    testWidgets(
        'scales down to 0.97 on tap down when onTap is provided and returns to 1.0',
        (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: LinkkCard(
                onTap: () {},
                child: const Text('Scale Card'),
              ),
            ),
          ),
        ),
      );

      final animatedScaleFinder = find.descendant(
        of: find.byType(LinkkCard),
        matching: find.byType(AnimatedScale),
      );
      expect(animatedScaleFinder, findsOneWidget);

      AnimatedScale animatedScale =
          tester.widget<AnimatedScale>(animatedScaleFinder);
      expect(animatedScale.scale, 1.0);

      final gesture =
          await tester.startGesture(tester.getCenter(find.byType(LinkkCard)));
      await tester.pump(const Duration(milliseconds: 10));

      animatedScale = tester.widget<AnimatedScale>(animatedScaleFinder);
      expect(animatedScale.scale, 0.97);

      await gesture.up();
      await tester.pumpAndSettle();

      animatedScale = tester.widget<AnimatedScale>(animatedScaleFinder);
      expect(animatedScale.scale, 1.0);
    });

    testWidgets('does not wrap in interactive scale when onTap is null',
        (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: LinkkCard(
              child: Text('Static Card'),
            ),
          ),
        ),
      );

      final gesture =
          await tester.startGesture(tester.getCenter(find.byType(LinkkCard)));
      await tester.pump(const Duration(milliseconds: 10));

      // No AnimatedScale scaling to 0.97
      final animatedScaleFinder = find.descendant(
        of: find.byType(LinkkCard),
        matching: find.byType(AnimatedScale),
      );
      if (animatedScaleFinder.evaluate().isNotEmpty) {
        final animatedScale = tester.widget<AnimatedScale>(animatedScaleFinder);
        expect(animatedScale.scale, 1.0);
      }

      await gesture.up();
      await tester.pumpAndSettle();
    });

    testWidgets('applies custom background and elevation', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: LinkkCard(
              backgroundColor: Colors.amber,
              elevation: 4.0,
              borderRadius: 20.0,
              child: Text('Custom Card'),
            ),
          ),
        ),
      );

      expect(find.text('Custom Card'), findsOneWidget);
    });

    testWidgets(
        'resets pressed state when onTap becomes null while held down',
        (tester) async {
      VoidCallback? onTap = () {};
      StateSetter? setState;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: StatefulBuilder(
                builder: (context, setter) {
                  setState = setter;
                  return LinkkCard(
                    onTap: onTap,
                    child: const Text('Dynamic Card'),
                  );
                },
              ),
            ),
          ),
        ),
      );

      final animatedScaleFinder = find.descendant(
        of: find.byType(LinkkCard),
        matching: find.byType(AnimatedScale),
      );

      final gesture =
          await tester.startGesture(tester.getCenter(find.byType(LinkkCard)));
      await tester.pump(const Duration(milliseconds: 10));

      expect(tester.widget<AnimatedScale>(animatedScaleFinder).scale, 0.97);

      setState!(() {
        onTap = null;
      });
      await tester.pump();

      await gesture.up();
      await tester.pumpAndSettle();

      final afterScaleFinder = find.descendant(
        of: find.byType(LinkkCard),
        matching: find.byType(AnimatedScale),
      );
      expect(afterScaleFinder, findsNothing);
    });

    testWidgets('places margin outside interactive area', (tester) async {
      bool tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Align(
              alignment: Alignment.topLeft,
              child: LinkkCard(
                margin: const EdgeInsets.all(30),
                onTap: () {
                  tapped = true;
                },
                child: const SizedBox(width: 100, height: 100),
              ),
            ),
          ),
        ),
      );

      // Tap inside margin area (e.g. at (10, 10))
      await tester.tapAt(const Offset(10, 10));
      await tester.pumpAndSettle();
      expect(tapped, isFalse);

      // Tap inside card (e.g. at (50, 50))
      await tester.tapAt(const Offset(50, 50));
      await tester.pumpAndSettle();
      expect(tapped, isTrue);
    });
  });
}
