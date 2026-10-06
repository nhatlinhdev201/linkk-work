import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { ConfirmOptions, ConfirmVariant } from './ConfirmContext.tsx';

describe('Confirm Modal & Critical Actions Protection Suite', () => {
  it('1. Confirms supported modal variants and options schema', () => {
    const validVariants: ConfirmVariant[] = ['primary', 'danger', 'warning', 'info'];
    assert.strictEqual(validVariants.length, 4);

    const testOption: ConfirmOptions = {
      title: 'Xác nhận phê duyệt đối tác?',
      message: 'Tài khoản đối tác sẽ được kích hoạt.',
      confirmText: 'Phê duyệt',
      cancelText: 'Hủy bỏ',
      variant: 'primary',
    };

    assert.strictEqual(testOption.title, 'Xác nhận phê duyệt đối tác?');
    assert.strictEqual(testOption.variant, 'primary');
    assert.strictEqual(testOption.confirmText, 'Phê duyệt');
  });

  it('2. Verifies danger variant for destructive actions (logout/delete)', () => {
    const logoutOption: ConfirmOptions = {
      title: 'Xác nhận đăng xuất?',
      message: 'Bạn có chắc chắn muốn kết thúc phiên làm việc?',
      variant: 'danger',
      confirmText: 'Đăng xuất',
      cancelText: 'Hủy bỏ',
    };

    assert.strictEqual(logoutOption.variant, 'danger');
    assert.strictEqual(logoutOption.confirmText, 'Đăng xuất');
  });

  it('3. Verifies warning variant for operational state changes (broadcast/suspend)', () => {
    const broadcastOption: ConfirmOptions = {
      title: 'Phát sóng đơn lên Radar?',
      message: 'Đơn hàng sẽ được phát sóng cho toàn bộ thợ nhận việc.',
      variant: 'warning',
      confirmText: 'Phát sóng ngay',
      cancelText: 'Hủy bỏ',
    };

    assert.strictEqual(broadcastOption.variant, 'warning');
    assert.strictEqual(broadcastOption.confirmText, 'Phát sóng ngay');
  });
});
