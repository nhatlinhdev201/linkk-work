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
});
