import React, { useState, useEffect } from 'react';
import { TenantSettings } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/feedback/ToastContext';
import { useTenantSettingsQuery, useUpdateTenantSettingsMutation } from '../../api/queries';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Switch } from '../../components/common/Switch';
import { SkeletonForm } from '../../components/common/Skeleton';
import {
  Settings,
  Building,
  Phone,
  Mail,
  MapPin,
  Radio,
  Clock,
  ShieldCheck,
  Save,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentTenantId, currentTenantName, isSuperAdmin } = useAuth();
  const { toast } = useToast();

  const { data: initialSettings, isLoading } = useTenantSettingsQuery(currentTenantId);
  const updateSettingsMutation = useUpdateTenantSettingsMutation(currentTenantId);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<TenantSettings>({
    tenantId: currentTenantId,
    hotline: '',
    supportEmail: '',
    businessAddress: '',
    autoDispatchEnabled: true,
    maxRadiusKm: 15,
    defaultCommissionRate: 15,
    workingHours: { start: '07:00', end: '21:00' },
  });

  useEffect(() => {
    if (initialSettings) {
      setForm(initialSettings);
    }
  }, [initialSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Inline validation
    const errors: Record<string, string> = {};
    if (!form.hotline.trim()) {
      errors.hotline = 'Vui lòng nhập số điện thoại hotline';
    } else if (form.hotline.trim().length < 8) {
      errors.hotline = 'Số hotline phải có ít nhất 8 ký tự';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.supportEmail.trim() || !emailRegex.test(form.supportEmail.trim())) {
      errors.supportEmail = 'Email hỗ trợ không hợp lệ (Ví dụ: hotro@domain.com)';
    }

    if (!form.businessAddress.trim() || form.businessAddress.trim().length < 5) {
      errors.businessAddress = 'Vui lòng nhập địa chỉ cụ thể (tối thiểu 5 ký tự)';
    }

    if (form.maxRadiusKm < 1 || form.maxRadiusKm > 50) {
      errors.maxRadiusKm = 'Bán kính phục vụ phải từ 1 đến 50 km';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({
        type: 'warning',
        title: 'Dữ liệu chưa hợp lệ',
        message: 'Vui lòng kiểm tra các trường thông tin báo lỗi màu đỏ.',
      });
      return;
    }

    try {
      await updateSettingsMutation.mutateAsync(form);
      setFormErrors({});
    } catch {
      // Handled in mutation onError
    }
  };

  return (
    <div className="space-y-6 w-full max-w-5xl">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-brand-500" />
          Cài đặt Thông tin &amp; Vận hành Hệ thống
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Cấu hình thông tin đại diện pháp lý, hotline hỗ trợ, bán kính phục vụ và chính sách điều phối cho{' '}
          <span className="font-semibold text-brand-600">{currentTenantName}</span>.
        </p>
      </div>

      {isLoading && !initialSettings ? (
        <SkeletonForm fields={6} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. General Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-4 h-4 text-brand-500" />
                Thông tin Liên hệ Doanh nghiệp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Hotline chăm sóc khách hàng"
                  placeholder="1900 xxxx hoặc 09xx"
                  value={form.hotline}
                  error={formErrors.hotline}
                  onChange={(e) => {
                    setForm({ ...form, hotline: e.target.value });
                    if (formErrors.hotline) {
                      const updated = { ...formErrors };
                      delete updated.hotline;
                      setFormErrors(updated);
                    }
                  }}
                  icon={<Phone className="w-4 h-4 text-slate-400" />}
                  required
                />
                <Input
                  label="Email hỗ trợ & nhận đối soát"
                  type="email"
                  placeholder="cskh@domain.com"
                  value={form.supportEmail}
                  error={formErrors.supportEmail}
                  onChange={(e) => {
                    setForm({ ...form, supportEmail: e.target.value });
                    if (formErrors.supportEmail) {
                      const updated = { ...formErrors };
                      delete updated.supportEmail;
                      setFormErrors(updated);
                    }
                  }}
                  icon={<Mail className="w-4 h-4 text-slate-400" />}
                  required
                />
              </div>

              <Input
                label="Địa chỉ văn phòng / trụ sở điều hành"
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành..."
                value={form.businessAddress}
                error={formErrors.businessAddress}
                onChange={(e) => {
                  setForm({ ...form, businessAddress: e.target.value });
                  if (formErrors.businessAddress) {
                    const updated = { ...formErrors };
                    delete updated.businessAddress;
                    setFormErrors(updated);
                  }
                }}
                icon={<MapPin className="w-4 h-4 text-slate-400" />}
                required
              />
            </CardContent>
          </Card>

          {/* 2. Dispatching & Operation Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-brand-500" />
                Tham số Điều phối &amp; Khung giờ Phục vụ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Chế độ Tự động bắn đơn (Auto-Dispatch Engine)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tự động phát sóng đơn hàng mới tới toàn bộ thợ gần nhất qua WebSocket và FCM khi khách đặt hẹn.
                  </p>
                </div>
                <Switch
                  checked={form.autoDispatchEnabled}
                  onChange={(checked) => setForm({ ...form, autoDispatchEnabled: checked })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Bán kính quét thợ tối đa (km)"
                  type="number"
                  min={1}
                  max={50}
                  value={form.maxRadiusKm}
                  error={formErrors.maxRadiusKm}
                  onChange={(e) => {
                    setForm({ ...form, maxRadiusKm: Number(e.target.value) });
                    if (formErrors.maxRadiusKm) {
                      const updated = { ...formErrors };
                      delete updated.maxRadiusKm;
                      setFormErrors(updated);
                    }
                  }}
                  required
                />
                <Input
                  label="Giờ bắt đầu nhận đơn ca sáng"
                  type="time"
                  value={form.workingHours.start}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      workingHours: { ...form.workingHours, start: e.target.value },
                    })
                  }
                  required
                />
                <Input
                  label="Giờ kết thúc nhận đơn ca tối"
                  type="time"
                  value={form.workingHours.end}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      workingHours: { ...form.workingHours, end: e.target.value },
                    })
                  }
                  required
                />
              </div>

              {isSuperAdmin && (
                <div className="pt-2 border-t border-slate-100">
                  <Input
                    label="Tỷ lệ hoa hồng chiết khấu sàn (%) - Super Admin cấp"
                    type="number"
                    min={0}
                    max={50}
                    value={form.defaultCommissionRate}
                    onChange={(e) =>
                      setForm({ ...form, defaultCommissionRate: Number(e.target.value) })
                    }
                    disabled={!isSuperAdmin}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit button */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              isLoading={updateSettingsMutation.isPending}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Lưu thay đổi cấu hình
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
