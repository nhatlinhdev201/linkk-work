import test from 'node:test';
import assert from 'node:assert/strict';
import { api } from './client.ts';
import type { Tasker, WalletTransaction } from '../types/index.ts';

test('Admin Tasker & HRM API Client Integration Suite', async (t) => {
  let partnerTenantId = '';
  let createdTaskerId = '';

  // Setup: Login as Partner Admin Ánh Dương
  await t.test('1. Partner Admin logs in and acquires authentication context', async () => {
    const user = await api.login('admin@anhduong.vn', 'Partner@123456');
    assert.ok(user, 'User should be returned');
    assert.equal(user.email, 'admin@anhduong.vn');
    assert.ok(user.tenantId, 'User must have a tenantId');
    partnerTenantId = user.tenantId;
  });

  // Test 2: Fetch taskers for tenant
  await t.test('2. Live retrieval of taskers for servicing tenant', async () => {
    const taskers = await api.getTaskers(partnerTenantId);
    assert.ok(Array.isArray(taskers), 'Taskers should be an array');
    assert.ok(taskers.length >= 1, 'Should find taskers for tenant Ánh Dương');

    const first = taskers[0];
    assert.ok(first.id, 'Tasker must have an ID');
    assert.ok(first.name, 'Tasker must have a name');
    assert.ok(first.phone, 'Tasker must have a phone number');
    assert.equal(typeof first.depositBalance, 'number', 'depositBalance must be a number');
    assert.equal(typeof first.isOnline, 'boolean', 'isOnline must be a boolean');
  });

  // Test 3: Create new tasker via ApiClient
  await t.test('3. Create new tasker account and profile via api.createTasker', async () => {
    const randomPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
    const randomEmail = `tasker_${Date.now()}@anhduong.vn`;

    const created = await api.createTasker({
      name: 'Nguyễn Văn Kiểm Thử API',
      phone: randomPhone,
      email: randomEmail,
      password: 'Tasker@123456',
      idCardNumber: '079090999888',
      skills: ['don-dep-ve-sinh', 'giat-ghe-sofa'],
      depositBalance: 500000,
      maxDistanceKm: 15,
      autoRadarEnabled: true,
      bankName: 'Vietcombank',
      bankAccountNumber: '0071000123456',
      bankAccountHolder: 'NGUYEN VAN KIEM THU API',
    }, partnerTenantId);

    assert.ok(created, 'Created tasker should be returned');
    assert.ok(created.id, 'Tasker must have an ID');
    assert.equal(created.name, 'Nguyễn Văn Kiểm Thử API');
    assert.equal(created.phone, randomPhone);
    assert.equal(created.depositBalance, 500000);
    assert.equal(created.maxDistanceKm, 15);
    assert.equal(created.autoRadarEnabled, true);

    createdTaskerId = created.id;
  });

  // Test 4: Retrieve tasker by ID
  await t.test('4. Retrieve tasker details by ID via api.getTaskerById', async () => {
    const tasker = await api.getTaskerById(createdTaskerId);
    assert.ok(tasker, 'Tasker should be found');
    assert.equal(tasker.id, createdTaskerId);
    assert.equal(tasker.name, 'Nguyễn Văn Kiểm Thử API');
  });

  // Test 5: Query taskers with filters
  await t.test('5. Query taskers with search filter', async () => {
    const found = await api.getTaskers(partnerTenantId, {
      search: 'Kiểm Thử API',
    });
    assert.ok(Array.isArray(found), 'Result should be an array');
    assert.ok(found.some((t) => t.id === createdTaskerId), 'Created tasker should be found in search');
  });

  // Test 6: Update tasker info
  await t.test('6. Update tasker profile details via api.updateTasker', async () => {
    const updated = await api.updateTasker(createdTaskerId, {
      name: 'Nguyễn Văn Đã Cập Nhật',
      salaryType: 'FIXED_SALARY',
      bankName: 'Techcombank',
    });

    assert.ok(updated, 'Updated tasker should be returned');
    assert.equal(updated.name, 'Nguyễn Văn Đã Cập Nhật');
    assert.equal(updated.salaryType, 'FIXED_SALARY');
  });

  // Test 7: Update work floor
  await t.test('7. Update work floor radius and radar via api.updateWorkFloor', async () => {
    const res = await api.updateWorkFloor(createdTaskerId, {
      maxDistanceKm: 25,
      autoRadarEnabled: false,
    });

    assert.equal(res.maxDistanceKm, 25);
    assert.equal(res.autoRadarEnabled, false);

    const tasker = await api.getTaskerById(createdTaskerId);
    assert.equal(tasker?.maxDistanceKm, 25);
    assert.equal(tasker?.autoRadarEnabled, false);
  });

  // Test 8: Toggle status
  await t.test('8. Toggle online/offline status via api.toggleTaskerStatus', async () => {
    const toggle1 = await api.toggleTaskerStatus(createdTaskerId);
    assert.equal(typeof toggle1.isOnline, 'boolean');

    const toggle2 = await api.toggleTaskerStatus(createdTaskerId);
    assert.equal(toggle2.isOnline, !toggle1.isOnline);
  });

  // Test 9: Adjust deposit balance (top up & deduction)
  await t.test('9. Adjust deposit balance with ledger via api.adjustTaskerDeposit', async () => {
    // Top-up 200,000
    const topUpRes = await api.adjustTaskerDeposit(createdTaskerId, {
      amount: 200000,
      notes: 'Nạp cọc đảm bảo hợp đồng',
    });

    assert.ok(topUpRes.taskerProfile, 'taskerProfile must be returned');
    assert.equal(topUpRes.taskerProfile.depositBalance, 700000); // 500,000 + 200,000
    assert.ok(topUpRes.transaction, 'Ledger transaction must be created');
    assert.equal(topUpRes.transaction.amount, 200000);
    assert.equal(topUpRes.transaction.direction, 'IN');

    // Deduct 100,000
    const deductRes = await api.adjustTaskerDeposit(createdTaskerId, {
      amount: -100000,
      notes: 'Khấu trừ phí đào tạo nghề',
    });

    assert.equal(deductRes.taskerProfile.depositBalance, 600000);
    assert.equal(deductRes.transaction.amount, 100000);
    assert.equal(deductRes.transaction.direction, 'OUT');
  });

  // Test 10: Tasker transactions history
  await t.test('10. Retrieve tasker transaction ledger history via api.getTaskerTransactions', async () => {
    const txs = await api.getTaskerTransactions(createdTaskerId);
    assert.ok(Array.isArray(txs), 'Transactions should be an array');
    assert.ok(txs.length >= 2, 'Should have at least 2 transactions (top-up and deduct)');
    assert.ok(txs.some((tx) => tx.amount === 200000 && tx.direction === 'IN'));
    assert.ok(txs.some((tx) => tx.amount === 100000 && tx.direction === 'OUT'));
  });

  // Test 11: Update KYC
  await t.test('11. Update KYC verification status via api.updateTaskerKyc', async () => {
    const res = await api.updateTaskerKyc(createdTaskerId, {
      kycVerified: true,
      idCardNumber: '079090999888',
      notes: 'Đã đối chiếu trực tiếp CCCD gắn chip',
    });

    assert.equal(res.kycVerified, true);
    assert.equal(res.idCardNumber, '079090999888');

    const tasker = await api.getTaskerById(createdTaskerId);
    assert.equal(tasker?.kycVerified, true);
  });
});
