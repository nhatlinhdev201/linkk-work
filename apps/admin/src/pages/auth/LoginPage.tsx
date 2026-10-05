import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layers, Shield, Building2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('superadmin@linkkwork.vn');
  const [password, setPassword] = useState('••••••••');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { loginAs } = useAuth();
  const navigate = useNavigate();

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await loginAs(email);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Đăng nhập không thành công');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      await loginAs(demoEmail);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Đăng nhập không thành công');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-slate-50 to-orange-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white flex items-center justify-center mx-auto shadow-lg shadow-brand-500/30">
            <Layers className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Linkk<span className="text-brand-500">Work</span> Admin Portal
          </h1>
          <p className="text-sm text-slate-600">
            Hệ thống quản trị dịch vụ on-demand đa doanh nghiệp
          </p>
        </div>

        {/* 1-Click Quick Demo Accounts Box */}
        <div className="bg-white/80 backdrop-blur-sm border border-brand-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>🚀</span> Đăng nhập nhanh tài khoản mẫu:
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => handleQuickLogin('superadmin@linkkwork.vn')}
              disabled={loading}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-brand-500 hover:bg-brand-50/50 transition text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 flex items-center justify-center font-bold text-xs">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-brand-600">
                    Super Admin (Nền tảng LinkkWork)
                  </p>
                  <p className="text-[11px] text-slate-500">Full quyền toàn sàn, quản lý Tenant, Cron</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-500 transform group-hover:translate-x-0.5 transition" />
            </button>

            <button
              onClick={() => handleQuickLogin('admin@anhduong.vn')}
              disabled={loading}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-brand-500 hover:bg-brand-50/50 transition text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-brand-600">
                    Tenant Admin: Vệ Sinh Ánh Dương
                  </p>
                  <p className="text-[11px] text-slate-500">Tạo đơn thủ công, điều phối thợ nội bộ</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-500 transform group-hover:translate-x-0.5 transition" />
            </button>
          </div>
        </div>

        {/* Regular Login Form */}
        <Card className="shadow-lg">
          <form onSubmit={handleManualLogin} className="space-y-4">
            <Input
              label="Email Quản trị"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@linkkwork.vn"
              required
            />
            <Input
              label="Mật khẩu"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {errorMsg && (
              <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {errorMsg}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" isLoading={loading} className="w-full">
              Đăng nhập Hệ thống
            </Button>
          </form>
        </Card>

        {/* Link to public partner registration */}
        <div className="text-center text-xs text-slate-600 space-y-1">
          <p>Bạn là doanh nghiệp dịch vụ muốn gia nhập nền tảng?</p>
          <Link
            to="/partner/register"
            className="text-brand-600 hover:text-brand-700 font-bold underline transition"
          >
            Đăng ký Đối tác Doanh nghiệp (Tenant Partner) tại đây &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
