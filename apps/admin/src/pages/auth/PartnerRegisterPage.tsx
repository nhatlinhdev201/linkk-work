import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Layers,
  CheckCircle2,
  Building,
  ShieldCheck,
  ArrowLeft,
  Briefcase,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Mail,
  User,
  MapPin,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Card } from '../../components/common/Card';
import { useToast } from '../../components/feedback/ToastContext';
import {
  partnerRegisterSchema,
  PartnerRegisterFormData,
} from '../../schemas/auth.schema';

const SERVICE_OPTIONS = [
  'Dọn dẹp nhà theo giờ',
  'Vệ sinh máy lạnh / Điện lạnh',
  'Nấu ăn gia đình',
  'Giặt ủi & Sofa / Nệm / Rèm',
  'Tổng vệ sinh chuyên sâu',
  'Trông trẻ & Chăm sóc người cao tuổi',
];

const CITY_OPTIONS = [
  { value: 'Hà Nội', label: 'Hà Nội' },
  { value: 'TP. Hồ Chí Minh', label: 'TP. Hồ Chí Minh' },
  { value: 'Đà Nẵng', label: 'Đà Nẵng' },
  { value: 'Cần Thơ', label: 'Cần Thơ' },
  { value: 'Hải Phòng', label: 'Hải Phòng' },
  { value: 'Bình Dương', label: 'Bình Dương' },
];

export const PartnerRegisterPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<PartnerRegisterFormData | null>(null);
  const [apiError, setApiError] = useState('');
  const { success, error } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PartnerRegisterFormData>({
    resolver: zodResolver(partnerRegisterSchema),
    defaultValues: {
      businessName: '',
      taxId: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      city: 'Hà Nội',
      address: '',
      services: ['Dọn dẹp nhà theo giờ', 'Vệ sinh máy lạnh / Điện lạnh'],
      password: '',
      confirmPassword: '',
      agreedToTerms: false,
    },
  });

  const selectedServices = watch('services') || [];

  const handleToggleService = (srv: string) => {
    const updated = selectedServices.includes(srv)
      ? selectedServices.filter((s) => s !== srv)
      : [...selectedServices, srv];
    setValue('services', updated, { shouldValidate: true });
  };

  const onSubmit = async (data: PartnerRegisterFormData) => {
    setLoading(true);
    setApiError('');
    try {
      const app = await api.submitPartnerApplication({
        businessName: data.businessName,
        taxId: data.taxId,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        city: data.city,
        address: data.address || undefined,
        services: data.services,
        selectedServices: data.services,
        password: data.password,
      });

      setSubmittedAppId(app.id);
      setSubmittedData(data);
      success(
        'Nộp hồ sơ thành công!',
        'Hồ sơ đối tác đã được gửi tới Ban Quản Trị LinkkWork để thẩm định.'
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Có lỗi xảy ra khi nộp hồ sơ. Vui lòng thử lại sau.';
      setApiError(message);
      error('Lỗi nộp hồ sơ', message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedAppId(null);
    setSubmittedData(null);
    setApiError('');
    reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-brand-50/30 py-10 px-4 sm:px-6">
      <div className="max-w-3xl w-full mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-brand-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Đăng nhập Quản trị</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-brand-700 font-mono font-bold bg-brand-100/70 px-2.5 py-1 rounded-full border border-brand-200">
              Tenant Partner Onboarding
            </span>
          </div>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white flex items-center justify-center mx-auto shadow-lg shadow-brand-500/20">
            <Layers className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Đăng Ký Đối Tác Doanh Nghiệp (Tenant Partner)
          </h1>
          <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            Gia nhập mạng lưới cung ứng LinkkWork để tự động hóa quy trình điều phối thợ, tiếp nhận khách hàng và kiểm soát doanh thu chuyên nghiệp.
          </p>
        </div>

        {/* Submitted Success View */}
        {submittedAppId && submittedData ? (
          <Card className="text-center p-8 sm:p-10 border-emerald-200 bg-white shadow-xl animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Hồ Sơ Đã Được Nộp Thành Công!
            </h2>
            <p className="text-sm text-slate-600 mb-6 max-w-lg mx-auto">
              Hồ sơ đăng ký của doanh nghiệp đã được ghi nhận trên nền tảng với mã số định danh:{' '}
              <span className="font-mono font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                {submittedAppId}
              </span>
              . Bộ phận thẩm định đối tác LinkkWork sẽ xác minh pháp lý và liên hệ với bạn trong vòng 24 giờ.
            </p>

            {/* Application Summary Box */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs text-slate-700 text-left space-y-2.5 mb-8 max-w-lg mx-auto">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Doanh nghiệp:</span>
                <span className="font-bold text-slate-900">{submittedData.businessName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Mã số thuế:</span>
                <span className="font-mono font-bold text-slate-900">{submittedData.taxId}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Người đại diện:</span>
                <span className="font-bold text-slate-900">{submittedData.contactName} ({submittedData.contactPhone})</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Email quản trị:</span>
                <span className="font-mono text-slate-900">{submittedData.contactEmail}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Khu vực:</span>
                <span className="font-semibold text-slate-900">{submittedData.city}</span>
              </div>
              <div className="pt-1">
                <span className="text-slate-500 block mb-1">Dịch vụ đăng ký:</span>
                <div className="flex flex-wrap gap-1.5">
                  {submittedData.services.map((srv) => (
                    <span
                      key={srv}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-300 text-[11px] font-medium text-slate-800"
                    >
                      {srv}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/login" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full sm:w-auto">
                  Quay lại Trang Đăng nhập
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                onClick={handleResetForm}
                className="w-full sm:w-auto"
              >
                Đăng ký thêm doanh nghiệp khác
              </Button>
            </div>
          </Card>
        ) : (
          /* Main Registration Form */
          <Card className="shadow-xl border-slate-200/80 p-6 sm:p-8">
            {apiError && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium mb-6 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">{apiError}</div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-7" noValidate>
              {/* SECTION 1: Legal & Business Info */}
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building className="w-4 h-4 text-brand-600" />
                    <span>1. Thông tin Doanh nghiệp &amp; Pháp lý</span>
                  </h3>
                  <span className="text-[11px] font-medium text-slate-400">Bước 1/3</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Tên Doanh nghiệp / Hộ kinh doanh"
                    placeholder="Công ty TNHH Dịch Vụ Vệ Sinh ..."
                    icon={<Building className="w-4 h-4 text-slate-400" />}
                    required
                    error={errors.businessName?.message}
                    {...register('businessName')}
                  />

                  <Input
                    label="Mã số thuế (MST)"
                    placeholder="0301234567"
                    icon={<FileText className="w-4 h-4 text-slate-400" />}
                    required
                    error={errors.taxId?.message}
                    {...register('taxId')}
                  />

                  <Select
                    label="Tỉnh / Thành phố Hoạt động"
                    options={CITY_OPTIONS}
                    required
                    error={errors.city?.message}
                    {...register('city')}
                  />

                  <Input
                    label="Địa chỉ trụ sở / Văn phòng"
                    placeholder="123 Đường Nguyễn Huệ, Quận 1..."
                    icon={<MapPin className="w-4 h-4 text-slate-400" />}
                    error={errors.address?.message}
                    {...register('address')}
                  />
                </div>
              </div>

              {/* SECTION 2: Contact Person & Admin Account */}
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-brand-600" />
                    <span>2. Thông tin Người đại diện &amp; Tài khoản Quản trị</span>
                  </h3>
                  <span className="text-[11px] font-medium text-slate-400">Bước 2/3</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Họ và tên Người đại diện"
                    placeholder="Nguyễn Văn A"
                    icon={<User className="w-4 h-4 text-slate-400" />}
                    required
                    error={errors.contactName?.message}
                    {...register('contactName')}
                  />

                  <Input
                    label="Số điện thoại Hotline"
                    type="tel"
                    placeholder="0912 345 678"
                    icon={<Phone className="w-4 h-4 text-slate-400" />}
                    required
                    error={errors.contactPhone?.message}
                    {...register('contactPhone')}
                  />

                  <div className="sm:col-span-2">
                    <Input
                      label="Email Quản trị (Dùng để đăng nhập sau khi kích hoạt)"
                      type="email"
                      placeholder="admin@doanhnghiep.vn"
                      icon={<Mail className="w-4 h-4 text-slate-400" />}
                      required
                      error={errors.contactEmail?.message}
                      {...register('contactEmail')}
                    />
                  </div>

                  <Input
                    label="Mật khẩu Quản trị (Tối thiểu 8 ký tự)"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu quản trị..."
                    icon={<Lock className="w-4 h-4 text-slate-400" />}
                    required
                    error={errors.password?.message}
                    rightElement={
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="text-slate-400 hover:text-slate-600 focus:outline-none transition p-1"
                        title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    }
                    {...register('password')}
                  />

                  <Input
                    label="Xác nhận lại Mật khẩu"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu..."
                    icon={<Lock className="w-4 h-4 text-slate-400" />}
                    required
                    error={errors.confirmPassword?.message}
                    rightElement={
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="text-slate-400 hover:text-slate-600 focus:outline-none transition p-1"
                        title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    }
                    {...register('confirmPassword')}
                  />
                </div>
              </div>

              {/* SECTION 3: Services & Agreement */}
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-brand-600" />
                    <span>3. Nhóm Dịch vụ Đăng ký Cung ứng</span>
                  </h3>
                  <span className="text-[11px] font-medium text-slate-400">Bước 3/3</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SERVICE_OPTIONS.map((srv) => {
                    const isChecked = selectedServices.includes(srv);
                    return (
                      <label
                        key={srv}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border text-xs font-semibold cursor-pointer transition select-none ${
                          isChecked
                            ? 'border-brand-500 bg-brand-50/50 text-brand-950 shadow-2xs'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleService(srv)}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                        />
                        <span>{srv}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.services && (
                  <p className="text-xs text-rose-600 font-medium flex items-center gap-1.5 animate-fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.services.message}</span>
                  </p>
                )}
              </div>

              {/* SECTION 4: Terms and Submission */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div className="space-y-1.5">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-slate-600">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-4 w-4 mt-0.5"
                      {...register('agreedToTerms')}
                    />
                    <span>
                      Tôi cam kết các thông tin khai báo trên là chính xác và hoàn toàn chịu trách nhiệm trước pháp luật. Tôi đồng ý với{' '}
                      <span className="text-brand-600 font-bold underline cursor-pointer">
                        Điều khoản Đối tác LinkkWork
                      </span>
                      .
                    </span>
                  </label>
                  {errors.agreedToTerms && (
                    <p className="text-xs text-rose-600 font-medium flex items-center gap-1.5 animate-fade-in pl-6">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.agreedToTerms.message}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <p className="text-xs text-slate-500 order-2 sm:order-1">
                    Bảo mật thông tin theo tiêu chuẩn B2B Data Privacy.
                  </p>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={loading}
                    className="w-full sm:w-auto font-bold shadow-md shadow-brand-500/20 order-1 sm:order-2"
                  >
                    Gửi Hồ Sơ Xét Duyệt Đối Tác
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
};
