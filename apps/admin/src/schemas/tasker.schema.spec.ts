import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTaskerSchema,
  updateTaskerSchema,
  workFloorSchema,
  depositSchema,
} from './tasker.schema.ts';

test('Tasker Validation Schemas (Zod)', async (t) => {
  await t.test('createTaskerSchema', async (st) => {
    await st.test('1. Rejects invalid fields: short name, invalid phone, bad email, empty skills', () => {
      const result = createTaskerSchema.safeParse({
        name: 'A',
        phone: '123456',
        email: 'invalid-email',
        skills: [],
      });
      assert.equal(result.success, false);
      if (!result.success) {
        const issues = result.error.issues;
        assert.ok(issues.some((i) => i.path.includes('name')));
        assert.ok(issues.some((i) => i.path.includes('phone')));
        assert.ok(issues.some((i) => i.path.includes('email')));
        assert.ok(issues.some((i) => i.path.includes('skills')));
      }
    });

    await st.test('2. Rejects password < 6 chars and idCardNumber < 9 chars', () => {
      const result = createTaskerSchema.safeParse({
        name: 'Nguyễn Văn A',
        phone: '0901234567',
        email: 'a@example.com',
        skills: ['don-dep'],
        password: '123',
        idCardNumber: '1234',
      });
      assert.equal(result.success, false);
      if (!result.success) {
        const issues = result.error.issues;
        assert.ok(issues.some((i) => i.path.includes('password')));
        assert.ok(issues.some((i) => i.path.includes('idCardNumber')));
      }
    });

    await st.test('3. Rejects invalid depositBalance and maxDistanceKm bounds', () => {
      const result = createTaskerSchema.safeParse({
        name: 'Nguyễn Văn A',
        phone: '0901234567',
        email: 'a@example.com',
        skills: ['don-dep'],
        depositBalance: -100,
        maxDistanceKm: 150,
      });
      assert.equal(result.success, false);
      if (!result.success) {
        const issues = result.error.issues;
        assert.ok(issues.some((i) => i.path.includes('depositBalance')));
        assert.ok(issues.some((i) => i.path.includes('maxDistanceKm')));
      }
    });

    await st.test('4. Accepts valid tasker input and applies default values', () => {
      const result = createTaskerSchema.safeParse({
        name: 'Nguyễn Văn Thợ',
        phone: '0912345678',
        email: 'tho.nguyen@linkkwork.vn',
        skills: ['don-dep-ve-sinh', 'giat-sofa'],
        password: '',
        idCardNumber: '079090123456',
      });
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.name, 'Nguyễn Văn Thợ');
        assert.equal(result.data.depositBalance, 500000);
        assert.equal(result.data.maxDistanceKm, 15);
        assert.equal(result.data.autoRadarEnabled, true);
      }
    });
  });

  await t.test('updateTaskerSchema', async (st) => {
    await st.test('1. Rejects invalid phone if provided in update', () => {
      const result = updateTaskerSchema.safeParse({
        phone: '01234',
      });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.error.issues.some((i) => i.path.includes('phone')));
      }
    });

    await st.test('2. Accepts partial update data', () => {
      const result = updateTaskerSchema.safeParse({
        name: 'Trần Văn Cập Nhật',
        skills: ['dien-lanh'],
        bankName: 'Techcombank',
        bankAccountNumber: '19034567890',
        bankAccountHolder: 'TRAN VAN CAP NHAT',
        salaryType: 'COMMISSION',
      });
      assert.equal(result.success, true);
    });
  });

  await t.test('workFloorSchema', async (st) => {
    await st.test('1. Rejects maxDistanceKm < 1 or > 100', () => {
      const resultLow = workFloorSchema.safeParse({
        maxDistanceKm: 0,
        autoRadarEnabled: true,
      });
      assert.equal(resultLow.success, false);

      const resultHigh = workFloorSchema.safeParse({
        maxDistanceKm: 101,
        autoRadarEnabled: true,
      });
      assert.equal(resultHigh.success, false);
    });

    await st.test('2. Accepts valid workFloor configuration', () => {
      const result = workFloorSchema.safeParse({
        maxDistanceKm: 25,
        autoRadarEnabled: false,
        isOnline: true,
      });
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.maxDistanceKm, 25);
        assert.equal(result.data.autoRadarEnabled, false);
        assert.equal(result.data.isOnline, true);
      }
    });
  });

  await t.test('depositSchema', async (st) => {
    await st.test('1. Rejects amount = 0 and short notes (< 3 chars)', () => {
      const resultZero = depositSchema.safeParse({
        amount: 0,
        notes: 'Nạp cọc',
      });
      assert.equal(resultZero.success, false);

      const resultShortNote = depositSchema.safeParse({
        amount: 200000,
        notes: 'ok',
      });
      assert.equal(resultShortNote.success, false);
    });

    await st.test('2. Accepts valid positive deposit and negative withdrawal', () => {
      const resultPositive = depositSchema.safeParse({
        amount: 500000,
        notes: 'Nạp tiền bảo đảm',
      });
      assert.equal(resultPositive.success, true);

      const resultNegative = depositSchema.safeParse({
        amount: -200000,
        notes: 'Khấu trừ vi phạm',
      });
      assert.equal(resultNegative.success, true);
    });
  });
});
