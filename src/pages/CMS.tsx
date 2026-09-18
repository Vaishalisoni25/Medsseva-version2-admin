import React, { useState, useEffect, useRef } from 'react';
import { useCmsBannersQuery, useCmsConfigQuery, useCmsAlertsQuery, useCmsPagesQuery, useCmsAuditLogsQuery } from '@/hooks/useAdminQueries';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import {
  fetchBanners, createBanner, updateBanner, removeBanner,
  fetchConfig, saveConfig,
  fetchAlerts, saveAlert, removeAlert,
  clearCmsMessages,
} from '../redux/slices/cmsSlice';
import { Banner, EmergencyAlert } from '../types/cms';
import { cmsService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon,
  Plus,
  Link as LinkIcon,
  ToggleLeft,
  ToggleRight,
  Layers,
  X,
  Save,
  Smartphone,
  Settings,
  AlertTriangle,
  LayoutDashboard,
  Eye,
  Grid,
  Trash,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { MobileAppSimulator } from '../components/MobileAppSimulator';

export const CMSPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { banners, config, alerts, loading, saving, error, successMessage } = useAppSelector(state => state.cms);

  const [activeTab, setActiveTab] = useState<'layout' | 'banners' | 'toggles' | 'emergency'>('layout');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerType, setBannerType] = useState<'HERO' | 'PROMO'>('HERO');
  const [bannerFilter, setBannerFilter] = useState<'ALL' | 'HERO' | 'PROMO'>('ALL');
  const [bannerLinkType, setBannerLinkType] = useState<Banner['linkType']>('Package');
  const [bannerLinkValue, setBannerLinkValue] = useState('');
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [bannerImagePreview, setBannerImagePreview] = useState('');
  const [bannerUploading, setBannerUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [emergId, setEmergId] = useState<string | undefined>(undefined);
  const [emergTitle, setEmergTitle] = useState('');
  const [emergMsg, setEmergMsg] = useState('');
  const [emergType, setEmergType] = useState<'info' | 'warning' | 'critical'>('info');
  const [emergActive, setEmergActive] = useState(true);

 useCmsBannersQuery();
  useCmsConfigQuery();
  useCmsAlertsQuery();
  useCmsPagesQuery();
  useCmsAuditLogsQuery();

useCmsBannersQuery();
  useCmsConfigQuery();
  useCmsAlertsQuery();
  useCmsPagesQuery();
  useCmsAuditLogsQuery();

  useEffect(() => {
    if (alerts.length > 0) {
      const active = alerts.find(a => a.isActive) || alerts[0];
      setEmergId(active.id);
      setEmergTitle(active.title);
      setEmergMsg(active.message);
      setEmergType(active.severity);
      setEmergActive(active.isActive);
    }
  }, [alerts]);

  useEffect(() => {
    if (successMessage || error) {
      const t = setTimeout(() => dispatch(clearCmsMessages()), 3000);
      return () => clearTimeout(t);
    }
  }, [successMessage, error, dispatch]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerImageFile(file);
    setBannerImagePreview(URL.createObjectURL(file));
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle) return;
    let imageUrl = bannerImagePreview;
    let imagePublicId: string | undefined;

    if (bannerImageFile) {
      setBannerUploading(true);
      try {
        const result = await cmsService.uploadBannerImage(bannerImageFile);
        imageUrl = result.imageUrl;
        imagePublicId = result.publicId;
      } catch {
        setBannerUploading(false);
        return;
      }
      setBannerUploading(false);
    }

    if (!imageUrl) return;

    try {
      await dispatch(createBanner({
        title: bannerTitle,
        subtitle: bannerSubtitle,
        imageUrl,
        imagePublicId,
        bannerType,
        linkType: bannerLinkType,
        linkValue: bannerLinkValue || undefined,
        isActive: true,
        displayOrder: banners.length,
        priority: 0,
        cities: [],
        branches: [],
      })).unwrap();

      setIsDrawerOpen(false);
      setBannerTitle('');
      setBannerSubtitle('');
      setBannerType('HERO');
      setBannerLinkValue('');
      setBannerImageFile(null);
      setBannerImagePreview('');
    } catch (err) {
      console.error('Failed to create banner:', err);
    }
  };

  const handleToggleBanner = (banner: Banner) => {
    dispatch(updateBanner({ id: banner.id, isActive: !banner.isActive }));
  };

  const handleDeleteBanner = (id: string) => {
    dispatch(removeBanner(id));
  };

  const handleToggleSection = (sectionKey: string) => {
    if (!config) return;
    const active = config.layoutSections.includes(sectionKey);
    const newSections = active
      ? config.layoutSections.filter(s => s !== sectionKey)
      : [...config.layoutSections, sectionKey];
    dispatch(saveConfig({ layoutSections: newSections }));
  };

  const handleReorderCategory = (index: number, direction: 'up' | 'down') => {
    if (!config) return;
    const cats = [...config.categoryOrder];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= cats.length) return;
    [cats[index], cats[targetIdx]] = [cats[targetIdx], cats[index]];
    dispatch(saveConfig({ categoryOrder: cats }));
  };

  const handleToggleFeature = (key: string, val: boolean) => {
    if (!config) return;
    dispatch(saveConfig({ featureFlags: { ...config.featureFlags, [key]: val } }));
  };

  const handleSaveEmergency = () => {
    dispatch(saveAlert({
      id: emergId,
      title: emergTitle,
      message: emergMsg,
      severity: emergType,
      isActive: emergActive,
    }));
  };

  return (
    <div className="space-y-6 pb-10">
      {(successMessage || error) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={cn(
            "fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-bold",
            successMessage ? "bg-teal-600 text-white" : "bg-rose-600 text-white"
          )}
        >
          {successMessage ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {successMessage || error}
        </motion.div>
      )}

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Smartphone className="h-7 w-7 text-teal-600" /> App Control Center & Dynamic CMS
        </h1>
        <p className="text-sm text-muted-foreground">
          Fully command your customer mobile application layout, priority scans, banner cycles, and feature deployments instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <div className="xl:col-span-8 space-y-6 bg-card border rounded-2xl p-6 shadow-sm">
          <div className="flex overflow-x-auto gap-2 p-1 bg-muted rounded-xl w-max select-none border">
            {[
              { id: 'layout', label: 'Home Layout', icon: <LayoutDashboard className="h-4 w-4" /> },
              { id: 'banners', label: 'Banners', icon: <ImageIcon className="h-4 w-4" /> },
              { id: 'toggles', label: 'Feature Flags', icon: <Settings className="h-4 w-4" /> },
              { id: 'emergency', label: 'Emergency Alert', icon: <AlertTriangle className="h-4 w-4" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all",
                  activeTab === tab.id
                    ? tab.id === 'emergency' ? "bg-background shadow text-rose-700" : "bg-background shadow text-teal-700"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t">
            {loading && !config ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {activeTab === 'layout' && config && (
                  <motion.div key="layout" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                    <div>
                      <h3 className="text-sm font-black text-foreground flex items-center gap-2 uppercase tracking-wider">
                        <Layers className="h-4 w-4 text-teal-600" /> 1. Active Home Sections
                      </h3>
                      <p className="text-xs text-muted-foreground mb-4">Check the slots below to inject or suppress blocks from the mobile homepage viewport.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { id: 'hero_banner', label: 'Hero Image Carousel' },
                          { id: 'quick_categories', label: 'Dynamic Quick Categories' },
                          { id: 'seva_check', label: 'SevaCheck Premium Strip' },
                          { id: 'health_campaigns', label: 'Active Health Campaigns' },
                          { id: 'trending_packages', label: 'Trending Analytics Packages' },
                          { id: 'ai_health_tips', label: 'AI Health Insights Tip Strip' },
                        ].map(sec => {
                          const isEnabled = config.layoutSections.includes(sec.id);
                          return (
                            <div
                              key={sec.id}
                              onClick={() => handleToggleSection(sec.id)}
                              className={cn(
                                "p-3.5 border-2 rounded-xl flex justify-between items-center cursor-pointer hover:scale-[1.01] transition-all",
                                isEnabled ? "border-teal-100 bg-teal-50/40" : "border-border bg-muted/30 opacity-60"
                              )}
                            >
                              <span className="text-xs font-black">{sec.label}</span>
                              {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : isEnabled ? (
                                <div className="h-5 w-9 bg-teal-600 rounded-full p-0.5 flex justify-end"><div className="h-4 w-4 bg-white rounded-full" /></div>
                              ) : (
                                <div className="h-5 w-9 bg-slate-300 rounded-full p-0.5 flex justify-start"><div className="h-4 w-4 bg-white rounded-full" /></div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-foreground flex items-center gap-2 uppercase tracking-wider border-t pt-6">
                        <Grid className="h-4 w-4 text-indigo-600" /> 2. Quick Category Priority Sorting
                      </h3>
                      <p className="text-xs text-muted-foreground mb-4">Arrange category buttons for faster click rates.</p>
                      <div className="space-y-2 bg-muted/30 rounded-xl p-3 border">
                      {config.categoryOrder.map((cat: string, index: number) => (
                          <div key={cat} className="flex justify-between items-center p-2.5 bg-card border rounded-lg shadow-sm">
                            <div className="flex items-center gap-3">
                              <span className="h-5 w-5 bg-muted rounded flex items-center justify-center text-[10px] font-black text-muted-foreground">{index + 1}</span>
                              <span className="text-xs font-bold text-foreground">{cat}</span>
                            </div>
                            <div className="flex gap-1">
                              <button disabled={index === 0 || saving} onClick={() => handleReorderCategory(index, 'up')} className="p-1 hover:bg-muted border rounded disabled:opacity-30 text-xs font-black text-slate-600">▲</button>
                              <button disabled={index === config.categoryOrder.length - 1 || saving} onClick={() => handleReorderCategory(index, 'down')} className="p-1 hover:bg-muted border rounded disabled:opacity-30 text-xs font-black text-slate-600">▼</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'banners' && (
                  <motion.div key="banners" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div className="flex flex-wrap justify-between items-center gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-sm font-black uppercase">Mobile Banner Pool</h3>
                        <div className="flex bg-muted rounded-lg p-0.5 border text-[11px] font-bold">
                          {(['ALL', 'HERO', 'PROMO'] as const).map(f => (
                            <button
                              key={f}
                              onClick={() => setBannerFilter(f)}
                              className={cn(
                                "px-2.5 py-1 rounded-md transition-all",
                                bannerFilter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {f === 'ALL' ? 'All' : f === 'HERO' ? 'Hero Banners' : 'Promo Banners'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setBannerType(bannerFilter === 'PROMO' ? 'PROMO' : 'HERO');
                          setIsDrawerOpen(true);
                        }}
                        className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-[10px] font-black flex items-center gap-1 hover:bg-teal-700"
                      >
                        <Plus className="h-3.5 w-3.5" /> Create Banner
                      </button>
                    </div>
                    {loading ? (
                      <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-teal-600" /></div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {banners
                          .filter(banner => {
                            if (bannerFilter === 'HERO') return banner.bannerType !== 'PROMO';
                            if (bannerFilter === 'PROMO') return banner.bannerType === 'PROMO';
                            return true;
                          })
                          .map(banner => (
                          <div key={banner.id} className={cn("border rounded-xl overflow-hidden flex flex-col relative", !banner.isActive && "opacity-60 border-dashed")}>
                            <div className="h-28 relative bg-slate-100">
                              <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                              <div className="absolute top-2 left-2">
                                <span className={cn(
                                  "text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm text-white",
                                  banner.bannerType === 'PROMO' ? "bg-amber-600" : "bg-teal-700"
                                )}>
                                  {banner.bannerType === 'PROMO' ? 'Promo Banner' : 'Hero Banner'}
                                </span>
                              </div>
                              <div className="absolute top-2 right-2 flex gap-1">
                                <button onClick={() => handleToggleBanner(banner)} className="h-6 w-6 rounded bg-white/90 flex items-center justify-center text-slate-700 border border-slate-200 shadow">
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => handleDeleteBanner(banner.id)} className="h-6 w-6 rounded bg-rose-500 text-white flex items-center justify-center shadow">
                                  <Trash className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="p-3 bg-card border-t">
                              <h4 className="text-xs font-extrabold truncate">{banner.title}</h4>
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                                <LinkIcon className="h-3 w-3" />
                                <span>{banner.linkType}: {banner.linkValue || 'Root'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {banners.filter(banner => {
                          if (bannerFilter === 'HERO') return banner.bannerType !== 'PROMO';
                          if (bannerFilter === 'PROMO') return banner.bannerType === 'PROMO';
                          return true;
                        }).length === 0 && (
                          <div className="col-span-2 text-center py-10 text-muted-foreground text-xs">
                            {bannerFilter === 'PROMO' ? 'No promo banners yet. Click "+ Create Banner" to add one.' : 'No banners found for selected filter.'}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'toggles' && config && (
                  <motion.div key="toggles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <h3 className="text-sm font-black uppercase border-b pb-2">App Feature Toggles (A/B Deployments)</h3>
                    {[
                      { key: 'enableOnlineConsultations', label: 'Online Doctor Consultation', desc: 'Show video calling interface and slot selectors.' },
                      { key: 'enableAiSymptomsChat', label: 'MedSeva Symptoms Chatbot Bubble', desc: 'Inject floating Sparkles AI chat portal at bottom right.' },
                      { key: 'enableReportsWallet', label: 'Central Reports Locker Wallet', desc: 'Provides patient wallet key storage top nav button.' },
                      { key: 'enableUrgentCollection', label: 'Urgent Dispatch Premium Button', desc: 'Allows patient to pay premium ₹200 fee for instant phlebotomy dispatch.' },
                      { key: 'enableHomeCollection', label: 'Home Collection', desc: 'Enable phlebotomist home visit booking.' },
                      { key: 'enablePrescriptionUpload', label: 'Prescription Upload', desc: 'Allow patients to upload prescriptions.' },
                      { key: 'enableReferralProgram', label: 'Referral Program', desc: 'Enable patient referral rewards system.' },
                      { key: 'enableNotifications', label: 'Push Notifications', desc: 'Enable push notification delivery to patients.' },
                    ].map(flag => {
                      const isEnabled = config.featureFlags[flag.key as keyof typeof config.featureFlags];
                      return (
                        <div key={flag.key} className="flex items-center justify-between p-4 border rounded-xl">
                          <div>
                            <div className="text-xs font-black text-foreground">{flag.label}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{flag.desc}</div>
                          </div>
                          <button onClick={() => handleToggleFeature(flag.key as any, !isEnabled)} disabled={saving}>
                            {saving ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> :
                              isEnabled ? <ToggleRight className="h-8 w-8 text-teal-600" /> : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
                          </button>
                        </div>
                      );
                    })}
                  </motion.div>
                )}

                {activeTab === 'emergency' && (
                  <motion.div key="emergency" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex gap-3 text-rose-800 mb-4">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <div>
                        <div className="text-xs font-black">Emergency Broadcasting Protocol</div>
                        <div className="text-[10px] opacity-90 mt-0.5">Publishes a forced global marquee banner directly below the mobile app header bar.</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border p-3 bg-card rounded-lg">
                        <label className="text-xs font-bold">Broadcast Announcement Active</label>
                        <button onClick={() => setEmergActive(!emergActive)}>
                          {emergActive ? <ToggleRight className="h-8 w-8 text-rose-600" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                        </button>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold">Banner Title / Severity Flag</label>
                        <input type="text" className="w-full p-2 border rounded text-xs font-medium" value={emergTitle} onChange={e => setEmergTitle(e.target.value)} placeholder="e.g., WEATHER ALERT" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold">Dynamic Narrative Message</label>
                        <textarea className="w-full p-2 border rounded text-xs min-h-[80px]" value={emergMsg} onChange={e => setEmergMsg(e.target.value)} placeholder="Describe instructions..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold">Theme Severity Class</label>
                        <select className="w-full p-2 border rounded text-xs bg-card" value={emergType} onChange={e => setEmergType(e.target.value as any)}>
                          <option value="info">Info Blue</option>
                          <option value="warning">Warning Amber</option>
                          <option value="critical">Critical Rose</option>
                        </select>
                      </div>
                      <button
                        onClick={handleSaveEmergency}
                        disabled={saving || !emergTitle || !emergMsg}
                        className="w-full py-2.5 bg-[#006D6F] text-white text-xs font-black rounded-lg flex items-center justify-center gap-1 shadow hover:bg-[#004B4D] disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Deploy Broadcast Changes
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>

        <div className="xl:col-span-4 sticky top-6 bg-gradient-to-b from-slate-50 to-slate-100 border rounded-2xl p-2 flex flex-col items-center shadow-sm">
          <div className="text-center p-2 w-full border-b border-slate-200 bg-white rounded-t-xl">
            <div className="text-[10px] font-black tracking-wider uppercase text-slate-500 flex items-center justify-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Simulation Render
            </div>
          </div>
          <MobileAppSimulator />
          <div className="text-[9px] text-slate-400 italic p-2 text-center">
            Concepts automatically render to client app preview in real-time.
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-40 cursor-pointer" onClick={() => setIsDrawerOpen(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border z-50 shadow-2xl flex flex-col">
              <div className="p-6 border-b border-border bg-card flex justify-between items-center">
                <h2 className="text-lg font-bold flex items-center gap-2"><ImageIcon className="h-5 w-5 text-primary" /> Create Home Banner</h2>
                <button onClick={() => setIsDrawerOpen(false)} className="p-1.5 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleSaveBanner} className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">Banner Type *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBannerType('HERO')}
                      className={cn(
                        "py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center gap-0.5",
                        bannerType === 'HERO'
                          ? "bg-teal-50 border-teal-500 text-teal-800 shadow-sm"
                          : "border-input bg-card text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <span className="font-extrabold text-[12px]">Hero Banner</span>
                      <span className="text-[10px] font-normal opacity-80">(Top Carousel)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerType('PROMO')}
                      className={cn(
                        "py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center gap-0.5",
                        bannerType === 'PROMO'
                          ? "bg-amber-50 border-amber-500 text-amber-800 shadow-sm"
                          : "border-input bg-card text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <span className="font-extrabold text-[12px]">Promo Banner</span>
                      <span className="text-[10px] font-normal opacity-80">(Bottom Strip)</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold">Banner Label/Title *</label>
                  <input required type="text" placeholder={bannerType === 'PROMO' ? "e.g. Affordable Imaging Scans 20% OFF" : "e.g. Monsoon Health Checkup"} className="w-full p-2 border border-input text-sm rounded" value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold">Subtitle</label>
                  <input type="text" placeholder="Short description" className="w-full p-2 border border-input text-sm rounded" value={bannerSubtitle} onChange={e => setBannerSubtitle(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold">Banner Image *</label>
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                  {bannerImagePreview ? (
                    <div className="relative">
                      <img src={bannerImagePreview} alt="preview" className="w-full h-32 object-cover rounded-lg border" />
                      <button type="button" onClick={() => { setBannerImagePreview(''); setBannerImageFile(null); }} className="absolute top-1 right-1 bg-rose-500 text-white rounded p-0.5"><X className="h-3 w-3" /></button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-teal-400 transition-colors">
                      <Upload className="h-5 w-5" />
                      <span className="text-xs">Click to upload image</span>
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold">Target Navigation Map</label>
                  <select className="w-full p-2 border border-input text-sm rounded bg-card" value={bannerLinkType} onChange={e => setBannerLinkType(e.target.value as any)}>
                    <option value="Package">Diagnostic Package</option>
                    <option value="Test">Single Medical Test</option>
                    <option value="Category">Clinical Category</option>
                    <option value="External">External Hyperlink</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold">Navigation Key Value</label>
                  <input type="text" placeholder="e.g. pkg-2" className="w-full p-2 border border-input text-sm rounded" value={bannerLinkValue} onChange={e => setBannerLinkValue(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2 pt-6 border-t border-border mt-auto">
                  <button type="button" onClick={() => setIsDrawerOpen(false)} className="px-4 py-2 text-xs font-bold border border-border rounded">Cancel</button>
                  <button type="submit" disabled={saving || bannerUploading || !bannerTitle || !bannerImagePreview} className="px-6 py-2 text-xs bg-[#006D6F] text-white font-black flex items-center gap-1 rounded shadow disabled:opacity-50">
                    {(saving || bannerUploading) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Push Live
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};