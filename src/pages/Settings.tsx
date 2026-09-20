import React, { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../redux/hooks';
import {
  Settings,
  UserCircle,
  SlidersHorizontal,
  CheckSquare,
  Globe,
  Percent,
  Loader2,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { settingsService, SystemSettings, SettingsUpdateDTO, ReportDeliveryMode } from '../services/api';

interface FormState {
  minimumHomeCollectionAmount: string;
  homeCollectionCharge: string;
  defaultPartnerCommission: string;
  labOpenTime: string;
  labCloseTime: string;
  reportDeliveryMode: ReportDeliveryMode;
  referralRewardAmount: string;
}

const DEFAULT_FORM: FormState = {
  minimumHomeCollectionAmount: '',
  homeCollectionCharge: '',
  defaultPartnerCommission: '',
  labOpenTime: '',
  labCloseTime: '',
  reportDeliveryMode: 'AUTO_PUSH',
  referralRewardAmount: '',
};

export const SettingsPage: React.FC = () => {
  const user = useAppSelector(state => state.auth.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [version, setVersion] = useState<string>('Unknown');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { success, error } = useToast();

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [data, ver] = await Promise.all([
        settingsService.getSettings(),
        settingsService.getVersion(),
      ]);
      setSettings(data);
      setVersion(ver.version ?? 'Unknown');
      setForm({
        minimumHomeCollectionAmount: String(data.minimumHomeCollectionAmount),
        homeCollectionCharge: String(data.homeCollectionCharge),
        defaultPartnerCommission: String(data.defaultPartnerCommission),
        labOpenTime: data.labOpenTime,
        labCloseTime: data.labCloseTime,
        reportDeliveryMode: data.reportDeliveryMode,
        referralRewardAmount: String(data.referralRewardAmount ?? 100),
      });
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) setFetchError('Unauthorized. Please log in again.');
      else if (status === 403) setFetchError('You do not have permission to view settings.');
      else if (status === 500) setFetchError('Server error. Please try again later.');
      else setFetchError('Failed to load settings. Check your connection and retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const validate = (): string | null => {
    const min = parseFloat(form.minimumHomeCollectionAmount);
    const charge = parseFloat(form.homeCollectionCharge);
    const comm = parseFloat(form.defaultPartnerCommission);
    const reward = parseFloat(form.referralRewardAmount);

    if (isNaN(min) || min < 0) return 'Minimum home collection amount cannot be negative.';
    if (isNaN(charge) || charge < 0) return 'Home collection charge cannot be negative.';
    if (isNaN(comm) || comm < 0 || comm > 100) return 'Commission must be between 0 and 100.';
    if (isNaN(reward) || reward < 0) return 'Referral reward amount cannot be negative.';
    if (!form.labOpenTime || !form.labCloseTime) return 'Lab operating hours are required.';
    if (form.labOpenTime >= form.labCloseTime) return 'Opening time must be before closing time.';
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      error('Validation Error', validationError);
      return;
    }
    setSaving(true);
    try {
      const payload: SettingsUpdateDTO = {
        minimumHomeCollectionAmount: parseFloat(form.minimumHomeCollectionAmount),
        homeCollectionCharge: parseFloat(form.homeCollectionCharge),
        defaultPartnerCommission: parseFloat(form.defaultPartnerCommission),
        labOpenTime: form.labOpenTime,
        labCloseTime: form.labCloseTime,
        reportDeliveryMode: form.reportDeliveryMode,
        referralRewardAmount: parseFloat(form.referralRewardAmount),
      };
      const updated = await settingsService.updateSettings(payload);
      setSettings(updated);
      success('Settings Saved', 'System configurations updated successfully.');
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) error('Unauthorized', 'Please log in again.');
      else if (status === 403) error('Forbidden', 'You do not have permission to update settings.');
      else error('Save Failed', e?.response?.data?.error || 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const setField = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" /> System & Account Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Configure clinical pickup logistics, system margins, and operator credentials.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2 pb-2 border-b border-border">
            <SlidersHorizontal className="h-4 w-4 text-primary" /> Global Logistics & Tariffs
          </h3>

          {loading ? (
            <div className="space-y-6 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-40 bg-muted rounded" />
                  <div className="h-9 w-full bg-muted rounded" />
                  <div className="h-2.5 w-56 bg-muted rounded" />
                </div>
              ))}
              <div className="flex justify-end pt-4 border-t border-border">
                <div className="h-8 w-36 bg-muted rounded-lg" />
              </div>
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <p className="text-sm text-destructive font-medium">{fetchError}</p>
              <button
                onClick={loadSettings}
                className="px-4 py-2 text-xs font-bold bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Retry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {!isSuperAdmin && (
                <div className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg px-4 py-2.5">
                  You have read-only access to system settings.
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Minimum Invoiced Free Home Collection</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                    <input
                      type="number"
                      className="w-full pl-7 p-2 border border-input text-sm font-bold rounded bg-background disabled:opacity-60"
                      value={form.minimumHomeCollectionAmount}
                      onChange={setField('minimumHomeCollectionAmount')}
                      min={0}
                      disabled={!isSuperAdmin}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Orders below threshold incur extra home collection charge.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Home Collection Charge</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                    <input
                      type="number"
                      className="w-full pl-7 p-2 border border-input text-sm font-bold rounded bg-background disabled:opacity-60"
                      value={form.homeCollectionCharge}
                      onChange={setField('homeCollectionCharge')}
                      min={0}
                      disabled={!isSuperAdmin}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1">
                    Default Franchise Split (P0)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"><Percent className="h-3 w-3" /></span>
                    <input
                      type="number"
                      className="w-full pl-7 p-2 border border-input text-sm font-bold rounded bg-background disabled:opacity-60"
                      value={form.defaultPartnerCommission}
                      onChange={setField('defaultPartnerCommission')}
                      min={0}
                      max={100}
                      disabled={!isSuperAdmin}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Standard commission payout ceiling applied to new partners.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Lab Operating Window</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      className="p-2 border border-input rounded text-sm text-foreground bg-background disabled:opacity-60"
                      value={form.labOpenTime}
                      onChange={setField('labOpenTime')}
                      disabled={!isSuperAdmin}
                    />
                    <input
                      type="time"
                      className="p-2 border border-input rounded text-sm text-foreground bg-background disabled:opacity-60"
                      value={form.labCloseTime}
                      onChange={setField('labCloseTime')}
                      disabled={!isSuperAdmin}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Report Generation Channel</label>
                  <select
                    className="w-full p-2 border border-input rounded text-sm text-foreground bg-background disabled:opacity-60"
                    value={form.reportDeliveryMode}
                    onChange={setField('reportDeliveryMode')}
                    disabled={!isSuperAdmin}
                  >
                    <option value="AUTO_PUSH">Direct Auto-Push on Approval</option>
                    <option value="MANUAL_DISPATCH">Hold until manual Franchise dispatch</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Referral Reward Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                    <input
                      type="number"
                      className="w-full pl-7 p-2 border border-input text-sm font-bold rounded bg-background disabled:opacity-60"
                      value={form.referralRewardAmount}
                      onChange={setField('referralRewardAmount')}
                      min={0}
                      disabled={!isSuperAdmin}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Amount credited to referrer's wallet upon successful sign-up.</p>
                </div>
              </div>

              {isSuperAdmin && (
                <div className="flex justify-end pt-4 border-t border-border">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-primary text-white font-black text-xs rounded-lg flex items-center gap-1.5 hover:bg-primary/90 shadow-sm disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
                    {saving ? 'Saving...' : 'Save System Overrides'}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-foreground border-b border-border pb-2 flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-primary" /> Active Credentials
            </h3>
            <div className="flex items-center gap-3">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-foreground font-bold">
                  {user?.name?.charAt(0)}
                </div>
              )}
              <div>
                <div className="font-black text-sm text-foreground">{user?.name}</div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded inline-block mt-1">
                  {user?.role}
                </div>
              </div>
            </div>
            <div className="space-y-3 text-xs text-muted-foreground pt-2">
              <div>Registered Email: <strong className="text-foreground block">{user?.email}</strong></div>
              <div>Phone Anchor: <strong className="text-foreground block">{user?.phone}</strong></div>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 p-5 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-primary flex items-center gap-1 uppercase">
              <Globe className="h-4 w-4" /> Platform Version
            </h4>
            {loading ? (
              <div className="h-7 w-24 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-xl font-black text-[#006D6F]">{version}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};