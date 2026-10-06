import test from 'node:test';
import assert from 'node:assert/strict';
import { api } from './client.ts';
import type { ServiceCategory, PricingModel } from '../types/index.ts';

// Helper simulating Smart Pricing Inheritance in UI
export function resolveServiceFormDefaults(category?: ServiceCategory) {
  return {
    pricingModel: (category?.defaultPricingType || 'HOURLY') as PricingModel,
    basePrice: category?.defaultBasePrice ?? 80000,
    unitLabel: category?.defaultUnitLabel || (category?.defaultPricingType === 'HOURLY' ? 'giờ' : 'lần'),
  };
}

test('Admin Catalog Management & Custom Pricing CRUD Integration Suite', async (t) => {
  // Login as Super Admin
  await api.login('admin@linkkwork.vn', 'Admin@123456');

  let testCatId = '';
  let testServiceId = '';
  let testAddonId = '';

  // 1. Category CRUD
  await t.test('1. Category CRUD with custom default pricing configuration', async () => {
    const uniqueCatName = `Nhóm Kiểm Thử Tự Động ${Date.now()}`;
    const newCat = await api.createCategory({
      name: uniqueCatName,
      description: 'Nhóm dịch vụ kiểm thử với giá mặc định riêng',
      defaultPricingType: 'HOURLY',
      defaultBasePrice: 95000,
      defaultUnitLabel: 'giờ',
      displayOrder: 99,
    });

    assert.ok(newCat.id, 'New category must have an ID');
    assert.equal(newCat.name, uniqueCatName);
    assert.equal(newCat.defaultPricingType, 'HOURLY');
    assert.equal(newCat.defaultBasePrice, 95000);
    assert.equal(newCat.defaultUnitLabel, 'giờ');
    testCatId = newCat.id;

    // Check in getServiceCategories(true)
    const allCategories = await api.getServiceCategories(true);
    const found = allCategories.find((c) => c.id === testCatId);
    assert.ok(found, 'Created category must exist in list of all categories');
    assert.equal(found.defaultBasePrice, 95000);

    // Update category
    const updatedCat = await api.updateCategory(testCatId, {
      name: `${uniqueCatName} (Đã Sửa)`,
      defaultBasePrice: 105000,
      defaultUnitLabel: 'buổi',
    });
    assert.equal(updatedCat.id, testCatId);
    assert.equal(updatedCat.defaultBasePrice, 105000);
    assert.equal(updatedCat.defaultUnitLabel, 'buổi');
  });

  // 2. Service CRUD & Smart Pricing Inheritance
  await t.test('2. Service creation with smart pricing inheritance and update/delete', async () => {
    const categories = await api.getServiceCategories(true);
    const targetCat = categories.find((c) => c.id === testCatId);
    assert.ok(targetCat, 'Target category must exist');

    // Verify smart inheritance helper
    const inherited = resolveServiceFormDefaults(targetCat);
    assert.equal(inherited.pricingModel, 'HOURLY');
    assert.equal(inherited.basePrice, 105000);
    assert.equal(inherited.unitLabel, 'buổi');

    // Create service inheriting defaults with an override
    const serviceName = `Dịch Vụ Test CRUD ${Date.now()}`;
    const newService = await api.createService({
      name: serviceName,
      categoryId: targetCat.id,
      categoryName: targetCat.name,
      description: 'Dịch vụ được tạo trong test CRUD',
      pricingModel: inherited.pricingModel,
      basePrice: inherited.basePrice,
      unitLabel: inherited.unitLabel,
      minHours: 2,
      isActive: true,
      addons: [],
      slug: '',
    });

    assert.ok(newService.id, 'Created service must have an ID');
    assert.equal(newService.basePrice, 105000);
    testServiceId = newService.id;

    // Update service
    const updatedService = await api.updateService(testServiceId, {
      name: `${serviceName} (Đã Sửa Đơn Giá)`,
      basePrice: 125000,
      unitLabel: 'ca làm',
    });
    assert.equal(updatedService.id, testServiceId);
    assert.equal(updatedService.basePrice, 125000);
    assert.equal(updatedService.unitLabel, 'ca làm');
  });

  // 3. Addon CRUD
  await t.test('3. Addon creation, update and deletion for a service', async () => {
    assert.ok(testServiceId, 'Service must exist before adding addons');

    // Create Addon
    const newAddon = await api.createAddon(testServiceId, {
      name: 'Khử mùi thảo mộc thiên nhiên',
      price: 45000,
      description: 'Xịt khử mùi hương xả chanh',
    });

    assert.ok(newAddon.id, 'Created addon must have an ID');
    assert.equal(newAddon.name, 'Khử mùi thảo mộc thiên nhiên');
    assert.equal(newAddon.price, 45000);
    testAddonId = newAddon.id;

    // Update Addon
    const updatedAddon = await api.updateAddon(testAddonId, {
      name: 'Khử mùi thảo mộc cao cấp',
      price: 55000,
      isActive: true,
    });
    assert.equal(updatedAddon.id, testAddonId);
    assert.equal(updatedAddon.price, 55000);

    // Delete Addon
    await api.deleteAddon(testAddonId);

    // Verify service addons list
    const services = await api.getServices();
    const service = services.find((s) => s.id === testServiceId);
    assert.ok(!service?.addons.some((a) => a.id === testAddonId), 'Deleted addon must no longer exist');
  });

  // 4. Cleanup: Delete service and category
  await t.test('4. Delete service and category cleanly', async () => {
    // Delete service
    await api.deleteService(testServiceId);
    const services = await api.getServices();
    assert.ok(!services.some((s) => s.id === testServiceId), 'Deleted service must not exist');

    // Delete category
    await api.deleteCategory(testCatId);
    const categories = await api.getServiceCategories(true);
    assert.ok(!categories.some((c) => c.id === testCatId), 'Deleted category must not exist');
  });

  await api.logout();
});
