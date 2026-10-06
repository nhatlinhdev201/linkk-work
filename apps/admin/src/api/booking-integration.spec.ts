import test from 'node:test';
import assert from 'node:assert/strict';
import { api, STORAGE_KEYS } from './client.ts';
import type { Booking, Tasker } from '../types/index.ts';

test('Admin Booking & Dispatch Engine Integration Suite', async (t) => {
  let partnerTenantId = '';
  let availableTaskerId = '';

  // Setup: Login as Partner Admin Ánh Dương
  await t.test('1. Partner Admin logs in and acquires tenant authentication context', async () => {
    const user = await api.login('admin@anhduong.vn', 'Partner@123456');
    assert.ok(user, 'User should be returned');
    assert.equal(user.email, 'admin@anhduong.vn');
    assert.ok(user.tenantId, 'User must have a tenantId');
    partnerTenantId = user.tenantId;

    const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
    const token = storage?.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    assert.ok(token, 'Access token should be stored in localStorage');
  });

  // Test 2: Fetch available taskers for dispatch
  await t.test('2. Live retrieval of available taskers for servicing tenant', async () => {
    const taskers = await api.getTaskers(partnerTenantId);
    assert.ok(Array.isArray(taskers), 'Taskers should be an array');
    assert.ok(taskers.length >= 1, 'Should find at least 1 tasker for tenant Ánh Dương');

    const tasker = taskers[0];
    assert.ok(tasker.id, 'Tasker must have an ID');
    assert.ok(tasker.name, 'Tasker must have a name');
    assert.ok(tasker.phone, 'Tasker must have a phone number');
    availableTaskerId = tasker.id;
  });

  // Test 3: Create manual booking via Web Admin API
  let createdBookingId = '';
  await t.test('3. Live creation of manual booking calculates price and records booking', async () => {
    const scheduledTime = new Date(Date.now() + 86400000).toISOString();
    const newBooking = await api.createManualBooking(
      partnerTenantId,
      'Công ty Vệ Sinh Ánh Dương',
      {
        customerName: 'Khách Test Web Admin',
        customerPhone: '0987654321',
        addressText: '789 Đường Nguyễn Huệ, Quận 1, TP.HCM',
        serviceName: 'Dọn dẹp nhà theo giờ',
        pricingType: 'HOURLY',
        scheduledAt: scheduledTime,
        durationHours: 3,
        totalAmount: 240000,
      }
    );

    assert.ok(newBooking, 'Created booking should be returned');
    assert.ok(newBooking.id, 'Booking must have an ID');
    assert.ok(newBooking.code.startsWith('BK-'), 'Booking code must follow BK- format');
    assert.equal(newBooking.customerName, 'Khách Test Web Admin');
    assert.equal(newBooking.status, 'PENDING_DISPATCH');
    assert.equal(newBooking.servicingTenantId, partnerTenantId);
    assert.ok(newBooking.totalAmount > 0, 'Total amount must be positive');

    createdBookingId = newBooking.id;
  });

  // Test 4: Retrieve live bookings list
  await t.test('4. Live retrieval of bookings includes the created booking', async () => {
    const bookings = await api.getBookings(partnerTenantId);
    assert.ok(Array.isArray(bookings), 'Bookings should be an array');
    assert.ok(bookings.length >= 1, 'Should have at least 1 booking');

    const found = bookings.find((b) => b.id === createdBookingId);
    assert.ok(found, 'Created booking should exist in the tenant bookings list');
    assert.equal(found.customerName, 'Khách Test Web Admin');
  });

  // Test 5: Get booking by ID
  await t.test('5. Retrieve booking details by ID', async () => {
    const booking = await api.getBookingById(createdBookingId);
    assert.ok(booking, 'Booking details should be returned');
    assert.equal(booking.id, createdBookingId);
    assert.equal(booking.customerName, 'Khách Test Web Admin');
  });

  // Test 6: Direct tasker assignment via Dispatch Console
  await t.test('6. Direct tasker assignment transitions booking to ASSIGNED', async () => {
    assert.ok(availableTaskerId, 'Tasker ID must be available');
    const assigned = await api.directAssignBooking(
      createdBookingId,
      availableTaskerId,
      partnerTenantId
    );

    assert.ok(assigned, 'Assigned booking should be returned');
    assert.equal(assigned.id, createdBookingId);
    assert.equal(assigned.status, 'ASSIGNED');
    assert.equal(assigned.assignedTaskerId, availableTaskerId);
    assert.ok(assigned.assignedTaskerName, 'Assigned tasker name should be populated');
  });

  // Test 7: Broadcast booking on radar
  await t.test('7. Broadcasting booking transitions status to BROADCASTING', async () => {
    // Create another booking to broadcast
    const anotherBooking = await api.createManualBooking(
      partnerTenantId,
      'Công ty Vệ Sinh Ánh Dương',
      {
        customerName: 'Khách Radar Sàn',
        customerPhone: '0912345678',
        addressText: '101 Lê Lợi, Quận 1, TP.HCM',
        serviceName: 'Dọn dẹp nhà theo giờ',
        pricingType: 'HOURLY',
        scheduledAt: new Date(Date.now() + 100000000).toISOString(),
        durationHours: 2,
        totalAmount: 160000,
      }
    );

    const broadcasted = await api.broadcastInternalBooking(anotherBooking.id);
    assert.ok(broadcasted, 'Broadcasted booking should be returned');
    assert.equal(broadcasted.id, anotherBooking.id);
    assert.equal(broadcasted.status, 'BROADCASTING');
  });

  // Test 8: Complete booking lifecycle transitions
  await t.test(
    '8. Complete booking lifecycle transitions: PENDING_DISPATCH -> ASSIGNED -> ARRIVING -> IN_PROGRESS -> PENDING_ACCEPTANCE -> COMPLETED',
    async () => {
      // 1. Create a fresh booking (PENDING_DISPATCH)
      const freshBooking = await api.createManualBooking(
        partnerTenantId,
        'Công ty Vệ Sinh Ánh Dương',
        {
          customerName: 'Khách Quy Trình Toàn Trình',
          customerPhone: '0977889900',
          addressText: '456 Điện Biên Phủ, Bình Thạnh',
          serviceName: 'Dọn dẹp nhà trọn gói',
          pricingType: 'HOURLY',
          scheduledAt: new Date(Date.now() + 180000000).toISOString(),
          durationHours: 4,
          totalAmount: 320000,
        }
      );
      assert.equal(freshBooking.status, 'PENDING_DISPATCH', 'Initial status must be PENDING_DISPATCH');

      // 2. Direct Assign -> ASSIGNED
      const assigned = await api.directAssignBooking(
        freshBooking.id,
        availableTaskerId,
        partnerTenantId
      );
      assert.equal(assigned.status, 'ASSIGNED', 'Status must transition to ASSIGNED');
      assert.equal(assigned.assignedTaskerId, availableTaskerId);

      // 3. ARRIVING
      const arriving = await api.transitionBookingStatus(
        freshBooking.id,
        'ARRIVING',
        'Thợ bắt đầu xuất phát tới địa chỉ'
      );
      assert.equal(arriving.status, 'ARRIVING', 'Status must transition to ARRIVING');

      // 4. IN_PROGRESS
      const inProgress = await api.transitionBookingStatus(
        freshBooking.id,
        'IN_PROGRESS',
        'Thợ đã có mặt và bắt đầu dọn dẹp'
      );
      assert.equal(inProgress.status, 'IN_PROGRESS', 'Status must transition to IN_PROGRESS');

      // 5. PENDING_ACCEPTANCE
      const pendingAcceptance = await api.transitionBookingStatus(
        freshBooking.id,
        'PENDING_ACCEPTANCE',
        'Thợ đã hoàn thành công việc và gửi báo cáo nghiệm thu'
      );
      assert.equal(
        pendingAcceptance.status,
        'PENDING_ACCEPTANCE',
        'Status must transition to PENDING_ACCEPTANCE'
      );

      // 6. COMPLETED
      const completed = await api.transitionBookingStatus(
        freshBooking.id,
        'COMPLETED',
        'Khách hàng nghiệm thu đạt chất lượng và hoàn tất đơn hàng'
      );
      assert.equal(completed.status, 'COMPLETED', 'Status must transition to COMPLETED');
    }
  );

  await t.test(
    '9. Cancellation flow records cancellation reason and note: transitions to CANCELLED',
    async () => {
      // Create a fresh booking to test cancellation
      const cancelTarget = await api.createManualBooking(
        partnerTenantId,
        'Công ty Vệ Sinh Ánh Dương',
        {
          customerName: 'Trần Văn Hủy',
          customerPhone: '0909999888',
          addressText: '456 Lê Duẩn, Bến Nghé, Quận 1, TP.HCM',
          serviceName: 'Dọn dẹp nhà theo giờ',
          pricingType: 'HOURLY',
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          durationHours: 2,
          totalAmount: 160000,
        }
      );
      assert.ok(cancelTarget.id);

      const cancelReason = 'Khách hàng yêu cầu hủy hẹn / đổi kế hoạch: Bận công tác đột xuất';
      const cancelledBooking = await api.transitionBookingStatus(
        cancelTarget.id,
        'CANCELLED',
        cancelReason,
        partnerTenantId
      );

      assert.equal(cancelledBooking.status, 'CANCELLED');
    }
  );

  await t.test(
    '10. Admin rework rejection (PENDING_ACCEPTANCE -> IN_PROGRESS) and direct completion (IN_PROGRESS -> COMPLETED)',
    async () => {
      const reworkTarget = await api.createManualBooking(
        partnerTenantId,
        'Công ty Vệ Sinh Ánh Dương',
        {
          customerName: 'Hoàng Thị Thử Nghiệm',
          customerPhone: '0918889999',
          addressText: '12 Nguyễn Thị Minh Khai, Q1',
          serviceName: 'Dọn dẹp nhà theo giờ',
          pricingType: 'HOURLY',
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          durationHours: 2,
          totalAmount: 160000,
        }
      );
      assert.ok(reworkTarget.id);

      // Assign & advance to PENDING_ACCEPTANCE
      await api.directAssignBooking(reworkTarget.id, availableTaskerId, partnerTenantId);
      await api.transitionBookingStatus(reworkTarget.id, 'ARRIVING', 'Thợ xuất phát', partnerTenantId);
      await api.transitionBookingStatus(reworkTarget.id, 'IN_PROGRESS', 'Thợ bắt đầu làm', partnerTenantId);
      await api.transitionBookingStatus(reworkTarget.id, 'PENDING_ACCEPTANCE', 'Báo cáo nghiệm thu', partnerTenantId);

      // Admin rejects acceptance: PENDING_ACCEPTANCE -> IN_PROGRESS
      const reworkBooking = await api.transitionBookingStatus(
        reworkTarget.id,
        'IN_PROGRESS',
        'Nghiệm thu chưa đạt, yêu cầu lau dọn lại phòng khách',
        partnerTenantId
      );
      assert.equal(reworkBooking.status, 'IN_PROGRESS');

      // Admin directly completes: IN_PROGRESS -> COMPLETED
      const completedBooking = await api.transitionBookingStatus(
        reworkTarget.id,
        'COMPLETED',
        'Nghiệm thu lại đạt chuẩn 5 sao',
        partnerTenantId
      );
      assert.equal(completedBooking.status, 'COMPLETED');

      // Fetch booking details to verify audit events
      const detail = await api.getBookingById(reworkTarget.id);
      assert.equal(detail.status, 'COMPLETED');
      if (detail.events) {
        assert.ok(detail.events.length >= 4, 'Should record all state change events');
      }
    }
  );
});

