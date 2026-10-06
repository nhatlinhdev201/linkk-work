import { z } from 'zod';

const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;

export const createTaskerSchema = z.object({
  name: z.string().trim().min(2, 'Họ và tên tối thiểu 2 ký tự'),
  phone: z.string().trim().regex(phoneRegex, 'Số điện thoại không hợp lệ (10 chữ số VN)'),
  email: z.string().trim().email('Email không đúng định dạng'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').optional().or(z.literal('')),
  tenantId: z.string().optional(),
  idCardNumber: z.string().trim().min(9, 'Số CCCD/CMND tối thiểu 9 ký tự').optional().or(z.literal('')),
  skills: z.array(z.string()).min(1, 'Chọn ít nhất 1 kỹ năng/dịch vụ'),
  depositBalance: z.number().min(0, 'Số dư ký quỹ ban đầu >= 0').default(500000),
  maxDistanceKm: z.number().min(1, 'Tối thiểu 1km').max(100, 'Tối đa 100km').default(15),
  autoRadarEnabled: z.boolean().default(true),
  bankName: z.string().trim().optional(),
  bankAccountNumber: z.string().trim().optional(),
  bankAccountHolder: z.string().trim().optional(),
});

export type CreateTaskerInput = z.infer<typeof createTaskerSchema>;

export const updateTaskerSchema = z.object({
  name: z.string().trim().min(2, 'Họ và tên tối thiểu 2 ký tự').optional(),
  phone: z.string().trim().regex(phoneRegex, 'Số điện thoại không hợp lệ (10 chữ số VN)').optional(),
  idCardNumber: z.string().trim().min(9, 'Số CCCD/CMND tối thiểu 9 ký tự').optional().or(z.literal('')),
  skills: z.array(z.string()).min(1, 'Chọn ít nhất 1 kỹ năng/dịch vụ').optional(),
  bankName: z.string().trim().optional(),
  bankAccountNumber: z.string().trim().optional(),
  bankAccountHolder: z.string().trim().optional(),
  salaryType: z.enum(['COMMISSION', 'FIXED_SALARY']).optional(),
});

export type UpdateTaskerInput = z.infer<typeof updateTaskerSchema>;

export const workFloorSchema = z.object({
  maxDistanceKm: z.number().min(1, 'Tối thiểu 1km').max(100, 'Tối đa 100km'),
  autoRadarEnabled: z.boolean(),
  isOnline: z.boolean().optional(),
  currentLat: z.number().optional(),
  currentLng: z.number().optional(),
});

export type WorkFloorInput = z.infer<typeof workFloorSchema>;

export const depositSchema = z.object({
  amount: z.number().refine((val) => val !== 0, 'Số tiền không được bằng 0'),
  notes: z.string().trim().min(3, 'Vui lòng nhập lý do nạp/rút ký quỹ'),
});

export type DepositInput = z.infer<typeof depositSchema>;
