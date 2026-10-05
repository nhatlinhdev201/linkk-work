import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, CheckCircle2, Building, ShieldCheck, ArrowLeft } from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Card } from '../../components/common/Card';
import { useToast } from '../../components/feedback/ToastContext';

export const PartnerRegisterPage: React.FC = () => {
  const [businessName, setBusinessName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [city, setCity] = useState('Hà Nội');
  const [selectedServices, setSelectedServices] = useState<string[]>([
    'Dọn dẹp nhà theo giờ',
    'Vệ sinh máy lạnh',
  ]);
  const [loading, setLoading] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);
  const { success, error } = useToast();

  const handleToggleService = (srv: string) => {
    if (selectedServices.includes(srv)) {
      setSelectedServices(selectedServices.filter((s) => s !== srv));
    } else {
      setSelectedServices([...selectedServices, srv]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedServices.length === 0) {
      error('Vui lòng chọn ít nhất 1 dịch vụ cung ứng');
      return;
    }

    setLoading(true);
    try {
      const app = await api.submitPartnerApplication({
        businessName,
        taxId,
        contactName,
        contactPhone,
        contactEmail,
        city,
        services: selectedServices,
        selectedServices,
      });
      setSubmittedAppId(app.id);
      success('Nộp hồ sơ thành công!', 'Hồ sơ đã được gửi tới Ban Quản Trị LinkkWork để thẩm định.');
    } catch (err: any) {
      error('Lỗi nộp hồ sơ', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-slate-50 to-orange-50 py-10 px-4">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-brand-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Đăng nhập Quản trị</span>
          </Link>
          <span className="text-xs text-brand-700 font-mono font-bold bg-brand-100/70 px-2.5 py-1 rounded-full border border-brand-200">
            Tenant Partner Onboarding
          </span>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white flex items-center justify-center mx-auto shadow-md">
            <Layers className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Đăng Ký Đối Tác Doanh Nghiệp (Tenant Partner)
          </h1>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            Gia nhập nền tảng LinkkWork để số hóa quy trình quản lý nhân sự, tiếp nhận đơn hàng tự động và mở rộng doanh thu.
          </p>
        </div>

        {/* Form or Success State */}
        {submittedAppId ? (
          <Card className="text-center p-8 border-emerald-200 bg-emerald-50/40">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-emerald-950 mb-2">Hồ sơ đã được gửi thành công!</h2>
            <p className="text-sm text-emerald-800 mb-6">
              Mã hồ sơ: <span className="font-mono font-bold">{submittedAppId}</span>. Bộ phận thẩm định đối tác của LinkkWork sẽ kiểm tra Giấy phép ĐKKD và liên hệ qua số điện thoại <strong>{contactPhone}</strong> trong vòng 24 giờ làm việc.
            </p>
            <div className="bg-white p-4 rounded-xl border border-emerald-200 text-xs text-slate-600 text-left space-y-1 mb-6">
              <p>• <strong>Doanh nghiệp:</strong> {businessName}</p>
              <p>• <strong>Mã số thuế:</strong> {taxId}</p>
              <p>• <strong>Khu vực:</strong> {city}</p>
              <p>• <strong>Dịch vụ:</strong> {selectedServices.join(', ')}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSubmittedAppId(null);
                setBusinessName('');
                setTaxId('');
              }}
            >
              Nộp hồ sơ cho doanh nghiệp khác
            </Button>
          </Card>
        ) : (
          <Card className="shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building className="w-4 h-4 text-brand-500" />
                  <span>1. Thông tin Pháp lý Doanh nghiệp</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Tên Công ty / Hộ kinh doanh *"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Công ty TNHH Vệ Sinh Việt"
                  required
                />
                <Input
                  label="Mã số thuế (MST) *"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="0109876543"
                  required
                />
              </div>

              <div className="border-b border-slate-100 pb-3 pt-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-500" />
                  <span>2. Thông tin Người đại diện & Liên hệ</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Họ và tên Người đại diện *"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  required
                />
                <Input
                  label="Số điện thoại Hotline *"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="0912 345 678"
                  required
                />
                <Input
                  label="Email Doanh nghiệp *"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@doanhnghiep.vn"
                  required
                />
                <Select
                  label="Tỉnh / Thành phố Hoạt động *"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  options={[
                    { value: 'Hà Nội', label: 'Hà Nội' },
                    { value: 'TP. Hồ Chí Minh', label: 'TP. Hồ Chí Minh' },
                    { value: 'Đà Nẵng', label: 'Đà Nẵng' },
                    { value: 'Cần Thơ', label: 'Cần Thơ' },
                    { value: 'Hải Phòng', label: 'Hải Phòng' },
                    { value: 'Bình Dương', label: 'Bình Dương' },
                  ]}
                />
              </div>

              <div className="border-b border-slate-100 pb-3 pt-2">
                <h3 className="text-sm font-bold text-slate-900">
                  3. Nhóm Dịch vụ Đăng ký Cung cấp
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  'Dọn dẹp nhà theo giờ',
                  'Vệ sinh máy lạnh / Điện lạnh',
                  'Nấu ăn gia đình',
                  'Giặt ủi & Sofa / Nệm / Rèm',
                  'Tổng vệ sinh chuyên sâu',
                  'Trông trẻ & Chăm sóc người cao tuổi',
                ].map((srv) => (
                  <label
                    key={srv}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                      selectedServices.includes(srv)
                        ? 'border-brand-500 bg-brand-50/50 text-brand-950'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(srv)}
                      onChange={() => handleToggleService(srv)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                    />
                    <span>{srv}</span>
                  </label>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Bằng việc gửi đơn, bạn đồng ý với Điều khoản Đối tác LinkkWork.
                </p>
                <Button type="submit" variant="primary" size="lg" isLoading={loading}>
                  Gửi Hồ Sơ Xét Duyệt
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
};
