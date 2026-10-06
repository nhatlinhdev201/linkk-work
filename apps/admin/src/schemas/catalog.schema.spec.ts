import test from 'node:test';
import assert from 'node:assert/strict';
import {
  categorySchema,
  serviceSchema,
  addonSchema,
} from './catalog.schema.ts';

test('Catalog Validation Schemas (Zod)', async (t) => {
  await t.test('categorySchema', async (st) => {
    await st.test('1. Rejects short name (< 2 chars) and negative prices', () => {
      const result = categorySchema.safeParse({
        name: 'A',
        defaultBasePrice: -100,
        displayOrder: -1,
      });
      assert.equal(result.success, false);
      if (!result.success) {
        const issues = result.error.issues;
        assert.ok(issues.some((i) => i.path.includes('name')));
        assert.ok(issues.some((i) => i.path.includes('defaultBasePrice')));
        assert.ok(issues.some((i) => i.path.includes('displayOrder')));
      }
    });

    await st.test('2. Accepts valid category data with default pricing', () => {
      const result = categorySchema.safeParse({
        name: 'Vệ sinh công nghiệp',
        slug: 've-sinh-cong-nghiep',
        icon: 'Sparkles',
        description: 'Vệ sinh nhà xưởng công trình',
        defaultPricingType: 'HOURLY',
        defaultBasePrice: 120000,
        defaultUnitLabel: 'giờ',
        displayOrder: 1,
        isActive: true,
      });
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.name, 'Vệ sinh công nghiệp');
        assert.equal(result.data.defaultBasePrice, 120000);
        assert.equal(result.data.defaultPricingType, 'HOURLY');
      }
    });
  });

  await t.test('serviceSchema', async (st) => {
    await st.test('1. Rejects short name and missing categoryId', () => {
      const result = serviceSchema.safeParse({
        name: 'A',
        categoryId: '',
        pricingModel: 'HOURLY',
        basePrice: 100000,
      });
      assert.equal(result.success, false);
      if (!result.success) {
        const issues = result.error.issues;
        assert.ok(issues.some((i) => i.path.includes('name')));
        assert.ok(issues.some((i) => i.path.includes('categoryId')));
      }
    });

    await st.test('2. Requires basePrice > 0 for HOURLY or PER_UNIT pricingModel', () => {
      const resultHourly = serviceSchema.safeParse({
        name: 'Giúp việc nhà',
        categoryId: 'cat-cleaning',
        pricingModel: 'HOURLY',
        basePrice: 0,
      });
      assert.equal(resultHourly.success, false);

      const resultUnit = serviceSchema.safeParse({
        name: 'Vệ sinh máy lạnh',
        categoryId: 'cat-ac',
        pricingModel: 'PER_UNIT',
        basePrice: 0,
      });
      assert.equal(resultUnit.success, false);
    });

    await st.test('3. Allows basePrice = 0 for BIDDING pricingModel', () => {
      const result = serviceSchema.safeParse({
        name: 'Thi công nội thất trọn gói',
        categoryId: 'cat-decor',
        pricingModel: 'BIDDING',
        basePrice: 0,
      });
      assert.equal(result.success, true);
    });

    await st.test('4. Rejects durationHours < 0.1 or minHours < 1', () => {
      const result = serviceSchema.safeParse({
        name: 'Giúp việc theo giờ',
        categoryId: 'cat-cleaning',
        pricingModel: 'HOURLY',
        basePrice: 80000,
        durationHours: 0.05,
        minHours: 0,
      });
      assert.equal(result.success, false);
      if (!result.success) {
        const issues = result.error.issues;
        assert.ok(issues.some((i) => i.path.includes('durationHours')));
        assert.ok(issues.some((i) => i.path.includes('minHours')));
      }
    });

    await st.test('5. Accepts valid service configuration', () => {
      const result = serviceSchema.safeParse({
        name: 'Dọn dẹp nhà ở cơ bản',
        categoryId: 'cat-cleaning',
        pricingModel: 'HOURLY',
        basePrice: 85000,
        unitLabel: 'giờ',
        minHours: 2,
        durationHours: 2,
        description: 'Dọn dẹp phòng khách phòng ngủ',
      });
      assert.equal(result.success, true);
    });
  });

  await t.test('addonSchema', async (st) => {
    await st.test('1. Rejects short name (< 2 chars) and negative price', () => {
      const result = addonSchema.safeParse({
        name: 'A',
        price: -5000,
      });
      assert.equal(result.success, false);
      if (!result.success) {
        const issues = result.error.issues;
        assert.ok(issues.some((i) => i.path.includes('name')));
        assert.ok(issues.some((i) => i.path.includes('price')));
      }
    });

    await st.test('2. Accepts valid addon configuration', () => {
      const result = addonSchema.safeParse({
        name: 'Mang theo máy hút bụi mini',
        price: 30000,
        description: 'Máy hút bụi không dây 120W',
      });
      assert.equal(result.success, true);
    });
  });
});
