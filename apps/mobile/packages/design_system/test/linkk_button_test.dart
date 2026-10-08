import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:linkkwork_design_system/widgets/linkk_button.dart';

void main() {
  group('LinkkButton Widget Tests', () {
    testWidgets('renders title and default styling', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LinkkButton(
              title: 'Confirm Booking',
              onPressed: () {},
            ),
          ),
        ),
      );

      expect(find.text('Confirm Booking'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsNothing);
    });

    testWidgets('triggers onPressed callback when tapped', (tester) async {
      bool tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LinkkButton(
              title: 'Tap Me',
              onPressed: () {
                tapped = true;
              },
            ),
          ),
        ),
      );

      await tester.tap(find.text('Tap Me'));
      await tester.pumpAndSettle();

      expect(tapped, isTrue);
    });

    testWidgets(
        'shows loading indicator and disables tap when isLoading is true',
        (tester) async {
      bool tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LinkkButton(
              title: 'Submit',
              isLoading: true,
              onPressed: () {
                tapped = true;
              },
            ),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      await tester.tap(find.byType(LinkkButton));
      await tester.pump();

      expect(tapped, isFalse);
    });

    testWidgets('renders leading icon when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LinkkButton(
              title: 'With Icon',
              icon: const Icon(Icons.add, key: Key('add-icon')),
              onPressed: () {},
            ),
          ),
        ),
      );

      expect(find.byKey(const Key('add-icon')), findsOneWidget);
      expect(find.text('With Icon'), findsOneWidget);
    });

    testWidgets(
        'scales down to 0.96 on pointer down and returns to 1.0 on release',
        (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: LinkkButton(
                title: 'Tactile Test',
                onPressed: () {},
              ),
            ),
          ),
        ),
      );

      final animatedScaleFinder = find.descendant(
        of: find.byType(LinkkButton),
        matching: find.byType(AnimatedScale),
      );
      expect(animatedScaleFinder, findsOneWidget);

      AnimatedScale animatedScale =
          tester.widget<AnimatedScale>(animatedScaleFinder);
      expect(animatedScale.scale, 1.0);

      final gesture =
          await tester.startGesture(tester.getCenter(find.byType(LinkkButton)));
      await tester.pump(const Duration(milliseconds: 10));

      animatedScale = tester.widget<AnimatedScale>(animatedScaleFinder);
      expect(animatedScale.scale, 0.96);

      await gesture.up();
      await tester.pumpAndSettle();

      animatedScale = tester.widget<AnimatedScale>(animatedScaleFinder);
      expect(animatedScale.scale, 1.0);
    });

    testWidgets('disabled state does not respond when onPressed is null',
        (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: LinkkButton(
              title: 'Disabled',
              onPressed: null,
            ),
          ),
        ),
      );

      final animatedScaleFinder = find.descendant(
        of: find.byType(LinkkButton),
        matching: find.byType(AnimatedScale),
      );
      AnimatedScale animatedScale =
          tester.widget<AnimatedScale>(animatedScaleFinder);
      expect(animatedScale.scale, 1.0);

      // Tap on disabled button
      final gesture =
          await tester.startGesture(tester.getCenter(find.byType(LinkkButton)));
      await tester.pump(const Duration(milliseconds: 10));

      animatedScale = tester.widget<AnimatedScale>(animatedScaleFinder);
      // Scale should NOT decrease for disabled button
      expect(animatedScale.scale, 1.0);

      await gesture.up();
      await tester.pumpAndSettle();
    });

    testWidgets(
        'releases pressed state properly when loading begins while held down',
        (tester) async {
      bool isLoading = false;
      StateSetter? setState;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: StatefulBuilder(
                builder: (context, setter) {
                  setState = setter;
                  return LinkkButton(
                    title: 'Loading Transition Test',
                    isLoading: isLoading,
                    onPressed: () {},
                  );
                },
              ),
            ),
          ),
        ),
      );

      final animatedScaleFinder = find.descendant(
        of: find.byType(LinkkButton),
        matching: find.byType(AnimatedScale),
      );

      // Start gesture (press down)
      final gesture =
          await tester.startGesture(tester.getCenter(find.byType(LinkkButton)));
      await tester.pump(const Duration(milliseconds: 10));

      var animatedScale = tester.widget<AnimatedScale>(animatedScaleFinder);
      expect(animatedScale.scale, 0.96);

      // Trigger loading while pressed
      setState!(() {
        isLoading = true;
      });
      await tester.pump();

      // didUpdateWidget should reset _isPressed
      animatedScale = tester.widget<AnimatedScale>(animatedScaleFinder);
      expect(animatedScale.scale, 1.0);

      // Release gesture - shouldn't get stuck
      await gesture.up();
      await tester.pump(const Duration(milliseconds: 200));

      animatedScale = tester.widget<AnimatedScale>(animatedScaleFinder);
      expect(animatedScale.scale, 1.0);
    });

    testWidgets('exposes button semantics with title label', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LinkkButton(
              title: 'Checkout',
              onPressed: () {},
            ),
          ),
        ),
      );

      expect(
        find.byWidgetPredicate(
          (w) =>
              w is Semantics &&
              w.properties.button == true &&
              w.properties.enabled == true &&
              w.properties.label == 'Checkout',
        ),
        findsOneWidget,
      );
    });
  });
}
