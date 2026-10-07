import test from 'node:test';
import assert from 'node:assert/strict';
import { api, STORAGE_KEYS } from './client.ts';
import type { WalletTransaction } from '../types/index.ts';

test('Admin Finance & Universal Ledger API Client Integration Suite', async (t) => {
  let partnerTenantId = '';
  let sampleTransaction: WalletTransaction | null = null;

  // Setup: Partner Admin logs in
  await t.test('1. Partner Admin logs in and acquires authentication context', async () => {
    const user = await api.login('admin@anhduong.vn', 'Partner@123456');
    assert.ok(user, 'User should be returned');
    assert.equal(user.email, 'admin@anhduong.vn');
    assert.ok(user.tenantId, 'User must have a tenantId');
    partnerTenantId = user.tenantId;

    const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
    const token = storage?.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    assert.ok(token, 'Access token should be stored in localStorage');
  });

  // Test 1: Partner admin calls api.getWalletTransactions() live, verifies array and structure
  await t.test(
    '2. Live retrieval of wallet transactions returns array and valid ledger structure',
    async () => {
      const result = await api.getWalletTransactions();

      assert.ok(Array.isArray(result), 'Result should be an array (array compatibility)');
      assert.ok(result.length > 0, 'Should return at least 1 wallet transaction');
      assert.ok(typeof result.total === 'number', 'Result should have total count');
      assert.ok(result.total >= result.length, 'Total count should be >= returned length');
      assert.ok(typeof result.page === 'number', 'Result should have page number');
      assert.ok(typeof result.limit === 'number', 'Result should have limit number');
      assert.ok(result.summary, 'Result should include summary metrics');
      assert.ok(
        typeof result.summary?.totalCommissionFee === 'number',
        'Summary should include totalCommissionFee'
      );
      assert.ok(
        typeof result.summary?.totalCashCollected === 'number',
        'Summary should include totalCashCollected'
      );
      assert.ok(
        typeof result.summary?.totalDepositTopUp === 'number',
        'Summary should include totalDepositTopUp'
      );

      const first = result[0];
      assert.ok(first.id, 'Transaction must have an id');
      assert.ok(first.code, 'Transaction must have a code');
      assert.ok(first.code.startsWith('TX-'), 'Transaction code should start with TX-');
      assert.ok(typeof first.amount === 'number', 'Transaction amount must be a number');
      assert.ok(first.sourceType, 'Transaction must have sourceType');
      assert.ok(first.targetType, 'Transaction must have targetType');
      assert.ok(first.sourceName, 'Transaction must have sourceName');
      assert.ok(first.targetName, 'Transaction must have targetName');
      assert.ok(first.paymentMethod, 'Transaction must have paymentMethod');
      assert.ok(first.status, 'Transaction must have status');

      sampleTransaction = first;
    }
  );

  // Test 2: Filter with type: 'COMMISSION_FEE' and paymentMethod: 'WALLET'
  await t.test(
    "3. Filter transactions by type: 'COMMISSION_FEE' and paymentMethod: 'WALLET'",
    async () => {
      const filtered = await api.getWalletTransactions({
        type: 'COMMISSION_FEE',
        paymentMethod: 'WALLET',
      });

      assert.ok(Array.isArray(filtered), 'Filtered result should be an array');
      assert.ok(filtered.length > 0, 'Should find commission fee transactions paid via WALLET');

      for (const tx of filtered) {
        assert.equal(
          tx.type,
          'COMMISSION_FEE',
          `Transaction type must be COMMISSION_FEE, got ${tx.type}`
        );
        assert.equal(
          tx.paymentMethod,
          'WALLET',
          `Transaction paymentMethod must be WALLET, got ${tx.paymentMethod}`
        );
        assert.ok(tx.amount > 0, 'Commission fee amount must be positive');
        assert.ok(tx.sourceType, 'Must specify sourceType');
        assert.ok(tx.targetType, 'Must specify targetType');
      }
    }
  );

  // Test 3: Search with transaction code or booking code
  await t.test(
    '4. Search transactions by transaction code or booking code',
    async () => {
      assert.ok(sampleTransaction, 'Sample transaction from test 1 must exist');

      // Search by transaction code
      const searchByCode = await api.getWalletTransactions({
        search: sampleTransaction.code,
      });

      assert.ok(Array.isArray(searchByCode), 'Search result should be an array');
      assert.ok(searchByCode.length >= 1, 'Should find at least 1 match for transaction code');
      const foundByCode = searchByCode.find((t) => t.code === sampleTransaction!.code);
      assert.ok(
        foundByCode,
        `Transaction ${sampleTransaction.code} must be present in search results`
      );
      assert.equal(foundByCode.id, sampleTransaction.id);

      // Search by booking code if available
      if (sampleTransaction.bookingCode) {
        const searchByBooking = await api.getWalletTransactions({
          search: sampleTransaction.bookingCode,
        });
        assert.ok(Array.isArray(searchByBooking), 'Search by booking code should return an array');
        assert.ok(searchByBooking.length >= 1, 'Should find transactions matching booking code');
        const foundByBooking = searchByBooking.find(
          (t) => t.bookingCode === sampleTransaction!.bookingCode
        );
        assert.ok(
          foundByBooking,
          `Transaction with bookingCode ${sampleTransaction.bookingCode} must be present`
        );
      }
    }
  );

  // Test 4: Live call api.getFinancialSummary() returns valid GMV, commission, etc.
  await t.test(
    '5. Live retrieval of financial summary returns valid GMV, commission and net revenue',
    async () => {
      const summary = await api.getFinancialSummary();

      assert.ok(summary, 'Financial summary should be returned');
      assert.ok(
        typeof summary.grossServiceVolume === 'number',
        'grossServiceVolume must be a number'
      );
      assert.ok(summary.grossServiceVolume >= 0, 'grossServiceVolume must be non-negative');

      assert.ok(
        typeof summary.platformCommissionEarned === 'number',
        'platformCommissionEarned must be a number'
      );
      assert.ok(
        summary.platformCommissionEarned >= 0,
        'platformCommissionEarned must be non-negative'
      );

      assert.ok(typeof summary.tenantNetRevenue === 'number', 'tenantNetRevenue must be a number');
      assert.equal(
        summary.tenantNetRevenue,
        summary.grossServiceVolume - summary.platformCommissionEarned,
        'tenantNetRevenue must equal grossServiceVolume minus platformCommissionEarned'
      );

      assert.ok(typeof summary.totalDepositHeld === 'number', 'totalDepositHeld must be a number');
      assert.ok(summary.totalDepositHeld >= 0, 'totalDepositHeld must be non-negative');

      assert.ok(
        typeof summary.pendingSettlementsCount === 'number',
        'pendingSettlementsCount must be a number'
      );
      assert.ok(summary.pendingSettlementsCount >= 0, 'pendingSettlementsCount must be non-negative');
    }
  );

  // Test 5: Verify backward compatibility with string tenantId parameter
  await t.test(
    '6. Backward compatibility: getWalletTransactions(tenantId) string overload works',
    async () => {
      const txs = await api.getWalletTransactions(partnerTenantId);
      assert.ok(Array.isArray(txs), 'Should return array');
      assert.ok(txs.length > 0, 'Should return transactions for tenant');
      for (const tx of txs) {
        assert.equal(tx.tenantId, partnerTenantId, 'Each transaction must belong to tenant');
      }
    }
  );
});
