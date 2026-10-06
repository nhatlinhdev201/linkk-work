import { describe, it } from 'node:test';
import assert from 'node:assert';
import { loginSchema, partnerRegisterSchema } from './auth.schema.ts';

describe('Auth Validation Schemas (Zod)', () => {
  describe('loginSchema', () => {
    it('1. Rejects empty fields and invalid email format', () => {
      const emptyResult = loginSchema.safeParse({ email: '', password: '' });
      assert.strictEqual(emptyResult.success, false);
      if (!emptyResult.success) {
        const issues = emptyResult.error.issues;
        assert.ok(issues.some((i) => i.path[0] === 'email'));
        assert.ok(issues.some((i) => i.path[0] === 'password'));
      }

      const invalidEmail = loginSchema.safeParse({
        email: 'invalid-email-string',
        password: 'Password123',
      });
      assert.strictEqual(invalidEmail.success, false);
    });

    it('2. Rejects password with less than 6 characters', () => {
      const shortPass = loginSchema.safeParse({
        email: 'admin@linkkwork.vn',
        password: '12345',
      });
      assert.strictEqual(shortPass.success, false);
      if (!shortPass.success) {
        assert.strictEqual(shortPass.error.issues[0]?.path[0], 'password');
      }
    });

    it('3. Accepts valid login credentials', () => {
      const valid = loginSchema.safeParse({
        email: 'admin@linkkwork.vn',
        password: 'Admin@123456',
        rememberMe: true,
      });
      assert.strictEqual(valid.success, true);
      if (valid.success) {
        assert.strictEqual(valid.data.email, 'admin@linkkwork.vn');
        assert.strictEqual(valid.data.password, 'Admin@123456');
        assert.strictEqual(valid.data.rememberMe, true);
      }
    });
  });

  describe('partnerRegisterSchema', () => {
    it('1. Rejects short businessName and invalid taxId', () => {
      const invalid = partnerRegisterSchema.safeParse({
        businessName: 'AB',
        taxId: '123',
        contactName: 'A',
        contactPhone: '0123',
        contactEmail: 'not-an-email',
        city: '',
        services: [],
        password: 'short',
        confirmPassword: 'short',
        agreedToTerms: false,
      });

      assert.strictEqual(invalid.success, false);
      if (!invalid.success) {
        const paths = invalid.error.issues.map((i) => i.path[0]);
        assert.ok(paths.includes('businessName'));
        assert.ok(paths.includes('taxId'));
        assert.ok(paths.includes('contactName'));
        assert.ok(paths.includes('contactPhone'));
        assert.ok(paths.includes('contactEmail'));
        assert.ok(paths.includes('city'));
        assert.ok(paths.includes('services'));
        assert.ok(paths.includes('password'));
        assert.ok(paths.includes('agreedToTerms'));
      }
    });

    it('2. Rejects mismatched confirmPassword', () => {
      const mismatch = partnerRegisterSchema.safeParse({
        businessName: 'Công ty Vệ Sinh Ánh Dương',
        taxId: '0301234567',
        contactName: 'Nguyễn Văn A',
        contactPhone: '0901234567',
        contactEmail: 'contact@anhduong.vn',
        city: 'TP. Hồ Chí Minh',
        services: ['Dọn dẹp nhà theo giờ'],
        password: 'Password@123',
        confirmPassword: 'DifferentPassword@123',
        agreedToTerms: true,
      });

      assert.strictEqual(mismatch.success, false);
      if (!mismatch.success) {
        const confirmIssue = mismatch.error.issues.find((i) => i.path[0] === 'confirmPassword');
        assert.ok(confirmIssue, 'Should have confirmPassword issue');
        assert.strictEqual(confirmIssue?.message, 'Mật khẩu xác nhận không khớp');
      }
    });

    it('3. Accepts valid partner registration payload', () => {
      const valid = partnerRegisterSchema.safeParse({
        businessName: 'Công ty TNHH Vệ Sinh Sao Mai',
        taxId: '0109876543',
        contactName: 'Trần Thị Mai',
        contactPhone: '0912345678',
        contactEmail: 'mai@saomai.vn',
        city: 'Hà Nội',
        address: '456 Phố Huế, Hai Bà Trưng',
        services: ['Dọn dẹp nhà theo giờ', 'Vệ sinh máy lạnh / Điện lạnh'],
        password: 'SecurePartner@123',
        confirmPassword: 'SecurePartner@123',
        agreedToTerms: true,
      });

      assert.strictEqual(valid.success, true);
      if (valid.success) {
        assert.strictEqual(valid.data.businessName, 'Công ty TNHH Vệ Sinh Sao Mai');
        assert.strictEqual(valid.data.services.length, 2);
        assert.strictEqual(valid.data.password, 'SecurePartner@123');
      }
    });

    it('4. Accepts Vietnamese phone numbers with 0, 84, or +84 prefixes', () => {
      const basePayload = {
        businessName: 'Công ty Ánh Dương',
        taxId: '0301234567',
        contactName: 'Nguyễn Văn A',
        contactEmail: 'contact@anhduong.vn',
        city: 'TP. Hồ Chí Minh',
        services: ['Dọn dẹp nhà theo giờ'],
        password: 'SecurePass@123',
        confirmPassword: 'SecurePass@123',
        agreedToTerms: true,
      };

      const phone0 = partnerRegisterSchema.safeParse({ ...basePayload, contactPhone: '0912345678' });
      const phone84 = partnerRegisterSchema.safeParse({ ...basePayload, contactPhone: '84912345678' });
      const phonePlus84 = partnerRegisterSchema.safeParse({ ...basePayload, contactPhone: '+84912345678' });

      assert.strictEqual(phone0.success, true, '0912345678 should be valid');
      assert.strictEqual(phone84.success, true, '84912345678 should be valid');
      assert.strictEqual(phonePlus84.success, true, '+84912345678 should be valid');
    });
  });
});

