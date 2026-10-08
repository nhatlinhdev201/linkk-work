import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:linkkwork_core/linkkwork_core.dart';
import 'package:linkkwork_design_system/linkkwork_design_system.dart';
import 'package:linkkwork_tasker_domain/linkkwork_tasker_domain.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const TaskerApp());
}

/// Tasker Runner Application.
///
/// Strictly isolates tasker domain from customer domain (Zero Code Leakage).
class TaskerApp extends StatelessWidget {
  final DioClient? dioClient;
  final SocketClientService? socketService;
  final LocationService? locationService;
  final bool enableAnimations;
  final bool initialOnline;
  final bool initialIncomingJob;

  const TaskerApp({
    super.key,
    this.dioClient,
    this.socketService,
    this.locationService,
    this.enableAnimations = true,
    this.initialOnline = true,
    this.initialIncomingJob = true,
  });

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LinkkWork Thợ Đối Tác',
      debugShowCheckedModeBanner: false,
      theme: LinkkTheme.lightTheme,
      home: TaskerHomeScreen(
        dioClient: dioClient,
        socketService: socketService,
        locationService: locationService,
        enableAnimations: enableAnimations,
        initialOnline: initialOnline,
        initialIncomingJob: initialIncomingJob,
      ),
    );
  }
}

/// Main Tasker Screen featuring top status bar, center radar ripple scanner,
/// incoming job alert card with 30s countdown, and 4-step work order execution track.
class TaskerHomeScreen extends StatefulWidget {
  final DioClient? dioClient;
  final SocketClientService? socketService;
  final LocationService? locationService;
  final bool enableAnimations;
  final bool initialOnline;
  final bool initialIncomingJob;

  const TaskerHomeScreen({
    super.key,
    this.dioClient,
    this.socketService,
    this.locationService,
    this.enableAnimations = true,
    this.initialOnline = true,
    this.initialIncomingJob = true,
  });

  @override
  State<TaskerHomeScreen> createState() => _TaskerHomeScreenState();
}

class _TaskerHomeScreenState extends State<TaskerHomeScreen> {
  late bool _isOnline;
  late bool _hasIncomingJob;
  int _countdownSeconds = 30;
  Timer? _countdownTimer;

  // Work Order Execution Step:
  // 0 = Idle / Radar Scanning
  // 1 = Xuất phát (Arriving)
  // 2 = Check-in (In Progress - Anti-Mock GPS)
  // 3 = Nghiệm thu (Pending Acceptance)
  // 4 = Thu COD (Completed - Double-Entry Ledger)
  int _workOrderStep = 0;

  double _depositBalance = 1500000.0;
  final double _minDepositRequired = 500000.0;

  // Active Job Details
  final String _currentBookingId = 'BK-RADAR-9812';
  final String _jobTitle = 'Vệ sinh 2 bộ máy lạnh treo tường Inverter';
  final String _jobCustomer = 'Chị Thảo (0912***456)';
  final String _jobAddress = 'Hẻm 243 Ung Văn Khiêm, P. 25, Bình Thạnh';
  final double _jobDistanceKm = 1.8;
  final double _jobGrossAmount = 300000.0;
  final double _jobCommissionRate = 0.15; // 15% sàn

  // Tasker Domain State References
  late TaskerStatusState _taskerStatusDomain;
  late JobRadarState _jobRadarDomain;

  @override
  void initState() {
    super.initState();
    _isOnline = widget.initialOnline;
    _hasIncomingJob = widget.initialIncomingJob;

    _taskerStatusDomain = TaskerStatusLoaded(
      isOnline: _isOnline,
      depositBalance: _depositBalance,
      minDeposit: _minDepositRequired,
    );

    _jobRadarDomain = _hasIncomingJob
        ? JobRadarAlertState(
            bookingData: <String, dynamic>{
              'id': _currentBookingId,
              'serviceName': _jobTitle,
              'amount': _jobGrossAmount,
            },
            remainingSeconds: _countdownSeconds,
          )
        : const JobRadarIdleState();

    if (_hasIncomingJob && widget.enableAnimations) {
      _startCountdown();
    }
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  void _startCountdown() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_countdownSeconds > 1) {
        setState(() {
          _countdownSeconds--;
          _jobRadarDomain = JobRadarAlertState(
            bookingData: <String, dynamic>{
              'id': _currentBookingId,
              'serviceName': _jobTitle,
              'amount': _jobGrossAmount,
            },
            remainingSeconds: _countdownSeconds,
          );
        });
      } else {
        timer.cancel();
        setState(() {
          _hasIncomingJob = false;
          _countdownSeconds = 30;
          _jobRadarDomain = const JobRadarIdleState();
        });
      }
    });
  }

  void _toggleAvailability(bool value) {
    HapticFeedback.selectionClick();
    if (value && _depositBalance < _minDepositRequired) {
      _showDepositWarning();
      return;
    }

    setState(() {
      _isOnline = value;
      _taskerStatusDomain = TaskerStatusLoaded(
        isOnline: _isOnline,
        depositBalance: _depositBalance,
        minDeposit: _minDepositRequired,
      );
      if (!_isOnline) {
        _hasIncomingJob = false;
        _countdownTimer?.cancel();
        _jobRadarDomain = const JobRadarIdleState();
      }
    });
  }

  void _showDepositWarning() {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: LinkkTheme.alert),
            SizedBox(width: 8),
            Text('Số dư ký quỹ không đủ'),
          ],
        ),
        content: Text(
          'Số dư ký quỹ tối thiểu để bật nhận việc là ${_formatVnd(_minDepositRequired)}. Vui lòng nạp thêm cọc.',
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Đã hiểu'),
          ),
        ],
      ),
    );
  }

  void _handleClaimJob() {
    HapticFeedback.selectionClick();
    _countdownTimer?.cancel();
    setState(() {
      _hasIncomingJob = false;
      _workOrderStep = 1; // Advance to Step 1: Xuất phát
      _jobRadarDomain = JobClaimSuccessState(
        booking: <String, dynamic>{
          'id': _currentBookingId,
          'status': BookingStatus.arriving.value,
        },
      );
    });
  }

  void _dismissJobAlert() {
    HapticFeedback.selectionClick();
    _countdownTimer?.cancel();
    setState(() {
      _hasIncomingJob = false;
      _countdownSeconds = 30;
      _jobRadarDomain = const JobRadarIdleState();
    });
  }

  void _advanceWorkOrder() {
    HapticFeedback.selectionClick();
    setState(() {
      if (_workOrderStep < 4) {
        _workOrderStep++;
      } else {
        // Step 4 Completed: Settle double-entry cash ledger
        final double commission = _jobGrossAmount * _jobCommissionRate;
        _depositBalance -= commission;
        _workOrderStep = 0; // Return to radar scanning
        _taskerStatusDomain = TaskerStatusLoaded(
          isOnline: _isOnline,
          depositBalance: _depositBalance,
          minDeposit: _minDepositRequired,
        );
        _jobRadarDomain = const JobRadarIdleState();
      }
    });
  }

  String _formatVnd(double amount) {
    final s = amount.toInt().toString();
    final formatted = s.replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]}.',
    );
    return '$formattedđ';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LinkkTheme.background,
      appBar: AppBar(
        title: const Text(
          'LinkkWork Thợ Đối Tác',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.account_balance_wallet_outlined),
            tooltip: 'Ví ký quỹ',
            onPressed: () {},
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 1. Top Bar with LinkkBadge ('ONLINE' / 'OFFLINE') and availability switch
          _buildTopStatusBar(),
          const SizedBox(height: 16),

          // If a Work Order is active, show the 4-step progress execution track
          if (_workOrderStep > 0) ...[
            _buildWorkOrderExecutionTrack(),
            const SizedBox(height: 16),
          ],

          // 2. Center Radar Screen with Infinite Radar Ripple Pulse animation
          _buildCenterRadarScreen(),
          const SizedBox(height: 16),

          // 3. Incoming Job Alert Card with 30-second countdown indicator
          if (_hasIncomingJob && _workOrderStep == 0) ...[
            _buildIncomingJobAlertCard(),
            const SizedBox(height: 16),
          ],
        ],
      ),
    );
  }

  Widget _buildTopStatusBar() {
    return LinkkCard(
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: LinkkTheme.secondary,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Center(
                  child: Text(
                    'AN',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Nguyễn Văn An',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: LinkkTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 16),
                        const SizedBox(width: 3),
                        const Text(
                          '4.95 ★ • 320 ca xong',
                          style: TextStyle(fontSize: 12, color: LinkkTheme.textMuted),
                        ),
                        const SizedBox(width: 8),
                        LinkkBadge(
                          text: 'Ví: ${_formatVnd(_depositBalance)}',
                          color: LinkkTheme.primary,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: LinkkTheme.border),
          const SizedBox(height: 12),
          // Status Badge ('ONLINE' / 'OFFLINE') & Availability Switch
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  LinkkBadge(
                    key: const Key('tasker_status_badge'),
                    text: _isOnline ? 'ONLINE' : 'OFFLINE',
                    color: _isOnline ? LinkkTheme.primary : LinkkTheme.textMuted,
                    icon: Icon(
                      _isOnline ? Icons.sensors_rounded : Icons.power_settings_new_rounded,
                      size: 14,
                      color: _isOnline ? LinkkTheme.primary : LinkkTheme.textMuted,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    _isOnline ? 'Đang sẵn sàng nhận việc' : 'Đang tạm dừng nhận việc',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: _isOnline ? LinkkTheme.textPrimary : LinkkTheme.textMuted,
                    ),
                  ),
                ],
              ),
              Switch(
                key: const Key('tasker_availability_switch'),
                value: _isOnline,
                activeThumbColor: LinkkTheme.primary,
                activeTrackColor: LinkkTheme.primary.withValues(alpha: 0.35),
                onChanged: _toggleAvailability,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCenterRadarScreen() {
    return Container(
      key: const Key('tasker_radar_container'),
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A), // Slate Navy Dark Canvas
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFF334155)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33000000),
            blurRadius: 16,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          // Radar pulse visual container
          SizedBox(
            height: 180,
            width: 180,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Ripple Ring 3
                if (_isOnline && widget.enableAnimations)
                  _buildPulseRing(size: 170, delayMs: 1200)
                else
                  _buildStaticRing(size: 170),

                // Ripple Ring 2
                if (_isOnline && widget.enableAnimations)
                  _buildPulseRing(size: 120, delayMs: 600)
                else
                  _buildStaticRing(size: 120),

                // Ripple Ring 1
                if (_isOnline && widget.enableAnimations)
                  _buildPulseRing(size: 70, delayMs: 0)
                else
                  _buildStaticRing(size: 70),

                // Center Beacon Core
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: _isOnline ? LinkkTheme.primary : const Color(0xFF475569),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: _isOnline
                            ? LinkkTheme.primary.withValues(alpha: 0.5)
                            : Colors.transparent,
                        blurRadius: 16,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: Icon(
                    _isOnline ? Icons.radar_rounded : Icons.radar_outlined,
                    color: Colors.white,
                    size: 28,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Radar Status Text
          Text(
            _isOnline
                ? 'Đang quét việc trong bán kính 10km...'
                : 'Đang Offline - Không quét việc',
            key: const Key('tasker_radar_status_text'),
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: _isOnline ? const Color(0xFF34D399) : const Color(0xFF94A3B8),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            _isOnline
                ? 'Kết nối WebSocket độ trễ <50ms • Hỗ trợ Atomic CAS'
                : 'Bật trực tuyến ở trên để mở quét radar nhận việc ngay',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 12,
              color: Color(0xFF94A3B8),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPulseRing({required double size, required int delayMs}) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: LinkkTheme.primary.withValues(alpha: 0.35),
          width: 1.5,
        ),
      ),
    )
        .animate(onPlay: (controller) => controller.repeat())
        .scale(
          begin: const Offset(0.7, 0.7),
          end: const Offset(1.15, 1.15),
          duration: 2200.ms,
          curve: Curves.easeOutCubic,
          delay: delayMs.ms,
        )
        .fadeOut(
          duration: 2200.ms,
          curve: Curves.easeOutCubic,
          delay: delayMs.ms,
        );
  }

  Widget _buildStaticRing({required double size}) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: const Color(0xFF334155),
          width: 1.0,
        ),
      ),
    );
  }

  Widget _buildIncomingJobAlertCard() {
    final double countdownRatio = (_countdownSeconds / 30.0).clamp(0.0, 1.0);

    return Container(
      key: const Key('tasker_incoming_job_card'),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF59E0B), width: 1.8),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFF59E0B).withValues(alpha: 0.16),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Alert Countdown Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFBEB),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.bolt_rounded, color: Color(0xFFD97706), size: 20),
                    SizedBox(width: 6),
                    Text(
                      'ĐƠN VIỆC MỚI BẮN RADAR',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFFD97706),
                        letterSpacing: 0.3,
                      ),
                    ),
                  ],
                ),
                LinkkBadge(
                  key: const Key('tasker_countdown_badge'),
                  text: '$_countdownSeconds s',
                  color: const Color(0xFFD97706),
                ),
              ],
            ),
          ),

          // Countdown Linear Bar
          LinearProgressIndicator(
            value: countdownRatio,
            backgroundColor: const Color(0xFFFDE68A),
            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFD97706)),
            minHeight: 3,
          ),

          // Job Details
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _jobTitle,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: LinkkTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                _buildJobDetailRow(Icons.person_outline_rounded, 'Khách hàng:', _jobCustomer),
                const SizedBox(height: 4),
                _buildJobDetailRow(Icons.location_on_outlined, 'Địa chỉ:', '$_jobAddress ($_jobDistanceKm km)'),
                const SizedBox(height: 4),
                _buildJobDetailRow(
                  Icons.payments_outlined,
                  'Thu nhập dự kiến:',
                  '${_formatVnd(_jobGrossAmount)} (Tiền mặt COD)',
                  highlight: true,
                ),
                const SizedBox(height: 4),
                _buildJobDetailRow(
                  Icons.receipt_long_outlined,
                  'Hoa hồng sàn 15%:',
                  '-${_formatVnd(_jobGrossAmount * _jobCommissionRate)} (Trích từ ví ký quỹ)',
                ),
                const SizedBox(height: 16),

                // Action Buttons
                LinkkButton(
                  key: const Key('tasker_claim_job_btn'),
                  title: 'NHẬN VIỆC NGAY - ATOMIC CAS',
                  icon: const Icon(Icons.flash_on_rounded, color: Colors.white, size: 20),
                  onPressed: _handleClaimJob,
                ),
                const SizedBox(height: 8),
                Center(
                  child: TextButton(
                    onPressed: _dismissJobAlert,
                    child: const Text(
                      'Bỏ qua đơn này',
                      style: TextStyle(color: LinkkTheme.textMuted, fontSize: 13),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildJobDetailRow(IconData icon, String label, String value, {bool highlight = false}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: highlight ? LinkkTheme.primary : LinkkTheme.textMuted),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(fontSize: 13, color: LinkkTheme.textMuted),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: highlight ? FontWeight.bold : FontWeight.w600,
              color: highlight ? LinkkTheme.primary : LinkkTheme.textPrimary,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildWorkOrderExecutionTrack() {
    final stepTitles = <String>[
      'Xuất phát',
      'Check-in',
      'Nghiệm thu',
      'Thu COD',
    ];

    return Container(
      key: const Key('tasker_work_order_track'),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: LinkkTheme.primary, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: LinkkTheme.primary.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'TIẾN ĐỘ THỰC HIỆN ĐƠN #$_currentBookingId',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: LinkkTheme.primary,
                  letterSpacing: 0.5,
                ),
              ),
              LinkkBadge(
                text: 'Bước $_workOrderStep / 4',
                color: LinkkTheme.primary,
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Stepper milestone icons
          Row(
            children: List.generate(4, (index) {
              final stepNum = index + 1;
              final isDone = stepNum < _workOrderStep;
              final isCurrent = stepNum == _workOrderStep;

              return Expanded(
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isDone || isCurrent
                                  ? LinkkTheme.primary
                                  : LinkkTheme.background,
                              border: Border.all(
                                color: isDone || isCurrent
                                    ? LinkkTheme.primary
                                    : LinkkTheme.border,
                                width: 1.5,
                              ),
                            ),
                            child: Center(
                              child: isDone
                                  ? const Icon(Icons.check, size: 16, color: Colors.white)
                                  : Text(
                                      '$stepNum',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: isCurrent ? Colors.white : LinkkTheme.textMuted,
                                      ),
                                    ),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            stepTitles[index],
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: isCurrent ? FontWeight.bold : FontWeight.w500,
                              color: isCurrent ? LinkkTheme.primary : LinkkTheme.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (index < 3)
                      Container(
                        width: 20,
                        height: 2,
                        color: isDone ? LinkkTheme.primary : LinkkTheme.border,
                      ),
                  ],
                ),
              );
            }),
          ),
          const SizedBox(height: 16),
          const Divider(height: 1, color: LinkkTheme.border),
          const SizedBox(height: 14),

          // Step context description
          _buildStepContextContent(_workOrderStep),
          const SizedBox(height: 14),

          // Action Button to advance
          LinkkButton(
            key: const Key('tasker_advance_step_btn'),
            title: _getStepActionTitle(_workOrderStep),
            onPressed: _advanceWorkOrder,
          ),
        ],
      ),
    );
  }

  Widget _buildStepContextContent(int step) {
    switch (step) {
      case 1:
        return const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Bước 1: Xuất phát tới địa điểm',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            SizedBox(height: 4),
            Text(
              'Trạng thái đơn: ARRIVING. Vui lòng di chuyển theo lộ trình bản đồ tới nhà khách hàng.',
              style: TextStyle(fontSize: 13, color: LinkkTheme.textMuted),
            ),
          ],
        );
      case 2:
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: LinkkTheme.primary.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Bước 2: Check-in hiện trường & Phòng chống gian lận',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              SizedBox(height: 4),
              Text(
                '✓ Hardware GPS: Hợp lệ\n✓ Anti-Fraud: Không phát hiện Mock GPS\nĐơn chuyển sang IN_PROGRESS. Bắt đầu thực hiện công việc.',
                style: TextStyle(fontSize: 13, color: LinkkTheme.primary, height: 1.4),
              ),
            ],
          ),
        );
      case 3:
        return const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Bước 3: Nghiệm thu công việc',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            SizedBox(height: 4),
            Text(
              'Trạng thái đơn: PENDING_ACCEPTANCE. Đã chụp ảnh kết quả máy lạnh sạch sẽ, khách hàng đồng ý nghiệm thu.',
              style: TextStyle(fontSize: 13, color: LinkkTheme.textMuted),
            ),
          ],
        );
      case 4:
        final commission = _jobGrossAmount * _jobCommissionRate;
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFF0FDF4),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: LinkkTheme.primary.withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Bước 4: Thu tiền mặt COD & Sổ cái kế toán kép',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              const SizedBox(height: 6),
              Text(
                '• Bút toán 1: +${_formatVnd(_jobGrossAmount)} (Tiền mặt COD khách trả)\n• Bút toán 2: -${_formatVnd(commission)} (Phí hoa hồng sàn 15% trích ví ký quỹ)',
                style: const TextStyle(fontSize: 13, color: LinkkTheme.primary, height: 1.4),
              ),
            ],
          ),
        );
      default:
        return const SizedBox.shrink();
    }
  }

  String _getStepActionTitle(int step) {
    switch (step) {
      case 1:
        return 'TỚI NƠI ➔ CHECK-IN GPS HIỆN TRƯỜNG';
      case 2:
        return 'HOÀN THÀNH VIỆC ➔ GỬI NGHIỆM THU';
      case 3:
        return 'XÁC NHẬN THU TIỀN MẶT COD (300.000đ)';
      case 4:
        return 'ĐỐI SOÁT XONG ➔ QUAY LẠI QUÉT RADAR';
      default:
        return 'TIẾP TỤC';
    }
  }

  // Public getters for domain testing
  TaskerStatusState get taskerStatusDomain => _taskerStatusDomain;
  JobRadarState get jobRadarDomain => _jobRadarDomain;
}
