import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:linkkwork_design_system/theme/linkk_theme.dart';

/// 1x1 transparent PNG byte data to prevent network requests during tests.
final Uint8List _transparent1x1Png = Uint8List.fromList(<int>[
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG header
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
  0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk
  0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, // IEND chunk
  0x42, 0x60, 0x82,
]);

/// In-memory no-op TileProvider used in widget test environments.
class _TestTileProvider extends TileProvider {
  @override
  ImageProvider getImage(TileCoordinates coordinates, TileLayer options) {
    return MemoryImage(_transparent1x1Png);
  }
}

/// OpenStreetMap location picker with tactile bouncing center pin
/// and fluid zoom controls.
class OsmMapPicker extends StatefulWidget {
  final LatLng initialCenter;
  final double initialZoom;
  final ValueChanged<LatLng>? onPositionChanged;
  final MapController? mapController;
  final TileProvider? tileProvider;
  final Widget? pinWidget;
  final bool showControls;

  const OsmMapPicker({
    super.key,
    this.initialCenter = const LatLng(10.7769, 106.7009), // TP. Hồ Chí Minh
    this.initialZoom = 15.0,
    this.onPositionChanged,
    this.mapController,
    this.tileProvider,
    this.pinWidget,
    this.showControls = true,
  });

  @override
  State<OsmMapPicker> createState() => _OsmMapPickerState();
}

class _OsmMapPickerState extends State<OsmMapPicker> {
  late LatLng _currentCenter;
  bool _isMoving = false;
  late MapController _controller;
  bool _ownsController = false;

  @override
  void initState() {
    super.initState();
    _currentCenter = widget.initialCenter;
    if (widget.mapController != null) {
      _controller = widget.mapController!;
    } else {
      _controller = MapController();
      _ownsController = true;
    }
  }

  @override
  void didUpdateWidget(covariant OsmMapPicker oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.mapController != widget.mapController) {
      if (_ownsController) {
        _controller.dispose();
      }
      if (widget.mapController != null) {
        _controller = widget.mapController!;
        _ownsController = false;
      } else {
        _controller = MapController();
        _ownsController = true;
      }
    }
    if (oldWidget.initialCenter != widget.initialCenter) {
      _currentCenter = widget.initialCenter;
      _controller.move(widget.initialCenter, widget.initialZoom);
    }
  }

  @override
  void dispose() {
    if (_ownsController) {
      _controller.dispose();
    }
    super.dispose();
  }

  void _zoomIn() {
    final zoom = _controller.camera.zoom;
    _controller.move(_currentCenter, (zoom + 1.0).clamp(3.0, 19.0));
  }

  void _zoomOut() {
    final zoom = _controller.camera.zoom;
    _controller.move(_currentCenter, (zoom - 1.0).clamp(3.0, 19.0));
  }

  void _recenter() {
    _controller.move(widget.initialCenter, widget.initialZoom);
  }

  TileProvider _resolveTileProvider() {
    if (widget.tileProvider != null) {
      return widget.tileProvider!;
    }
    final isTest =
        WidgetsBinding.instance.runtimeType.toString().contains('Test') ||
            const bool.fromEnvironment('FLUTTER_TEST');
    if (isTest) {
      return _TestTileProvider();
    }
    return NetworkTileProvider();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        // 1. FlutterMap with OpenStreetMap Tile Layer
        FlutterMap(
          mapController: _controller,
          options: MapOptions(
            initialCenter: widget.initialCenter,
            initialZoom: widget.initialZoom,
            minZoom: 3.0,
            maxZoom: 19.0,
            onPositionChanged: (camera, hasGesture) {
              _currentCenter = camera.center;
              widget.onPositionChanged?.call(_currentCenter);
            },
            onMapEvent: (event) {
              if (event is MapEventMoveStart ||
                  event is MapEventFlingAnimationStart) {
                if (!_isMoving) {
                  setState(() => _isMoving = true);
                }
              } else if (event is MapEventMoveEnd ||
                  event is MapEventFlingAnimationEnd) {
                if (_isMoving) {
                  setState(() => _isMoving = false);
                }
              }
            },
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.linkkwork.app',
              tileProvider: _resolveTileProvider(),
            ),
          ],
        ),

        // 2. Tactile Center Pin with Physics Bounce & Ground Shadow
        Center(
          child: IgnorePointer(
            key: const Key('osm_map_center_pin'),
            child: Transform.translate(
              // Negative offset equals pin height (40px) to anchor pin tip directly at center
              offset: const Offset(0, -20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AnimatedSlide(
                    offset: _isMoving ? const Offset(0, -0.25) : Offset.zero,
                    duration: LinkkTheme.fastDuration,
                    curve: Curves.easeOutBack,
                    child: widget.pinWidget ??
                        Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: LinkkTheme.primary,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                            boxShadow: [
                              BoxShadow(
                                color:
                                    LinkkTheme.primary.withValues(alpha: 0.35),
                                blurRadius: 8,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.location_on_rounded,
                            size: 28,
                            color: Colors.white,
                          ),
                        ),
                  ),
                  const SizedBox(height: 2),
                  AnimatedContainer(
                    duration: LinkkTheme.fastDuration,
                    width: _isMoving ? 8 : 14,
                    height: _isMoving ? 3 : 5,
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(
                        alpha: _isMoving ? 0.15 : 0.35,
                      ),
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),

        // 3. Zoom Controls Floating Panel
        if (widget.showControls)
          Positioned(
            right: 16,
            bottom: 24,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _MapControlButton(
                  key: const Key('osm_zoom_in_btn'),
                  icon: Icons.add,
                  tooltip: 'Phóng to',
                  onTap: _zoomIn,
                ),
                const SizedBox(height: 8),
                _MapControlButton(
                  key: const Key('osm_zoom_out_btn'),
                  icon: Icons.remove,
                  tooltip: 'Thu nhỏ',
                  onTap: _zoomOut,
                ),
                const SizedBox(height: 8),
                _MapControlButton(
                  key: const Key('osm_recenter_btn'),
                  icon: Icons.my_location,
                  tooltip: 'Về vị trí ban đầu',
                  onTap: _recenter,
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _MapControlButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final String? tooltip;

  const _MapControlButton({
    super.key,
    required this.icon,
    required this.onTap,
    this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    Widget button = Material(
      color: Colors.white,
      elevation: 2,
      shadowColor: Colors.black26,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: SizedBox(
          width: 42,
          height: 42,
          child: Icon(
            icon,
            size: 22,
            color: LinkkTheme.textPrimary,
          ),
        ),
      ),
    );

    if (tooltip != null) {
      button = Tooltip(
        message: tooltip!,
        child: Semantics(
          button: true,
          label: tooltip,
          child: button,
        ),
      );
    }

    return button;
  }
}
