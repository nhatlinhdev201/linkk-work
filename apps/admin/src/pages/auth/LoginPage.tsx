import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Layers,
  Shield,
  Building2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { loginSchema, LoginFormData } from '../../schemas/auth.schema';

export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const { loginAs } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setApiError('');
    try {
      await loginAs(data.email, data.password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.';
      setApiError(message);
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAccount = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
    setApiError('');
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50">
      {/* LEFT COLUMN: Enterprise Hero Showcase */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 p-12 text-white flex-col justify-between relative overflow-hidden border-r border-slate-800">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-white">
                Linkk<span className="text-brand-400">Work</span>
              </span>
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Operations &amp; Dispatch Console
              </span>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-brand-300 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Nền tảng Quản trị On-Demand Service B2B</span>
          </div>
        </div>

        {/* Showcase Highlights */}
        <div className="relative z-10 space-y-6 my-auto py-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-white tracking-tight leading-snug">
              Kiến trúc Vận hành Đa Doanh nghiệp Chuẩn Enterprise
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md">
              Hệ thống lõi kết nối đồng bộ giữa nền tảng LinkkWork và các doanh nghiệp đối tác dịch vụ địa phương.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
              <div className="w-9 h-9 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <h3 className="font-bold text-white text-sm">13-State Booking Machine</h3>
                <p className="text-slate-400 mt-0.5 leading-relaxed">
                  Kiểm soát chính xác vòng đời đơn hàng: Phân công thợ tức thì, phát sóng radar, nghiệm thu và đánh giá.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <h3 className="font-bold text-white text-sm">Multi-Tenant Data Isolation</h3>
                <p className="text-slate-400 mt-0.5 leading-relaxed">
                  Cách ly dữ liệu tuyệt đối giữa các Tenant đối tác qua JWT Context Guard và kiểm soát truy cập phân quyền RBAC.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <h3 className="font-bold text-white text-sm">Dynamic Pricing &amp; Surge Engine</h3>
                <p className="text-slate-400 mt-0.5 leading-relaxed">
                  Công thức định giá linh hoạt theo giờ, theo đơn vị, phụ thu khu vực và hệ số giờ cao điểm chuẩn xác.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Badges Footer */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SLA 99.9% Uptime</span>
          </div>
          <span>Bảo mật JWT Rotation &amp; Redis Cache</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Sign In Form */}
      <div className="w-full lg:w-1/2 xl:w-7/12 flex items-center justify-center p-6 sm:p-12">
        <div className="max-w-md w-full space-y-6">
          {/* Mobile Brand Header */}
          <div className="lg:hidden text-center space-y-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white flex items-center justify-center mx-auto shadow-md">
              <Layers className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Linkk<span className="text-brand-500">Work</span> Admin Portal
            </h1>
            <p className="text-xs text-slate-500">
              Hệ thống quản trị dịch vụ on-demand đa doanh nghiệp
            </p>
          </div>

          {/* Form Header */}
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Đăng nhập Quản trị
            </h2>
            <p className="text-sm text-slate-500">
              Vui lòng nhập thông tin xác thực để truy cập bảng điều khiển vận hành.
            </p>
          </div>

          {/* API Error Notification */}
          {apiError && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{apiError}</div>
            </div>
          )}

          {/* Login Form */}
          <Card className="shadow-xl border-slate-200/80 p-6 sm:p-7">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <Input
                label="Email Quản trị viên"
                type="email"
                placeholder="ten.nguoidung@linkkwork.vn"
                icon={<Mail className="w-4 h-4 text-slate-400" />}
                required
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                label="Mật khẩu"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập mật khẩu của bạn"
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

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-900">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                    {...register('rememberMe')}
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
                <span className="text-slate-400 cursor-not-allowed">
                  Quên mật khẩu?
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                className="w-full text-sm font-bold shadow-md shadow-brand-500/20"
              >
                Đăng nhập Hệ thống
              </Button>
            </form>
          </Card>

          {/* Quick Demo Pre-fill Chips (Subtle developer helper) */}
          <div className="pt-2 border-t border-slate-200/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Tài khoản mẫu kiểm thử:
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillQuickAccount('admin@linkkwork.vn', 'Admin@123456')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-brand-500 hover:bg-brand-50/40 text-left transition text-xs group shadow-2xs"
              >
                <div className="w-6 h-6 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <span className="font-bold text-slate-800 block truncate group-hover:text-brand-600">
                    Super Admin
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    admin@linkkwork.vn
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickAccount('admin@anhduong.vn', 'Partner@123456')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition text-xs group shadow-2xs"
              >
                <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <span className="font-bold text-slate-800 block truncate group-hover:text-emerald-600">
                    Tenant Admin
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    admin@anhduong.vn
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Link to Partner Register */}
          <div className="text-center text-xs text-slate-600 pt-2 space-y-1">
            <p>Doanh nghiệp dịch vụ muốn gia nhập nền tảng LinkkWork?</p>
            <Link
              to="/partner/register"
              className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 font-bold hover:underline transition"
            >
              <span>Đăng ký Đối tác Doanh nghiệp (Tenant Partner) tại đây</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
