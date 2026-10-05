import test from 'node:test';
import assert from 'node:assert/strict';
import { api, STORAGE_KEYS } from './client.ts';

test('Admin Auth & Impersonation Integration Suite', async (t) => {
  // Test 1: Super Admin login
  await t.test('1. Live login with Super Admin admin@linkkwork.vn returns accessToken and user profile', async () => {
    const user = await api.login('admin@linkkwork.vn', 'Admin@123456');
    assert.ok(user, 'User object should be returned');
    assert.equal(user.email, 'admin@linkkwork.vn');
    assert.equal(user.role, 'SUPER_ADMIN');
    assert.equal(user.isSuperAdmin, true);
    assert.ok(user.tenantId, 'Super Admin should have a tenantId');

    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    assert.ok(token, 'Access token should be stored in localStorage');
    assert.ok(refreshToken, 'Refresh token should be stored in localStorage');
  });

  // Test 2: Calling /auth/me with Bearer token works
  await t.test('2. Calling /auth/me with Bearer token works and retrieves current user profile', async () => {
    const me = await api.getCurrentUser();
    assert.ok(me, 'Current user should be returned');
    assert.equal(me?.email, 'admin@linkkwork.vn');
    assert.equal(me?.role, 'SUPER_ADMIN');
  });

  // Test 3: Impersonation switching works
  await t.test('3. Impersonation switching works for Super Admin', async () => {
    const tenants = await api.getTenants();
    assert.ok(Array.isArray(tenants), 'Tenants should be an array');
    assert.ok(tenants.length >= 2, 'Should have multiple tenants');
    const anhDuong = tenants.find((item) => item.code === 'TENANT_ANH_DUONG');
    assert.ok(anhDuong, 'Anh Duong tenant should exist');

    // Switch impersonation to Anh Duong
    await api.setImpersonation(anhDuong.id);
    assert.equal(api.getImpersonatedTenantId(), anhDuong.id);

    // Call /auth/me with impersonation header
    const impersonatedUser = await api.getCurrentUser();
    assert.ok(impersonatedUser, 'Impersonated user should exist');
    assert.equal(impersonatedUser?.tenantId, anhDuong.id, 'Resolved tenantId should match impersonated tenant');

    // Verify getTenantById works with impersonation
    const tenantDetail = await api.getTenantById(anhDuong.id);
    assert.ok(tenantDetail, 'Tenant details should be returned');
    assert.equal(tenantDetail?.id, anhDuong.id);

    // Stop impersonation
    await api.setImpersonation(null);
    assert.equal(api.getImpersonatedTenantId(), null);

    const restoredUser = await api.getCurrentUser();
    assert.ok(restoredUser, 'Restored user should exist');
    assert.notEqual(restoredUser?.tenantId, anhDuong.id, 'TenantId should be reverted back');
  });

  // Test 4: Tenant Admin login
  await t.test('4. Live login with Tenant Admin admin@anhduong.vn returns accessToken with tenant ID', async () => {
    const user = await api.login('admin@anhduong.vn', 'Partner@123456');
    assert.ok(user, 'Tenant user should be returned');
    assert.equal(user.email, 'admin@anhduong.vn');
    assert.equal(user.role, 'TENANT_ADMIN');
    assert.equal(user.isSuperAdmin, false);
    assert.ok(user.tenantId, 'Tenant Admin must have a tenantId');
    assert.equal(user.tenantName, 'Công ty Vệ Sinh Ánh Dương');

    const me = await api.getCurrentUser();
    assert.ok(me, 'Current tenant user should be retrieved');
    assert.equal(me?.tenantId, user.tenantId);
  });

  // Test 5: Logout revokes tokens
  await t.test('5. Calling /auth/logout revokes tokens and clears session', async () => {
    const tokenBefore = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshTokenBefore = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    assert.ok(tokenBefore, 'Access token should exist before logout');
    assert.ok(refreshTokenBefore, 'Refresh token should exist before logout');

    await api.logout();

    // Verify localStorage is cleared
    assert.equal(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN), null);
    assert.equal(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN), null);
    assert.equal(localStorage.getItem(STORAGE_KEYS.CURRENT_USER), null);
    assert.equal(localStorage.getItem(STORAGE_KEYS.IMPERSONATED_TENANT_ID), null);

    // Verify calling getCurrentUser now returns null
    const currentUserAfterLogout = await api.getCurrentUser();
    assert.equal(currentUserAfterLogout, null);

    // Verify refresh token was revoked on backend
    const refreshRes = await fetch('http://localhost:3000/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshTokenBefore }),
    });
    assert.equal(refreshRes.status, 401, 'Revoked refresh token should be rejected with 401');
  });

  // Test 6: Partner registration and approval flow
  await t.test('6. Partner self-registration and Super Admin approval works', async () => {
    // Log back in as Super Admin
    await api.login('admin@linkkwork.vn', 'Admin@123456');

    const uniqueTaxId = `99${Date.now().toString().slice(-8)}`;
    const app = await api.submitPartnerApplication({
      businessName: `Đối Tác Thử Nghiệm ${uniqueTaxId}`,
      taxId: uniqueTaxId,
      contactName: 'Người Đại Diện Test',
      contactPhone: '0933112233',
      contactEmail: `partner_${uniqueTaxId}@test.vn`,
      city: 'Đà Nẵng',
      services: ['don-dep-ve-sinh'],
      password: 'Partner@123456',
    });

    assert.ok(app.id, 'Application ID / Tenant ID should be returned');
    assert.equal(app.status, 'SUBMITTED');

    // Approve the partner application
    const approvedTenant = await api.approvePartnerApplication(app.id);
    assert.ok(approvedTenant, 'Approved tenant should be returned');
    assert.equal(approvedTenant.status, 'ACTIVE');

    // Cleanup logout
    await api.logout();
  });
});
