import React, { useState, useEffect } from 'react';
import type { Tasker } from '../../types';
import {
  useCreateTaskerMutation,
  useUpdateTaskerMutation,
} from '../../api/queries';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Switch } from '../../components/common/Switch';
import {
  createTaskerSchema,
  updateTaskerSchema,
  type CreateTaskerInput,
  type UpdateTaskerInput,
} from '../../schemas/tasker.schema';
import {
  UserPlus,
  UserCheck,
  CreditCard,
  Wrench,
  Compass,
  Plus,
  X,
  Lock,
} from 'lucide-react';

export interface TaskerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasker?: Tasker | null;
  tenantId?: string | null;
  onSuccess?: (savedTasker: Tasker) => void;
}

const COMMON_SKILLS = [
  { id: 'don-dep-ve-sinh', label: 'Dọn dẹp vệ sinh' },
  { id: 'dien-lanh', label: 'Điện lạnh & Máy lạnh' },
  { id: 'sua-dien-nuoc', label: 'Sửa điện nước' },
  { id: 'giat-sofa', label: 'Giặt ghế & Sofa' },
  { id: 'chuyen-nha', label: 'Vận chuyển nhà' },
  { id: 'khoa-cua', label: 'Sửa khóa cửa' },
  { id: 'thong-nghet', label: 'Thông tắc bồn cầu' },
  { id: 'son-sua-nha', label: 'Sơn sửa nhà' },
];

export const TaskerModal: React.FC<TaskerModalProps> = ({
  isOpen,
  onClose,
  tasker,
  tenantId,
  onSuccess,
}) => {
  const isEditing = Boolean(tasker);
  const createMutation = useCreateTaskerMutation(tenantId);
  const updateMutation = useUpdateTaskerMutation();

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [depositBalance, setDepositBalance] = useState<number>(500000);
  const [salaryType, setSalaryType] = useState<'COMMISSION' | 'FIXED_SALARY'>('COMMISSION');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(15);
  const [autoRadarEnabled, setAutoRadarEnabled] = useState(true);
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');

  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (tasker) {
      setName(tasker.name || '');
      setPhone(tasker.phone || '');
      setEmail(tasker.email || '');
      setPassword('');
      setIdCardNumber(tasker.idCardNumber || '');
      setSkills(tasker.skills || []);
      setDepositBalance(tasker.depositBalance ?? 500000);
      setSalaryType(tasker.salaryType || 'COMMISSION');
      setMaxDistanceKm(tasker.maxDistanceKm ?? 15);
      setAutoRadarEnabled(tasker.autoRadarEnabled ?? true);
      setBankName(tasker.bankName || '');
      setBankAccountNumber(tasker.bankAccountNumber || '');
      setBankAccountHolder(tasker.bankAccountHolder || '');
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setIdCardNumber('');
      setSkills(['don-dep-ve-sinh']);
      setDepositBalance(500000);
      setSalaryType('COMMISSION');
      setMaxDistanceKm(15);
      setAutoRadarEnabled(true);
      setBankName('Vietcombank');
      setBankAccountNumber('');
      setBankAccountHolder('');
    }
    setErrors({});
  }, [tasker, isOpen]);

  const toggleSkill = (skillId: string) => {
    setSkills((prev) =>
      prev.includes(skillId)
        ? prev.filter((s) => s !== skillId)
        : [...prev, skillId]
    );
  };

  const handleAddCustomSkill = () => {
    const trimmed = customSkill.trim().toLowerCase();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
      setCustomSkill('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (isEditing && tasker) {
      const payload: UpdateTaskerInput = {
        name: name.trim(),
        phone: phone.trim(),
        idCardNumber: idCardNumber.trim() || undefined,
        skills,
        salaryType,
        bankName: bankName.trim() || undefined,
        bankAccountNumber: bankAccountNumber.trim() || undefined,
        bankAccountHolder: bankAccountHolder.trim().toUpperCase() || undefined,
      };

      const parsed = updateTaskerSchema.safeParse(payload);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          const path = issue.path[0]?.toString() || 'form';
          fieldErrors[path] = issue.message;
        });
        setErrors(fieldErrors);
        return;
      }

      try {
        const result = await updateMutation.mutateAsync({
          id: tasker.id,
          data: parsed.data,
        });
        onSuccess?.(result);
        onClose();
      } catch (err: unknown) {
        setErrors({
          form: err instanceof Error ? err.message : 'Cập nhật hồ sơ thất bại',
        });
      }
    } else {
      const payload: CreateTaskerInput = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
        tenantId: tenantId || undefined,
        idCardNumber: idCardNumber.trim() || undefined,
        skills,
        depositBalance: Number(depositBalance),
        maxDistanceKm: Number(maxDistanceKm),
        autoRadarEnabled,
        bankName: bankName.trim() || undefined,
        bankAccountNumber: bankAccountNumber.trim() || undefined,
        bankAccountHolder: bankAccountHolder.trim().toUpperCase() || undefined,
      };

      const parsed = createTaskerSchema.safeParse(payload);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          const path = issue.path[0]?.toString() || 'form';
          fieldErrors[path] = issue.message;
        });
        setErrors(fieldErrors);
        return;
      }

      try {
        const result = await createMutation.mutateAsync(parsed.data);
        onSuccess?.(result);
        onClose();
      } catch (err: unknown) {
        setErrors({
          form: err instanceof Error ? err.message : 'Đăng ký thợ mới thất bại',
        });
      }
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Cập nhật hồ sơ: ${tasker?.name}` : 'Đăng ký Thợ mới vào Tenant'}
      subtitle={
        isEditing
          ? `Mã định danh: ${tasker?.code || tasker?.id} • Cập nhật chuyên môn & tài khoản`
          : 'Thiết lập tài khoản đăng nhập, số dư ký quỹ đảm bảo ban đầu và kỹ năng phục vụ'
      }
      maxWidth="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
            Hủy bỏ
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isPending}
            icon={isEditing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          >
            {isEditing ? 'Lưu thay đổi hồ sơ' : 'Xác nhận tạo hồ sơ thợ'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errors.form && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
            {errors.form}
          </div>
        )}

        {/* Section 1: Thông tin cá nhân & Tài khoản */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-brand-600" />
            1. Thông tin cá nhân &amp; Tài khoản
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Họ và tên thợ"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              error={errors.name}
            />

            <Input
              label="Số điện thoại di động"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912345678"
              error={errors.phone}
            />

            <Input
              label="Email đăng nhập"
              required={!isEditing}
              disabled={isEditing}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tho.nguyen@linkkwork.vn"
              error={errors.email}
              helperText={isEditing ? 'Email đăng nhập cố định theo User ID' : undefined}
            />

            {!isEditing ? (
              <Input
                label="Mật khẩu khởi tạo"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mặc định: Tasker@123456"
                error={errors.password}
                icon={<Lock className="w-4 h-4" />}
              />
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Hình thức chi trả thu nhập
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSalaryType('COMMISSION')}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      salaryType === 'COMMISSION'
                        ? 'bg-brand-50 border-brand-500 text-brand-700 ring-2 ring-brand-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Hoa hồng (85/15)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalaryType('FIXED_SALARY')}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      salaryType === 'FIXED_SALARY'
                        ? 'bg-brand-50 border-brand-500 text-brand-700 ring-2 ring-brand-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Lương cứng
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="w-full">
            <Input
              label="Số CCCD / CMND (Duyệt KYC)"
              value={idCardNumber}
              onChange={(e) => setIdCardNumber(e.target.value)}
              placeholder="001200000001 (12 số CCCD gắn chip)"
              error={errors.idCardNumber}
            />
          </div>
        </div>

        {/* Section 2: Kỹ năng & Chuyên môn */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-brand-600" />
              2. Kỹ năng &amp; Lĩnh vực đảm nhận <span className="text-rose-500">*</span>
            </h4>
            <span className="text-[11px] text-slate-400">
              Đã chọn: <strong className="text-brand-600">{skills.length}</strong> kỹ năng
            </span>
          </div>

          {errors.skills && (
            <p className="text-xs text-rose-600 font-medium">{errors.skills}</p>
          )}

          {/* Common Skills Pills */}
          <div className="flex flex-wrap gap-1.5">
            {COMMON_SKILLS.map((item) => {
              const isSelected = skills.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleSkill(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-brand-500 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Add custom skill */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomSkill();
                }
              }}
              placeholder="Thêm kỹ năng khác (ví dụ: dien-dan-dung)..."
              className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddCustomSkill}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Thêm
            </Button>
          </div>

          {/* Selected custom skills */}
          {skills.some((s) => !COMMON_SKILLS.some((cs) => cs.id === s)) && (
            <div className="flex flex-wrap gap-1 pt-1">
              {skills
                .filter((s) => !COMMON_SKILLS.some((cs) => cs.id === s))
                .map((custom) => (
                  <span
                    key={custom}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-brand-50 text-brand-800 border border-brand-200 font-medium"
                  >
                    {custom}
                    <button
                      type="button"
                      onClick={() => toggleSkill(custom)}
                      className="hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Section 3: Sàn làm việc & Tài chính ban đầu (chỉ khi tạo mới) */}
        {!isEditing && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-brand-600" />
              3. Sàn làm việc &amp; Ký quỹ ban đầu
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Input
                  label="Số dư ký quỹ khởi tạo (VNĐ)"
                  type="number"
                  value={depositBalance}
                  onChange={(e) => setDepositBalance(Math.max(0, Number(e.target.value)))}
                  error={errors.depositBalance}
                  helperText="Tự động ghi nhận bút toán nạp tiền ký quỹ vào Sổ cái"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Bán kính phục vụ: <strong className="text-brand-600">{maxDistanceKm} km</strong>
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={maxDistanceKm}
                  onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>1 km</span>
                  <span>25 km</span>
                  <span>50 km</span>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <Switch
                checked={autoRadarEnabled}
                onChange={setAutoRadarEnabled}
                label="Bật radar quét việc tự động"
                description="Cho phép hệ thống tự động gán đơn trong bán kính phục vụ khi thợ bật trực tuyến"
              />
            </div>
          </div>
        )}

        {/* Section 4: Tài khoản ngân hàng nhận lương */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-brand-600" />
            {isEditing ? '3' : '4'}. Tài khoản ngân hàng nhận lương / quyết toán
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Ngân hàng"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Vietcombank / Techcombank"
              error={errors.bankName}
            />

            <Input
              label="Số tài khoản"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              placeholder="1012345678"
              error={errors.bankAccountNumber}
            />

            <Input
              label="Chủ tài khoản (Không dấu)"
              value={bankAccountHolder}
              onChange={(e) => setBankAccountHolder(e.target.value.toUpperCase())}
              placeholder="NGUYEN VAN A"
              error={errors.bankAccountHolder}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
