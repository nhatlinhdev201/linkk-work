import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:linkkwork_design_system/map/osm_map_picker.dart';

void main() {
  group('OsmMapPicker Widget Tests', () {
    testWidgets('renders map picker with default initial center and pin',
        (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 400,
              height: 600,
              child: OsmMapPicker(),
            ),
          ),
        ),
      );

      // Verify FlutterMap is rendered
      expect(find.byType(FlutterMap), findsOneWidget);

      // Verify Center Pin is rendered
      expect(find.byKey(const Key('osm_map_center_pin')), findsOneWidget);
    });

    testWidgets('renders zoom controls and responds to zoom button clicks',
        (tester) async {
      final mapController = MapController();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 400,
              height: 600,
              child: OsmMapPicker(
                mapController: mapController,
                initialCenter: const LatLng(10.7769, 106.7009),
                initialZoom: 15.0,
                showControls: true,
              ),
            ),
          ),
        ),
      );

      expect(find.byKey(const Key('osm_zoom_in_btn')), findsOneWidget);
      expect(find.byKey(const Key('osm_zoom_out_btn')), findsOneWidget);

      // Tap zoom in
      await tester.tap(find.byKey(const Key('osm_zoom_in_btn')));
      await tester.pump();

      // Tap zoom out
      await tester.tap(find.byKey(const Key('osm_zoom_out_btn')));
      await tester.pump();
    });

    testWidgets('notifies onPositionChanged when camera moves', (tester) async {
      LatLng? updatedPosition;
      final mapController = MapController();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 400,
              height: 600,
              child: OsmMapPicker(
                mapController: mapController,
                initialCenter: const LatLng(10.7769, 106.7009),
                onPositionChanged: (pos) {
                  updatedPosition = pos;
                },
              ),
            ),
          ),
        ),
      );

      // Move map programmatically via controller
      const newPos = LatLng(10.8231, 106.6297);
      mapController.move(newPos, 16.0);
      await tester.pump();

      expect(updatedPosition, isNotNull);
      expect(updatedPosition!.latitude, closeTo(10.8231, 0.001));
      expect(updatedPosition!.longitude, closeTo(106.6297, 0.001));
    });

    testWidgets('allows custom pin widget', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 400,
              height: 600,
              child: OsmMapPicker(
                pinWidget: Icon(Icons.star, key: Key('custom_star_pin')),
              ),
            ),
          ),
        ),
      );

      expect(find.byKey(const Key('custom_star_pin')), findsOneWidget);
    });

    testWidgets('updates center when initialCenter changes via didUpdateWidget',
        (tester) async {
      final mapController = MapController();
      LatLng center = const LatLng(10.7769, 106.7009);
      StateSetter? setState;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 400,
              height: 600,
              child: StatefulBuilder(
                builder: (context, setter) {
                  setState = setter;
                  return OsmMapPicker(
                    mapController: mapController,
                    initialCenter: center,
                  );
                },
              ),
            ),
          ),
        ),
      );

      expect(mapController.camera.center.latitude, closeTo(10.7769, 0.001));
      expect(mapController.camera.center.longitude, closeTo(106.7009, 0.001));

      setState!(() {
        center = const LatLng(21.0285, 105.8542);
      });
      await tester.pump();

      expect(mapController.camera.center.latitude, closeTo(21.0285, 0.001));
      expect(mapController.camera.center.longitude, closeTo(105.8542, 0.001));
    });

    testWidgets('control buttons have tooltips and semantics', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 400,
              height: 600,
              child: OsmMapPicker(),
            ),
          ),
        ),
      );

      expect(find.byTooltip('Phóng to'), findsOneWidget);
      expect(find.byTooltip('Thu nhỏ'), findsOneWidget);
      expect(find.byTooltip('Về vị trí ban đầu'), findsOneWidget);
    });
  });
}
