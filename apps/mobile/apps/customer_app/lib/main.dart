import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:linkkwork_core/linkkwork_core.dart';
import 'package:linkkwork_customer_domain/linkkwork_customer_domain.dart';
import 'package:linkkwork_design_system/linkkwork_design_system.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CustomerApp());
}

/// Service catalog model used for rendering customer catalog cards.
class CustomerServiceItem {
  final String id;
  final String title;
  final String category;
  final double basePrice;
  final String pricingType;
  final String priceFormatted;
  final String rating;
  final String tag;
  final String description;
  final IconData icon;

  const CustomerServiceItem({
    required this.id,
    required this.title,
    required this.category,
    required this.basePrice,
    required this.pricingType,
    required this.priceFormatted,
    required this.rating,
    required this.tag,
    required this.description,
    required this.icon,
  });
}

/// Main Customer Runner Application.
///
/// Strictly isolates customer domain from tasker domain (Zero Code Leakage).
class CustomerApp extends StatelessWidget {
  final DioClient? dioClient;
  final String initialAddress;
  final bool enableAnimations;

  const CustomerApp({
    super.key,
    this.dioClient,
    this.initialAddress = 'Tòa Landmark 81, P. 22, Bình Thạnh, TP.HCM',
    this.enableAnimations = true,
  });

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LinkkWork Khách Hàng',
      debugShowCheckedModeBanner: false,
      theme: LinkkTheme.lightTheme,
      home: CustomerHomeScreen(
        dioClient: dioClient,
        initialAddress: initialAddress,
        enableAnimations: enableAnimations,
      ),
    );
  }
}

/// Home screen featuring location picker banner, staggered category chips,
/// dynamic service cards, and sticky bottom booking CTA.
class CustomerHomeScreen extends StatefulWidget {
  final DioClient? dioClient;
  final String initialAddress;
  final bool enableAnimations;

  const CustomerHomeScreen({
    super.key,
    this.dioClient,
    required this.initialAddress,
    this.enableAnimations = true,
  });

  @override
  State<CustomerHomeScreen> createState() => _CustomerHomeScreenState();
}

class _CustomerHomeScreenState extends State<CustomerHomeScreen> {
  late String _currentAddress;
  String _selectedCategory = 'Tất cả';

  final List<String> _categories = const <String>[
    'Tất cả',
    'Dọn dẹp vệ sinh',
    'Sửa điện nước',
    'Điện lạnh',
    'Sửa khóa & Cửa',
  ];

  final List<CustomerServiceItem> _services = const <CustomerServiceItem>[
    CustomerServiceItem(
      id: 'srv-cleaning-01',
      title: 'Dọn dẹp nhà theo giờ',
      category: 'Dọn dẹp vệ sinh',
      basePrice: 80000.0,
      pricingType: 'HOURLY',
      priceFormatted: '80.000đ/giờ',
      rating: '4.9 ★ (1.2k+ đặt)',
      tag: 'Phổ biến nhất',
      description:
          'Quét dọn, lau sàn, rửa chén bát, gấp quần áo chuyên nghiệp.',
      icon: Icons.cleaning_services_rounded,
    ),
    CustomerServiceItem(
      id: 'srv-ac-01',
      title: 'Vệ sinh máy lạnh treo tường',
      category: 'Điện lạnh',
      basePrice: 150000.0,
      pricingType: 'PER_UNIT',
      priceFormatted: '150.000đ/bộ',
      rating: '4.8 ★ (850+ đặt)',
      tag: 'Khuyên dùng',
      description:
          'Xịt rửa dàn nóng, dàn lạnh, kiểm tra gas, diệt khuẩn tia UV.',
      icon: Icons.ac_unit_rounded,
    ),
    CustomerServiceItem(
      id: 'srv-electric-01',
      title: 'Sửa chữa điện rò rỉ & chập cháy',
      category: 'Sửa điện nước',
      basePrice: 120000.0,
      pricingType: 'HOURLY',
      priceFormatted: '120.000đ/lần',
      rating: '4.9 ★ (640+ đặt)',
      tag: 'Cứu hộ 24/7',
      description:
          'Dò tìm rò rỉ điện âm tường, thay CB chống giật, kiểm tra an toàn.',
      icon: Icons.bolt_rounded,
    ),
    CustomerServiceItem(
      id: 'srv-plumbing-01',
      title: 'Thông tắc bồn cầu & đường ống',
      category: 'Sửa điện nước',
      basePrice: 200000.0,
      pricingType: 'PER_UNIT',
      priceFormatted: '200.000đ/lần',
      rating: '4.7 ★ (430+ đặt)',
      tag: 'Bảo hành 30 ngày',
      description:
          'Xử lý tắc nghẽn bằng máy lò xo chuyên dụng không đục phá tường.',
      icon: Icons.plumbing_rounded,
    ),
    CustomerServiceItem(
      id: 'srv-lock-01',
      title: 'Sửa khóa cửa & Mở khóa cấp tốc',
      category: 'Sửa khóa & Cửa',
      basePrice: 100000.0,
      pricingType: 'PER_UNIT',
      priceFormatted: '100.000đ/lần',
      rating: '4.9 ★ (320+ đặt)',
      tag: 'Có mặt 15p',
      description: 'Mở khóa cửa nhà, khóa xe máy, thay ổ khóa vân tay cao cấp.',
      icon: Icons.lock_open_rounded,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _currentAddress = widget.initialAddress;
  }

  List<CustomerServiceItem> get _filteredServices {
    if (_selectedCategory == 'Tất cả') {
      return _services;
    }
    return _services.where((s) => s.category == _selectedCategory).toList();
  }

  void _openAddressPicker() {
    final textController = TextEditingController(text: _currentAddress);
    showDialog<void>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.location_on_rounded, color: LinkkTheme.primary),
              SizedBox(width: 8),
              Text(
                'Chọn địa chỉ nhận việc',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Nhập địa chỉ nhà hoặc vị trí bạn muốn thợ tới phục vụ:',
                style: TextStyle(fontSize: 14, color: LinkkTheme.textMuted),
              ),
              const SizedBox(height: 12),
              LinkkInput(
                controller: textController,
                label: 'Địa chỉ chi tiết',
                hintText: 'Số nhà, tên đường, phường/xã...',
                prefixIcon: const Icon(Icons.home_outlined),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Hủy'),
            ),
            ElevatedButton(
              onPressed: () {
                if (textController.text.trim().isNotEmpty) {
                  setState(() {
                    _currentAddress = textController.text.trim();
                  });
                }
                Navigator.of(ctx).pop();
              },
              child: const Text('Xác nhận'),
            ),
          ],
        );
      },
    );
  }

  void _openBookingWizard(CustomerServiceItem? service) {
    HapticFeedback.selectionClick();
    final targetService = service ?? _filteredServices.first;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => BookingWizardSheet(
        service: targetService,
        address: _currentAddress,
        enableAnimations: widget.enableAnimations,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LinkkTheme.background,
      appBar: AppBar(
        title: const Text(
          'LinkkWork Khách Hàng',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            tooltip: 'Thông báo',
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          // 1. Header with Location Picker Banner
          _buildLocationBanner(),

          // 2. Main Scrollable Content
          Expanded(
            child: ListView(
              padding: const EdgeInsets.only(
                  left: 16, right: 16, top: 12, bottom: 96),
              children: [
                // Promotion Banner
                _buildPromoBanner(),
                const SizedBox(height: 16),

                // Category Chips Header & Row
                const Text(
                  'Danh mục dịch vụ',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: LinkkTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 10),
                _buildCategoryChips(),
                const SizedBox(height: 20),

                // Service Cards Section Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Dịch vụ phổ biến (${_filteredServices.length})',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: LinkkTheme.textPrimary,
                      ),
                    ),
                    const LinkkBadge(
                      text: 'Giá minh bạch',
                      color: LinkkTheme.primary,
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Service Cards List with Staggered Animation
                ..._buildServiceCardsList(),
              ],
            ),
          ),
        ],
      ),
      // 3. Bottom Sticky CTA Button
      bottomNavigationBar: _buildStickyBottomBar(),
    );
  }

  Widget _buildLocationBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: LinkkTheme.border, width: 1),
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x06000000),
            blurRadius: 4,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: InkWell(
        key: const Key('location_picker_banner'),
        onTap: _openAddressPicker,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(4.0),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: LinkkTheme.primary.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.location_on_rounded,
                  color: LinkkTheme.primary,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Text(
                          'ĐỊA CHỈ NHẬN VIỆC',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: LinkkTheme.primary,
                            letterSpacing: 0.5,
                          ),
                        ),
                        SizedBox(width: 6),
                        Icon(
                          Icons.arrow_drop_down_rounded,
                          size: 16,
                          color: LinkkTheme.primary,
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _currentAddress,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: LinkkTheme.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: LinkkTheme.background,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: LinkkTheme.border),
                ),
                child: const Text(
                  'Thay đổi',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: LinkkTheme.textMuted,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPromoBanner() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: LinkkTheme.primary.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.flash_on_rounded,
                color: LinkkTheme.primary, size: 24),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Đặt thợ siêu tốc 15 phút',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Thuật toán tính giá động theo giờ & khối lượng việc',
                  style: TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryChips() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      clipBehavior: Clip.none,
      child: Row(
        children: List.generate(_categories.length, (index) {
          final cat = _categories[index];
          final isSelected = cat == _selectedCategory;

          Widget chip = Padding(
            padding: const EdgeInsets.only(right: 8),
            child: InkWell(
              key: Key('category_chip_${cat.replaceAll(' ', '_')}'),
              onTap: () {
                HapticFeedback.selectionClick();
                setState(() => _selectedCategory = cat);
              },
              borderRadius: BorderRadius.circular(999),
              child: AnimatedContainer(
                duration: LinkkTheme.fastDuration,
                curve: Curves.easeOutCubic,
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected ? LinkkTheme.primary : Colors.white,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: isSelected ? LinkkTheme.primary : LinkkTheme.border,
                    width: 1.2,
                  ),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: LinkkTheme.primary.withValues(alpha: 0.28),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: Text(
                  cat,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: isSelected ? Colors.white : LinkkTheme.textPrimary,
                  ),
                ),
              ),
            ),
          );

          if (widget.enableAnimations) {
            chip = chip
                .animate()
                .fadeIn(
                    duration: 250.ms,
                    delay: (index * 40).ms,
                    curve: Curves.easeOutCubic)
                .slideX(
                    begin: 0.08,
                    end: 0,
                    duration: 250.ms,
                    curve: Curves.easeOutCubic);
          }

          return chip;
        }),
      ),
    );
  }

  List<Widget> _buildServiceCardsList() {
    return List.generate(_filteredServices.length, (index) {
      final item = _filteredServices[index];

      Widget card = LinkkCard(
        key: Key('service_card_${item.id}'),
        margin: const EdgeInsets.only(bottom: 12),
        onTap: () => _openBookingWizard(item),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: LinkkTheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(item.icon, color: LinkkTheme.primary, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              item.title,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: LinkkTheme.textPrimary,
                              ),
                            ),
                          ),
                          LinkkBadge(
                            text: item.tag,
                            color: LinkkTheme.primary,
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        item.description,
                        style: const TextStyle(
                          fontSize: 12,
                          color: LinkkTheme.textMuted,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1, color: LinkkTheme.border),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.star_rounded,
                        color: Color(0xFFF59E0B), size: 18),
                    const SizedBox(width: 4),
                    Text(
                      item.rating,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: LinkkTheme.textPrimary,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Text(
                      item.priceFormatted,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: LinkkTheme.primary,
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Icon(
                      Icons.arrow_forward_ios_rounded,
                      size: 13,
                      color: LinkkTheme.primary,
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      );

      if (widget.enableAnimations) {
        card = card
            .animate()
            .fadeIn(
                duration: 300.ms,
                delay: (index * 50).ms,
                curve: Curves.easeOutCubic)
            .slideY(
                begin: 0.08,
                end: 0,
                duration: 300.ms,
                curve: Curves.easeOutCubic);
      }

      return card;
    });
  }

  Widget _buildStickyBottomBar() {
    return Container(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 12,
        bottom: MediaQuery.of(context).padding.bottom + 12,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: LinkkTheme.border, width: 1),
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x12000000),
            blurRadius: 10,
            offset: Offset(0, -3),
          ),
        ],
      ),
      child: LinkkButton(
        key: const Key('customer_main_cta_btn'),
        title: 'ĐẶT THỢ NGAY (TÍNH GIÁ ĐỘNG)',
        icon: const Icon(Icons.bolt_rounded, color: Colors.white, size: 20),
        onPressed: () => _openBookingWizard(_filteredServices.first),
      ),
    );
  }
}

/// 4-step modal Booking Wizard with AnimatedSwitcher for zero layout shift.
class BookingWizardSheet extends StatefulWidget {
  final CustomerServiceItem service;
  final String address;
  final bool enableAnimations;

  const BookingWizardSheet({
    super.key,
    required this.service,
    required this.address,
    this.enableAnimations = true,
  });

  @override
  State<BookingWizardSheet> createState() => _BookingWizardSheetState();
}

class _BookingWizardSheetState extends State<BookingWizardSheet> {
  int _currentStep = 1;
  double _units = 2.0;
  late String _address;
  PaymentMethod _paymentMethod = PaymentMethod.cash;
  final TextEditingController _notesController = TextEditingController();
  final String _generatedBookingCode = 'LK-89421';
  late BookingWizardState _domainState;

  @override
  void initState() {
    super.initState();
    _address = widget.address;
    _domainState = BookingWizardState(
      step: _currentStep,
      units: _units,
      address: _address,
      estimatedTotal: _estimatedTotal,
      pricingType: widget.service.pricingType,
      baseUnitPrice: widget.service.basePrice,
    );
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  BookingWizardState get domainState => _domainState;

  double get _estimatedTotal => widget.service.basePrice * _units;

  String _formatVnd(double amount) {
    final s = amount.toInt().toString();
    final formatted = s.replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]}.',
    );
    return '$formattedđ';
  }

  void _nextStep() {
    HapticFeedback.selectionClick();
    if (_currentStep < 4) {
      setState(() {
        _currentStep++;
        _domainState = _domainState.copyWith(
          step: _currentStep,
          units: _units,
          estimatedTotal: _estimatedTotal,
        );
      });
    }
  }

  void _prevStep() {
    HapticFeedback.selectionClick();
    if (_currentStep > 1) {
      setState(() {
        _currentStep--;
        _domainState = _domainState.copyWith(step: _currentStep);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);

    return Container(
      constraints: BoxConstraints(
        maxHeight: mediaQuery.size.height * 0.9,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 10, bottom: 8),
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: LinkkTheme.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header with Step Indicator
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Bước $_currentStep / 4',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: LinkkTheme.primary,
                      ),
                    ),
                    Text(
                      _getStepTitle(_currentStep),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: LinkkTheme.textPrimary,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: LinkkTheme.border),

          // Wizard Body with AnimatedSwitcher (Zero Layout Shift)
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: AnimatedSwitcher(
                duration: LinkkTheme.normalDuration,
                switchInCurve: Curves.easeOutCubic,
                switchOutCurve: Curves.easeInCubic,
                transitionBuilder: (child, animation) {
                  return FadeTransition(
                    opacity: animation,
                    child: child,
                  );
                },
                child: _buildStepContent(_currentStep),
              ),
            ),
          ),

          // Bottom Action Bar
          Container(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 12,
              bottom: mediaQuery.padding.bottom + 12,
            ),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: LinkkTheme.border)),
            ),
            child: Row(
              children: [
                if (_currentStep > 1 && _currentStep < 4) ...[
                  OutlinedButton(
                    key: const Key('wizard_back_btn'),
                    onPressed: _prevStep,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('Quay lại'),
                  ),
                  const SizedBox(width: 12),
                ],
                Expanded(
                  child: LinkkButton(
                    key: const Key('wizard_primary_action_btn'),
                    title: _currentStep == 4
                        ? 'HOÀN TẤT & THEO DÕI ĐƠN'
                        : (_currentStep == 3
                            ? 'XÁC NHẬN ĐẶT THỢ NGAY'
                            : 'TIẾP TỤC BƯỚC TIẾP THEO'),
                    onPressed: () {
                      if (_currentStep == 4) {
                        Navigator.of(context).pop();
                      } else {
                        _nextStep();
                      }
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _getStepTitle(int step) {
    switch (step) {
      case 1:
        return 'Khối lượng & Tính giá';
      case 2:
        return 'Địa chỉ & Vị trí';
      case 3:
        return 'Lịch & Phương thức';
      case 4:
        return 'Xác nhận đơn thành công';
      default:
        return 'Đặt thợ';
    }
  }

  Widget _buildStepContent(int step) {
    switch (step) {
      case 1:
        return _buildStep1();
      case 2:
        return _buildStep2();
      case 3:
        return _buildStep3();
      case 4:
        return _buildStep4();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildStep1() {
    final unitLabel =
        widget.service.pricingType == 'HOURLY' ? 'giờ' : 'bộ / lần';

    return Column(
      key: const ValueKey<int>(1),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Selected Service Card
        LinkkCard(
          backgroundColor: LinkkTheme.background,
          child: Row(
            children: [
              Icon(widget.service.icon, color: LinkkTheme.primary, size: 28),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.service.title,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    Text(
                      widget.service.category,
                      style: const TextStyle(
                          fontSize: 12, color: LinkkTheme.textMuted),
                    ),
                  ],
                ),
              ),
              LinkkBadge(text: widget.service.priceFormatted),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Quantity Selector
        const Text(
          'Chọn khối lượng công việc:',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: LinkkTheme.border),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Khối lượng ($unitLabel):',
                style:
                    const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
              Row(
                children: [
                  IconButton(
                    key: const Key('wizard_decrease_units_btn'),
                    icon: const Icon(Icons.remove_circle_outline),
                    color: _units > 1.0
                        ? LinkkTheme.primary
                        : LinkkTheme.textMuted,
                    onPressed: _units > 1.0
                        ? () {
                            HapticFeedback.selectionClick();
                            setState(() => _units -= 1.0);
                          }
                        : null,
                  ),
                  Text(
                    '${_units.toInt()} $unitLabel',
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    key: const Key('wizard_increase_units_btn'),
                    icon: const Icon(Icons.add_circle_outline),
                    color: LinkkTheme.primary,
                    onPressed: () {
                      HapticFeedback.selectionClick();
                      setState(() => _units += 1.0);
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Dynamic Price Breakdown Container
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: LinkkTheme.primary.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(16),
            border:
                Border.all(color: LinkkTheme.primary.withValues(alpha: 0.24)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.calculate_rounded,
                      color: LinkkTheme.primary, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Dự toán giá động thời gian thực',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: LinkkTheme.textPrimary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Đơn giá niêm yết:',
                      style: TextStyle(color: LinkkTheme.textMuted)),
                  Text(_formatVnd(widget.service.basePrice),
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Hệ số số lượng (${_units.toInt()} $unitLabel):',
                      style: const TextStyle(color: LinkkTheme.textMuted)),
                  Text('${_units.toInt()}x',
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                ],
              ),
              const Divider(height: 18, color: LinkkTheme.border),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Tổng tiền ước tính:',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  Text(
                    _formatVnd(_estimatedTotal),
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 18,
                      color: LinkkTheme.primary,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStep2() {
    return Column(
      key: const ValueKey<int>(2),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Xác nhận địa chỉ giao việc:',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(height: 8),
        LinkkInput(
          label: 'Địa chỉ nhà',
          hintText: 'Nhập địa chỉ cụ thể...',
          prefixIcon: const Icon(Icons.location_on_outlined),
          controller: TextEditingController(text: _address),
          onChanged: (val) => _address = val,
        ),
        const SizedBox(height: 16),

        // Embedded OpenStreetMap Picker Preview
        const Text(
          'Ghim tọa độ hiện trường (GPS):',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(height: 8),
        Container(
          height: 180,
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: LinkkTheme.border),
          ),
          child: const OsmMapPicker(
            showControls: false,
          ),
        ),
        const SizedBox(height: 8),
        const Row(
          children: [
            Icon(Icons.gps_fixed_rounded, size: 14, color: LinkkTheme.primary),
            SizedBox(width: 4),
            Expanded(
              child: Text(
                'Tọa độ: 10.7950° N, 106.7218° E (TP. Hồ Chí Minh)',
                style: TextStyle(fontSize: 12, color: LinkkTheme.textMuted),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStep3() {
    return Column(
      key: const ValueKey<int>(3),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Thời gian thực hiện:',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: LinkkTheme.background,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: LinkkTheme.border),
          ),
          child: const Row(
            children: [
              Icon(Icons.schedule_rounded, color: LinkkTheme.primary),
              SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Giao việc ngay (Ưu tiên)',
                        style: TextStyle(fontWeight: FontWeight.bold)),
                    Text('Thợ đối tác có mặt sau 15-30 phút',
                        style: TextStyle(
                            fontSize: 12, color: LinkkTheme.textMuted)),
                  ],
                ),
              ),
              Icon(Icons.check_circle_rounded, color: LinkkTheme.primary),
            ],
          ),
        ),
        const SizedBox(height: 16),

        const Text(
          'Phương thức thanh toán:',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(height: 8),
        // Payment Method Selector
        _buildPaymentOption(
          method: PaymentMethod.cash,
          title: 'Tiền mặt khi xong việc (COD)',
          desc: 'Trả trực tiếp cho thợ sau khi nghiệm thu hài lòng',
          icon: Icons.payments_rounded,
        ),
        const SizedBox(height: 8),
        _buildPaymentOption(
          method: PaymentMethod.wallet,
          title: 'Ví điện tử LinkkPay',
          desc: 'Thanh toán tự động bảo chứng an toàn qua sàn',
          icon: Icons.account_balance_wallet_rounded,
        ),
        const SizedBox(height: 16),

        LinkkInput(
          controller: _notesController,
          label: 'Ghi chú cho thợ (Không bắt buộc)',
          hintText: 'Ví dụ: Mang theo thang dây, gọi trước khi đến 10 phút...',
          maxLines: 2,
        ),
      ],
    );
  }

  Widget _buildPaymentOption({
    required PaymentMethod method,
    required String title,
    required String desc,
    required IconData icon,
  }) {
    final isSelected = _paymentMethod == method;
    return InkWell(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _paymentMethod = method);
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected
              ? LinkkTheme.primary.withValues(alpha: 0.08)
              : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? LinkkTheme.primary : LinkkTheme.border,
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Row(
          children: [
            Icon(icon,
                color: isSelected ? LinkkTheme.primary : LinkkTheme.textMuted),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: isSelected
                          ? LinkkTheme.primary
                          : LinkkTheme.textPrimary,
                    ),
                  ),
                  Text(desc,
                      style: const TextStyle(
                          fontSize: 12, color: LinkkTheme.textMuted)),
                ],
              ),
            ),
            if (isSelected)
              const Icon(Icons.check_circle_rounded,
                  color: LinkkTheme.primary, size: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildStep4() {
    return Column(
      key: const ValueKey<int>(4),
      children: [
        const SizedBox(height: 10),
        Container(
          width: 68,
          height: 68,
          decoration: BoxDecoration(
            color: LinkkTheme.primary.withValues(alpha: 0.14),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.check_circle_rounded,
            color: LinkkTheme.primary,
            size: 44,
          ),
        ),
        const SizedBox(height: 14),
        const Text(
          'ĐẶT ĐƠN THÀNH CÔNG!',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: LinkkTheme.textPrimary,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Mã đơn hàng: $_generatedBookingCode',
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: LinkkTheme.textMuted,
          ),
        ),
        const SizedBox(height: 14),
        const LinkkBadge(
          text: 'ĐANG PHÁT RADAR TÌM THỢ GẦN BẠN',
          color: LinkkTheme.primary,
        ),
        const SizedBox(height: 20),

        // Summary details card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: LinkkTheme.background,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: LinkkTheme.border),
          ),
          child: Column(
            children: [
              _buildSummaryRow('Dịch vụ:', widget.service.title),
              _buildSummaryRow('Khối lượng:', '${_units.toInt()} đơn vị'),
              _buildSummaryRow('Địa chỉ:', _address),
              _buildSummaryRow(
                'Thanh toán:',
                _paymentMethod == PaymentMethod.cash
                    ? 'Tiền mặt (COD)'
                    : 'Ví LinkkPay',
              ),
              const Divider(height: 16, color: LinkkTheme.border),
              _buildSummaryRow('Tổng tiền:', _formatVnd(_estimatedTotal),
                  isHighlight: true),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryRow(String label, String value,
      {bool isHighlight = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style:
                  const TextStyle(color: LinkkTheme.textMuted, fontSize: 13)),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: TextStyle(
                fontWeight: isHighlight ? FontWeight.bold : FontWeight.w600,
                fontSize: isHighlight ? 16 : 13,
                color:
                    isHighlight ? LinkkTheme.primary : LinkkTheme.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
