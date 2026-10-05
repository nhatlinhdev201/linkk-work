import test from 'node:test';
import assert from 'node:assert/strict';
import { api, STORAGE_KEYS } from './client.ts';

test('Admin Catalog & Dynamic Pricing Integration Suite', async (t) => {
  // Test 1: Category retrieval
  await t.test('1. Live retrieval of service categories returns active categories', async () => {
    const categories = await api.getServiceCategories();
    assert.ok(Array.isArray(categories), 'Categories should be an array');
    assert.ok(categories.length >= 2, 'Should have multiple categories from backend');

    const cleaningCat = categories.find((c) => c.slug === 'don-dep-ve-sinh');
    assert.ok(cleaningCat, 'Cleaning category (don-dep-ve-sinh) should exist');
    assert.equal(cleaningCat.name, 'Dọn dẹp vệ sinh');
    assert.ok(cleaningCat.id, 'Category must have an ID');
  });

  // Test 2: Service retrieval with authentication
  await t.test('2. Live service retrieval returns mapped services with categories and addons', async () => {
    // Log in as Super Admin to get authorization token
    await api.login('admin@linkkwork.vn', 'Admin@123456');

    const services = await api.getServices();
    assert.ok(Array.isArray(services), 'Services should be an array');
    assert.ok(services.length >= 1, 'Should have at least 1 service from database');

    const firstService = services[0];
    assert.ok(firstService.id, 'Service should have an ID');
    assert.ok(firstService.name, 'Service should have a name');
    assert.ok(firstService.pricingModel, 'Service should have a pricingModel');
    assert.ok(typeof firstService.basePrice === 'number', 'Service should have a numerical basePrice');
    assert.ok(Array.isArray(firstService.addons), 'Service should have addons array');
    assert.ok(firstService.categoryName, 'Service should have categoryName');
  });

  // Test 3: Create a new service on live backend
  let createdServiceId = '';
  await t.test('3. Live creation of a service creates and stores it properly', async () => {
    const categories = await api.getServiceCategories();
    const targetCat = categories[0];
    assert.ok(targetCat, 'Target category must exist');

    const uniqueName = `Dịch Vụ Kiểm Thử Live ${Date.now()}`;
    const newService = await api.createService({
      name: uniqueName,
      categoryId: targetCat.id,
      categoryName: targetCat.name,
      description: 'Dịch vụ kiểm thử tự động',
      pricingModel: 'HOURLY',
      basePrice: 120000,
      minHours: 3,
      isActive: true,
      addons: [],
      slug: '',
    });

    assert.ok(newService.id, 'Created service should have an ID');
    assert.equal(newService.name, uniqueName);
    assert.equal(newService.pricingModel, 'HOURLY');
    assert.equal(newService.basePrice, 120000);
    assert.equal(newService.isActive, true);
    createdServiceId = newService.id;

    // Verify it appears in getServices()
    const services = await api.getServices();
    const found = services.find((s) => s.id === createdServiceId);
    assert.ok(found, 'Created service should be returned in services list');
  });

  // Test 4: Toggle service active state
  await t.test('4. Live toggling of service active state updates backend', async () => {
    assert.ok(createdServiceId, 'createdServiceId must be defined');

    // Toggle to inactive
    const toggledOff = await api.toggleServiceActive(createdServiceId, false);
    assert.equal(toggledOff.id, createdServiceId);
    assert.equal(toggledOff.isActive, false);

    // Toggle back to active
    const toggledOn = await api.toggleServiceActive(createdServiceId, true);
    assert.equal(toggledOn.id, createdServiceId);
    assert.equal(toggledOn.isActive, true);
  });

  // Test 5: Dynamic pricing calculation
  await t.test('5. Dynamic pricing calculation calls live pricing engine correctly', async () => {
    // 5a. Hourly calculation
    const hourlyQuote = await api.calculatePrice({
      pricingType: 'HOURLY',
      baseUnitPrice: 80000,
      durationHours: 3,
      areaSurcharge: 20000,
      addonsPrice: 50000,
      surgeMultiplier: 1.0,
      discountAmount: 10000,
    });

    // baseTotal: 3 * 80,000 = 240,000
    // subtotal: 240,000 + 20,000 + 50,000 = 310,000
    // surge: 0
    // preDiscount: 310,000
    // discount: 10,000
    // final: 300,000
    assert.equal(hourlyQuote.baseTotal, 240000);
    assert.equal(hourlyQuote.subtotal, 310000);
    assert.equal(hourlyQuote.surgeAmount, 0);
    assert.equal(hourlyQuote.discountAmount, 10000);
    assert.equal(hourlyQuote.finalTotal, 300000);

    // 5b. Per-unit with surge calculation
    const unitQuote = await api.calculatePrice({
      pricingType: 'PER_UNIT',
      baseUnitPrice: 150000,
      unitCount: 2,
      surgeMultiplier: 1.25,
      discountAmount: 25000,
    });

    // baseTotal: 2 * 150,000 = 300,000
    // subtotal: 300,000
    // surge: round(300,000 * 0.25) = 75,000
    // preDiscount: 375,000
    // discount: 25,000
    // final: 350,000
    assert.equal(unitQuote.baseTotal, 300000);
    assert.equal(unitQuote.subtotal, 300000);
    assert.equal(unitQuote.surgeMultiplier, 1.25);
    assert.equal(unitQuote.surgeAmount, 75000);
    assert.equal(unitQuote.discountAmount, 25000);
    assert.equal(unitQuote.finalTotal, 350000);

    // 5c. Bidding calculation
    const biddingQuote = await api.calculatePrice({
      pricingType: 'BIDDING',
      baseUnitPrice: 600000,
    });

    assert.equal(biddingQuote.baseTotal, 600000);
    assert.equal(biddingQuote.subtotal, 600000);
    assert.equal(biddingQuote.finalTotal, 600000);
  });

  // Cleanup session
  await api.logout();
});
