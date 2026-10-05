import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { TenantSettings } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/feedback/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Switch } from '../../components/common/Switch';
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

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getTenantSettings(currentTenantId);
      setForm(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi tải thông tin cài đặt';
      toast({
        type: 'error',
        title: 'Lỗi tải dữ liệu',
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [currentTenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateTenantSettings(currentTenantId, form);
      toast({
        type: 'success',
        title: 'Lưu cài đặt thành công!',
        message: `Đã cập nhật thông số vận hành cho ${currentTenantName}.`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể lưu cài đặt';
      toast({
        type: 'error',
        title: 'Lưu thất bại',
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Đang tải cấu hình...</p>
        </div>
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
                  onChange={(e) => setForm({ ...form, hotline: e.target.value })}
                  icon={<Phone className="w-4 h-4 text-slate-400" />}
                  required
                />
                <Input
                  label="Email hỗ trợ & nhận đối soát"
                  type="email"
                  placeholder="cskh@domain.com"
                  value={form.supportEmail}
                  onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                  icon={<Mail className="w-4 h-4 text-slate-400" />}
                  required
                />
              </div>

              <Input
                label="Địa chỉ văn phòng / trụ sở điều hành"
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành..."
                value={form.businessAddress}
                onChange={(e) => setForm({ ...form, businessAddress: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, maxRadiusKm: Number(e.target.value) })}
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
              isLoading={isSaving}
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
