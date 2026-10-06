import { z } from 'zod';

const phoneRegex = /^(\+?84|0)[35789][0-9]{8}$/;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập email quản trị')
    .email('Định dạng email không hợp lệ'),
  password: z
    .string()
    .min(1, 'Vui lòng nhập mật khẩu')
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  rememberMe: z.boolean().default(false).optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const partnerRegisterSchema = z
  .object({
    businessName: z
      .string()
      .trim()
      .min(3, 'Tên doanh nghiệp phải có ít nhất 3 ký tự')
      .max(100, 'Tên doanh nghiệp tối đa 100 ký tự'),
    taxId: z
      .string()
      .trim()
      .min(8, 'Mã số thuế phải có ít nhất 8 ký tự')
      .max(14, 'Mã số thuế tối đa 14 ký tự')
      .regex(/^[0-9A-Za-z-]+$/, 'Mã số thuế chỉ chứa chữ số và dấu gạch nối'),
    contactName: z
      .string()
      .trim()
      .min(2, 'Họ và tên người đại diện phải có ít nhất 2 ký tự')
      .max(50, 'Họ và tên tối đa 50 ký tự'),
    contactPhone: z
      .string()
      .trim()
      .regex(phoneRegex, 'Số điện thoại không hợp lệ (ví dụ: 0912345678 hoặc 84912345678)'),
    contactEmail: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập email liên hệ')
      .email('Định dạng email liên hệ không hợp lệ'),
    city: z
      .string()
      .trim()
      .min(1, 'Vui lòng chọn tỉnh / thành phố hoạt động'),
    address: z
      .string()
      .trim()
      .optional(),
    services: z
      .array(z.string())
      .min(1, 'Vui lòng chọn ít nhất 1 nhóm dịch vụ đăng ký cung ứng'),
    password: z
      .string()
      .min(8, 'Mật khẩu quản trị phải có ít nhất 8 ký tự'),
    confirmPassword: z
      .string()
      .min(1, 'Vui lòng xác nhận lại mật khẩu'),
    agreedToTerms: z
      .boolean()
      .refine((val) => val === true, 'Bạn cần đồng ý với Điều khoản Đối tác LinkkWork để tiếp tục'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export type PartnerRegisterFormData = z.infer<typeof partnerRegisterSchema>;
