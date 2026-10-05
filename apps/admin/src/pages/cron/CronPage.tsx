import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../lib/queryClient';
import { CronJobItem } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/feedback/ToastContext';
import {
  useCronJobsQuery,
  useToggleCronMutation,
  useTriggerCronMutation,
  useUpdateCronParamsMutation,
} from '../../api/queries';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Switch } from '../../components/common/Switch';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { StatCard } from '../../components/common/StatCard';
import { SkeletonStatCards, SkeletonCardGrid } from '../../components/common/Skeleton';
import {
  Cpu,
  Play,
  Settings2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ShieldAlert,
  Server,
  Activity,
} from 'lucide-react';

export const CronPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cronJobs = [], isLoading } = useCronJobsQuery();
  const toggleCronMutation = useToggleCronMutation();
  const triggerCronMutation = useTriggerCronMutation();
  const updateParamsMutation = useUpdateCronParamsMutation();

  const [runningJobName, setRunningJobName] = useState<string | null>(null);

  // Settings modal
  const [editingJob, setEditingJob] = useState<CronJobItem | null>(null);
  const [paramState, setParamState] = useState<Record<string, string | number | boolean>>({});
  const [paramErrors, setParamErrors] = useState<Record<string, string>>({});

  const handleToggle = async (jobName: string, currentEnabled: boolean) => {
    try {
      await toggleCronMutation.mutateAsync({
        jobName,
        enabled: !currentEnabled,
      });
    } catch {
      // Handled in mutation onError
    }
  };

  const handleRunNow = async (jobName: string) => {
    try {
      setRunningJobName(jobName);
      await triggerCronMutation.mutateAsync(jobName);
    } catch {
      // Handled in mutation onError
    } finally {
      setRunningJobName(null);
    }
  };

  const handleOpenSettings = (job: CronJobItem) => {
    setEditingJob(job);
    setParamState(job.params || {});
    setParamErrors({});
  };

  const handleSaveParams = async () => {
    if (!editingJob) return;

    // Validate params
    const errors: Record<string, string> = {};
    Object.keys(editingJob.params || {}).forEach((key) => {
      const isNum = typeof editingJob.params[key] === 'number';
      const val = paramState[key];
      if (isNum) {
        if (val === '' || val === undefined || isNaN(Number(val)) || Number(val) <= 0) {
          errors[key] = 'Giá trị tham số phải là số dương lớn hơn 0';
        }
      } else if (!String(val ?? '').trim()) {
        errors[key] = 'Tham số này không được để trống';
      }
    });

    if (Object.keys(errors).length > 0) {
      setParamErrors(errors);
      return;
    }

    try {
      await updateParamsMutation.mutateAsync({
        jobName: editingJob.jobName,
        params: paramState,
      });
      setEditingJob(null);
      setParamErrors({});
    } catch {
      // Handled in mutation onError
    }
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="py-20 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900">Không có quyền truy cập</h2>
        <p className="text-sm text-slate-500 mt-1">
          Khu vực Trung tâm điều khiển Cron Jobs chỉ dành cho Super Admin toàn hệ thống.
        </p>
      </div>
    );
  }

  const activeCount = cronJobs.filter((j) => j.isEnabled).length;
  const pausedCount = cronJobs.filter((j) => !j.isEnabled).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Cpu className="w-7 h-7 text-brand-500" />
            Trung tâm Giám sát &amp; Điều khiển Cron Jobs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Dành riêng cho Super Admin: Bật/tắt tiến trình nền, cấu hình chu kỳ và kích hoạt tức thì các Worker tự động.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cronJobs })}
          leftIcon={<RotateCw className="w-4 h-4" />}
          disabled={isLoading}
        >
          Làm mới trạng thái
        </Button>
      </div>

      {/* Overview StatCards */}
      {isLoading && cronJobs.length === 0 ? (
        <SkeletonStatCards count={3} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Tổng số tiến trình"
            value={cronJobs.length}
            icon={<Server className="w-5 h-5 text-slate-600" />}
            iconBgColor="bg-slate-100 text-slate-700 border border-slate-200"
            description="Workers nền tảng"
          />

          <StatCard
            title="Đang hoạt động"
            value={activeCount}
            icon={<Activity className="w-5 h-5 text-emerald-600 animate-pulse" />}
            iconBgColor="bg-emerald-50 text-emerald-600 border border-emerald-100"
            description="Sẵn sàng kích hoạt theo lịch"
          />

          <StatCard
            title="Đang tạm dừng"
            value={pausedCount}
            icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
            iconBgColor="bg-amber-50 text-amber-600 border border-amber-100"
            description="Đã tắt thủ công bởi Admin"
          />
        </div>
      )}

      {/* Cron Jobs Grid */}
      {isLoading && cronJobs.length === 0 ? (
        <SkeletonCardGrid count={4} columns={2} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {cronJobs.map((job) => {
            const isExecuting = runningJobName === job.jobName;

            return (
              <Card
                key={job.jobName}
                className={`relative overflow-hidden transition-all ${
                  job.isEnabled ? 'border-slate-200' : 'border-slate-200 bg-slate-50/60 opacity-90'
                }`}
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    job.isEnabled ? 'bg-brand-500' : 'bg-slate-300'
                  }`}
                />

                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold text-slate-900 font-mono">
                        {job.jobName}
                      </CardTitle>
                      <Badge
                        variant={
                          job.lastStatus === 'SUCCESS'
                            ? 'success'
                            : job.lastStatus === 'FAILED'
                            ? 'danger'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {job.lastStatus}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{job.description}</p>
                  </div>

                  {/* On/Off Switch */}
                  <div className="shrink-0 pl-2">
                    <Switch
                      checked={job.isEnabled}
                      onChange={() => handleToggle(job.jobName, job.isEnabled)}
                    />
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-2 text-xs">
                  {/* Cron Specs */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-lg">
                    <div>
                      <span className="text-slate-400 block font-medium">Chu kỳ thực thi:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {job.cronExpression}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Lần chạy gần nhất:</span>
                      <span className="font-medium text-slate-800 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(job.lastRunAt).toLocaleTimeString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  {/* Custom Parameters */}
                  {job.params && Object.keys(job.params).length > 0 && (
                    <div>
                      <span className="text-slate-400 block mb-1 font-medium">
                        Tham số cấu hình hiện hành:
                      </span>
                      <div className="bg-slate-900 text-slate-200 p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto">
                        {JSON.stringify(job.params, null, 2)}
                      </div>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Đã xử lý {job.successCount} lượt thành công
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenSettings(job)}
                        leftIcon={<Settings2 className="w-3.5 h-3.5" />}
                      >
                        Cài đặt
                      </Button>

                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleRunNow(job.jobName)}
                        disabled={isExecuting || !job.isEnabled}
                        leftIcon={
                          isExecuting ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )
                        }
                      >
                        {isExecuting ? 'Đang chạy...' : 'Kích hoạt ngay'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Settings Modal */}
      <Modal
        isOpen={!!editingJob}
        onClose={() => setEditingJob(null)}
        title={`Cấu hình tham số tiến trình [${editingJob?.jobName}]`}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingJob(null)}
              disabled={updateParamsMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveParams}
              disabled={updateParamsMutation.isPending}
            >
              {updateParamsMutation.isPending ? 'Đang lưu...' : 'Lưu cấu hình'}
            </Button>
          </div>
        }
      >
        {editingJob && (
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              Điều chỉnh các ngưỡng thời gian và giá trị vận hành của Worker. Các thay đổi sẽ có hiệu lực ngay trong chu kỳ quét kế tiếp.
            </div>

            {Object.keys(editingJob.params || {}).map((paramKey) => (
              <Input
                key={paramKey}
                label={paramKey}
                type={typeof editingJob.params[paramKey] === 'number' ? 'number' : 'text'}
                value={String(paramState[paramKey] ?? '')}
                error={paramErrors[paramKey]}
                required
                onChange={(e) => {
                  const val =
                    typeof editingJob.params[paramKey] === 'number'
                      ? Number(e.target.value)
                      : e.target.value;
                  setParamState({
                    ...paramState,
                    [paramKey]: val,
                  });
                  if (paramErrors[paramKey]) {
                    const newErr = { ...paramErrors };
                    delete newErr[paramKey];
                    setParamErrors(newErr);
                  }
                }}
              />
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};
