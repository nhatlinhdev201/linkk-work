import { z } from 'zod';

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Tên nhóm dịch vụ phải có ít nhất 2 ký tự')
    .max(100, 'Tên nhóm dịch vụ tối đa 100 ký tự'),
  slug: z.string().trim().optional(),
  icon: z.string().trim().optional(),
  description: z.string().trim().optional(),
  defaultPricingType: z
    .enum(['HOURLY', 'PER_UNIT', 'BIDDING'])
    .default('HOURLY'),
  defaultBasePrice: z
    .number()
    .min(0, 'Đơn giá cơ bản mặc định không được âm')
    .default(0),
  defaultUnitLabel: z.string().trim().optional(),
  displayOrder: z
    .number()
    .min(0, 'Thứ tự hiển thị không được âm')
    .default(0),
  isActive: z.boolean().default(true),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

export const serviceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Tên dịch vụ phải có ít nhất 2 ký tự')
      .max(120, 'Tên dịch vụ tối đa 120 ký tự'),
    categoryId: z
      .string()
      .trim()
      .min(1, 'Vui lòng chọn nhóm danh mục'),
    pricingModel: z.enum(['HOURLY', 'PER_UNIT', 'BIDDING']),
    basePrice: z
      .number()
      .min(0, 'Đơn giá cơ bản không được âm'),
    durationHours: z
      .number()
      .min(0.1, 'Thời lượng ước tính tối thiểu 0.1 giờ')
      .optional(),
    unitLabel: z.string().trim().optional(),
    minHours: z
      .number()
      .min(1, 'Số giờ làm việc tối thiểu là 1')
      .optional(),
    description: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.pricingModel !== 'BIDDING') {
        return data.basePrice > 0;
      }
      return true;
    },
    {
      message: 'Đơn giá cơ bản phải lớn hơn 0 đ đối với dịch vụ theo giờ hoặc theo đơn vị',
      path: ['basePrice'],
    }
  );

export type ServiceFormData = z.infer<typeof serviceSchema>;

export const addonSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Tên dịch vụ/phụ phí bán kèm phải có ít nhất 2 ký tự')
    .max(100, 'Tên phụ phí tối đa 100 ký tự'),
  price: z
    .number()
    .min(0, 'Đơn giá phụ phí không được âm'),
  description: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

export type AddonFormData = z.infer<typeof addonSchema>;
