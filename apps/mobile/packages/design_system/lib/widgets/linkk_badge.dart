import 'package:flutter/material.dart';
import 'package:linkkwork_design_system/theme/linkk_theme.dart';

/// Pill badge widget for statuses, tags, and category labels.
class LinkkBadge extends StatelessWidget {
  final String text;
  final Color color;
  final Widget? icon;
  final TextStyle? textStyle;
  final EdgeInsetsGeometry padding;
  final double borderRadius;

  const LinkkBadge({
    super.key,
    required this.text,
    this.color = LinkkTheme.primary,
    this.icon,
    this.textStyle,
    this.padding = const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    this.borderRadius = 999.0,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(
          color: color.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            icon!,
            const SizedBox(width: 4),
          ],
          Text(
            text,
            style: textStyle ??
                TextStyle(
                  color: color,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ],
      ),
    );
  }
}
