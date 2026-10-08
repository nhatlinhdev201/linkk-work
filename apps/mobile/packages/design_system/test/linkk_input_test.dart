import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:linkkwork_design_system/widgets/linkk_input.dart';

void main() {
  group('LinkkInput Widget Tests', () {
    testWidgets('renders label and hint text correctly', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: LinkkInput(
              label: 'Full Name',
              hintText: 'Enter your name',
            ),
          ),
        ),
      );

      expect(find.text('Full Name'), findsOneWidget);
      expect(find.text('Enter your name'), findsOneWidget);
    });

    testWidgets('allows typing text and invokes onChanged', (tester) async {
      String changedText = '';
      final controller = TextEditingController();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LinkkInput(
              controller: controller,
              onChanged: (val) {
                changedText = val;
              },
            ),
          ),
        ),
      );

      await tester.enterText(find.byType(TextField), 'John Doe');
      await tester.pump();

      expect(controller.text, 'John Doe');
      expect(changedText, 'John Doe');
    });

    testWidgets('renders prefix and suffix icons when provided',
        (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: LinkkInput(
              prefixIcon: Icon(Icons.person, key: Key('prefix-icon')),
              suffixIcon: Icon(Icons.clear, key: Key('suffix-icon')),
            ),
          ),
        ),
      );

      expect(find.byKey(const Key('prefix-icon')), findsOneWidget);
      expect(find.byKey(const Key('suffix-icon')), findsOneWidget);
    });

    testWidgets('displays error text when provided', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: LinkkInput(
              errorText: 'Phone number is required',
            ),
          ),
        ),
      );

      expect(find.text('Phone number is required'), findsOneWidget);
    });

    testWidgets('obscures text when obscureText is true', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: LinkkInput(
              obscureText: true,
            ),
          ),
        ),
      );

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.obscureText, isTrue);
    });

    testWidgets('respects enabled flag', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: LinkkInput(
              enabled: false,
              hintText: 'Disabled input',
            ),
          ),
        ),
      );

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.enabled, isFalse);
    });

    testWidgets('adapts colors in dark theme mode', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData.dark(),
          home: const Scaffold(
            body: LinkkInput(
              label: 'Dark Mode Input',
              hintText: 'Enter value',
            ),
          ),
        ),
      );

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.decoration?.fillColor, const Color(0xFF1E293B));
    });
  });
}
