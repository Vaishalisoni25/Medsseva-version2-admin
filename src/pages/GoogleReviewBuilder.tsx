import React, { useEffect, useState, useRef } from 'react';
import {
  Star, Copy, Check, ExternalLink, Share2, MessageSquare,
  QrCode, RefreshCw, Send, Sparkles, Building2, Globe,
  ShieldCheck, Printer, CheckCircle2, Heart, Award, ArrowUpRight,
  TrendingUp, Users, Smartphone, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { googleReviewService } from '../services/api';

interface GoogleReviewConfig {
  id: string;
  labPlaceName: string;
  placeId?: string | null;
  googleReviewUrl: string;
  customMessage: string;
  totalClicks: number;
  totalReviewsSent: number;
  isActive: boolean;
  updatedAt?: string;
}

export const GoogleReviewBuilderPage: React.FC = () => {
  const [config, setConfig] = useState<GoogleReviewConfig>({
    id: 'singleton',
    labPlaceName: 'MedsSeva Diagnostic Center & Pathology Laboratory',
    placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    googleReviewUrl: 'https://g.page/r/medsseva-pathology/review',
    customMessage: 'Dear Patient, thank you for choosing MedsSeva Diagnostics! Please take a moment to share your valuable rating & review with us on Google:',
    totalClicks: 124,
    totalReviewsSent: 48,
    isActive: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit Form Fields
  const [labPlaceName, setLabPlaceName] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Patient Quick Dispatcher
  const [patientName, setPatientName] = useState('');
  const [patientMobile, setPatientMobile] = useState('');

  // Copy states
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [copiedSms, setCopiedSms] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await googleReviewService.getConfig();
      if (res) {
        setConfig(res);
        setLabPlaceName(res.labPlaceName || '');
        setGoogleReviewUrl(res.googleReviewUrl || '');
        setPlaceId(res.placeId || '');
        setCustomMessage(res.customMessage || '');
        setIsActive(res.isActive !== undefined ? res.isActive : true);
      }
    } catch (err) {
      console.error('Failed to load review config:', err);
      toast.error('Failed to load Google Review settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleReviewUrl.trim()) {
      toast.error('Please provide a valid Google Review URL.');
      return;
    }

    setSaving(true);
    try {
      const updated = await googleReviewService.updateConfig({
        labPlaceName: labPlaceName.trim(),
        googleReviewUrl: googleReviewUrl.trim(),
        placeId: placeId.trim() || undefined,
        customMessage: customMessage.trim(),
        isActive,
      });

      if (updated?.config) {
        setConfig(updated.config);
      }
      toast.success('Google Review settings updated successfully');
    } catch (err: any) {
      console.error('Failed to update config:', err);
      toast.error(err?.response?.data?.error || 'Failed to update review settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (text: string, type: 'LINK' | 'TEMPLATE' | 'SMS') => {
    navigator.clipboard.writeText(text);
    if (type === 'LINK') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success('Review link copied to clipboard!');
    } else if (type === 'TEMPLATE') {
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2000);
      toast.success('WhatsApp review message copied!');
    } else {
      setCopiedSms(true);
      setTimeout(() => setCopiedSms(false), 2000);
      toast.success('SMS template copied!');
    }
  };

  const getPersonalizedMessage = (pName?: string) => {
    const greeting = pName?.trim() ? `Dear ${pName.trim()}, ` : 'Dear Patient, ';
    return `${greeting}thank you for choosing ${config.labPlaceName}! Please take a moment to rate our diagnostic lab service and share your feedback on Google: ${config.googleReviewUrl}`;
  };

  const handleOpenReviewPage = () => {
    googleReviewService.trackClick().catch(() => {});
    window.open(config.googleReviewUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendWhatsApp = (mobile?: string, pName?: string) => {
    googleReviewService.trackSent().catch(() => {});
    const msg = encodeURIComponent(getPersonalizedMessage(pName));
    const cleanMobile = mobile?.replace(/[^0-9]/g, '');
    const url = cleanMobile ? `https://wa.me/91${cleanMobile}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success('Opening WhatsApp review invite...');
  };

  const handlePrintStandee = () => {
    window.print();
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(config.googleReviewUrl)}&margin=10`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 p-8">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2 border border-amber-500/20">
        <Star className="w-8 h-8 fill-amber-400" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Google Review Builder</h1>
      <p className="text-muted-foreground text-center max-w-md text-sm sm:text-base leading-relaxed">
        This module is currently under development. The automated Google Review request system and direct WhatsApp integrations will be rolling out very soon!
      </p>
      <div className="px-5 py-2 mt-4 rounded-full bg-primary/10 text-primary text-sm font-bold border border-primary/20 flex items-center gap-2">
        <Sparkles className="w-4 h-4" /> Coming Soon
      </div>
    </div>
  );
};

export default GoogleReviewBuilderPage;
