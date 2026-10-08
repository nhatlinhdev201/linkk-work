import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:linkkwork_design_system/theme/linkk_theme.dart';

/// Tactile button primitive with spring micro-interactions and zero-layout-shift loading.
class LinkkButton extends StatefulWidget {
  final String title;
  final VoidCallback? onPressed;
  final bool isLoading;
  final Color backgroundColor;
  final Color textColor;
  final Widget? icon;
  final double? width;
  final double? height;
  final BorderRadius? borderRadius;
  final EdgeInsetsGeometry? padding;

  const LinkkButton({
    super.key,
    required this.title,
    this.onPressed,
    this.isLoading = false,
    this.backgroundColor = LinkkTheme.primary,
    this.textColor = Colors.white,
    this.icon,
    this.width,
    this.height = 48.0,
    this.borderRadius,
    this.padding,
  });

  @override
  State<LinkkButton> createState() => _LinkkButtonState();
}

class _LinkkButtonState extends State<LinkkButton> {
  bool _isPressed = false;

  bool get _isInteractive => widget.onPressed != null && !widget.isLoading;

  void _handleTapDown(TapDownDetails details) {
    if (!_isInteractive) return;
    setState(() => _isPressed = true);
    HapticFeedback.selectionClick();
  }

  void _handleTapUp(TapUpDetails details) {
    if (!_isInteractive) return;
    setState(() => _isPressed = false);
  }

  void _handleTapCancel() {
    if (!_isInteractive) return;
    setState(() => _isPressed = false);
  }

  @override
  Widget build(BuildContext context) {
    final effectiveBorderRadius =
        widget.borderRadius ?? BorderRadius.circular(12);

    return AnimatedScale(
      scale: _isInteractive && _isPressed ? 0.96 : 1.0,
      duration: LinkkTheme.fastDuration,
      curve: LinkkTheme.defaultCurve,
      child: AnimatedOpacity(
        opacity: widget.onPressed == null ? 0.5 : 1.0,
        duration: LinkkTheme.fastDuration,
        child: GestureDetector(
          onTapDown: _handleTapDown,
          onTapUp: _handleTapUp,
          onTapCancel: _handleTapCancel,
          onTap: _isInteractive ? widget.onPressed : null,
          behavior: HitTestBehavior.opaque,
          child: Container(
            width: widget.width,
            height: widget.height,
            padding: widget.padding ??
                const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: BoxDecoration(
              color: widget.backgroundColor,
              borderRadius: effectiveBorderRadius,
              boxShadow: _isInteractive && !_isPressed
                  ? [
                      BoxShadow(
                        color: widget.backgroundColor.withValues(alpha: 0.24),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ]
                  : null,
            ),
            child: Center(
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Opacity(
                    opacity: widget.isLoading ? 0.0 : 1.0,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (widget.icon != null) ...[
                          widget.icon!,
                          const SizedBox(width: 8),
                        ],
                        Text(
                          widget.title,
                          style: TextStyle(
                            color: widget.textColor,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (widget.isLoading)
                    SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        valueColor:
                            AlwaysStoppedAnimation<Color>(widget.textColor),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
