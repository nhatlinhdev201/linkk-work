import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:linkkwork_design_system/theme/linkk_theme.dart';

/// Tactile card container with subtle shadow, border, and tap physics.
class LinkkCard extends StatefulWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color backgroundColor;
  final double borderRadius;
  final BoxBorder? border;
  final double elevation;
  final VoidCallback? onTap;

  const LinkkCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin,
    this.backgroundColor = Colors.white,
    this.borderRadius = 16.0,
    this.border,
    this.elevation = 0.0,
    this.onTap,
  });

  @override
  State<LinkkCard> createState() => _LinkkCardState();
}

class _LinkkCardState extends State<LinkkCard> {
  bool _isPressed = false;

  void _handleTapDown(TapDownDetails details) {
    if (widget.onTap == null) return;
    setState(() => _isPressed = true);
    HapticFeedback.selectionClick();
  }

  void _handleTapUp(TapUpDetails details) {
    if (widget.onTap == null) return;
    setState(() => _isPressed = false);
  }

  void _handleTapCancel() {
    if (widget.onTap == null) return;
    setState(() => _isPressed = false);
  }

  @override
  Widget build(BuildContext context) {
    final effectiveBorder = widget.border ??
        Border.all(
          color: LinkkTheme.border,
          width: 1,
        );

    final cardContent = Container(
      margin: widget.margin,
      decoration: BoxDecoration(
        color: widget.backgroundColor,
        borderRadius: BorderRadius.circular(widget.borderRadius),
        border: effectiveBorder,
        boxShadow: widget.elevation > 0
            ? [
                BoxShadow(
                  color: Colors.black.withValues(
                    alpha: (0.04 * widget.elevation.clamp(1.0, 4.0)).toDouble(),
                  ),
                  blurRadius: widget.elevation * 4,
                  offset: Offset(0, widget.elevation),
                ),
              ]
            : const [
                BoxShadow(
                  color: Color(0x0A000000), // ~4% subtle drop shadow
                  blurRadius: 4,
                  offset: Offset(0, 1),
                ),
              ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(widget.borderRadius),
        child: Padding(
          padding: widget.padding ?? const EdgeInsets.all(16),
          child: widget.child,
        ),
      ),
    );

    if (widget.onTap == null) {
      return cardContent;
    }

    return AnimatedScale(
      scale: _isPressed ? 0.97 : 1.0,
      duration: LinkkTheme.fastDuration,
      curve: LinkkTheme.defaultCurve,
      child: GestureDetector(
        onTapDown: _handleTapDown,
        onTapUp: _handleTapUp,
        onTapCancel: _handleTapCancel,
        onTap: widget.onTap,
        behavior: HitTestBehavior.opaque,
        child: cardContent,
      ),
    );
  }
}
