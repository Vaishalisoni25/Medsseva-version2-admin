import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  Search,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Building2,
  Phone,
  Mail,
  Calendar,
  Wallet,
  ArrowUpDown,
  Download,
  ShieldAlert,
  XCircle,
  X,
  CreditCard,
  MapPin,
  FileCheck2,
  Percent,
  Check,
  UserCheck,
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Receipt,
  Layers,
  Sparkles,
  GraduationCap,
  FileText,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppSelector } from '../redux/hooks';
import { useBranchesQuery } from '@/hooks/useAdminQueries';
import { collectionPartnerService } from '../services/api';
import { cn } from '../utils/cn';

interface LabMapping {
  labId: string;
  labName: string;
  city: string;
  samples: number;
  totalTestValue: number;
  collectionCommission: number;
  walletCredited: number;
}

export interface PartnerDocumentItem {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  status: string;
}

interface CollectionPartner {
  id: string;
  userId: string;
  name: string;
  mobile: string;
  email: string;
  avatarUrl: string | null;
  registrationDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  isAvailable: boolean;
  partnerCode: string;
  labName: string;
  role: string;
  address: string | null;
  qualification?: string;
  experience?: string;
  serviceArea?: string;
  documents?: PartnerDocumentItem[];
  assignedLab: { id: string; name: string; city: string } | null;
  commissionRate: number;
  paymentCycle: string;
  totalSamplesCollected: number;
  totalTestValue: number;
  totalCommissionEarned: number;
  totalWalletCredits: number;
  walletBalance: number;
  labMappings?: LabMapping[];
  isEmployee?: boolean;
  phlebotomistType?: 'FREELANCER' | 'EMPLOYEE';
}

interface CollectionItem {
  id: string;
  bookingCode: string;
  collectionDate: string;
  sampleId: string;
  sampleType: string;
  sampleCondition: string;
  patient: {
    name: string;
    mobile: string;
    uhid: string | null;
    age: number | null;
    gender: string | null;
  };
  testName: string;
  testAmount: number;
  labPartnerName: string;
  labId: string | null;
  collectionStatus: string;
  collectionMode: string;
  commissionRate: number;
  commissionAmount: number;
  walletCreditAmount: number;
  isCreditedToWallet: boolean;
  walletCreditStatus: 'CREDITED' | 'PENDING';
  paidAt: string | null;
  walletTransactionRef: string;
  createdAt: string;
}

interface DailySummaryItem {
  date: string;
  partnerId: string;
  collectionPartner: string;
  partnerMobile: string;
  labId: string;
  labPartner: string;
  samples: number;
  testValue: number;
  commissionRate: number;
  commission: number;
  walletCredit: number;
  status: string;
}

interface LabWiseItem {
  partnerId: string;
  collectionPartner: string;
  partnerMobile: string;
  partnerEmail: string;
  labId: string;
  labPartner: string;
  labCode: string;
  city: string;
  numberOfSamples: number;
  totalTestValue: number;
  commissionRate: number;
  totalCommission: number;
  walletAmountCredited: number;
  lastDeliveredAt: string | null;
}

const STATUS_BADGES: Record<string, { bg: string; text: string; border: string; label: string; icon: any }> = {
  APPROVED: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/30', label: 'Approved', icon: CheckCircle2 },
  PENDING: { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-500/30', label: 'Pending Review', icon: Clock },
  SUSPENDED: { bg: 'bg-orange-500/10 dark:bg-orange-500/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-500/30', label: 'Suspended', icon: ShieldAlert },
  REJECTED: { bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-500/30', label: 'Rejected', icon: XCircle },
};

const COLLECTION_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  SAMPLE_COLLECTED: { bg: 'bg-blue-500/10 text-blue-700 dark:text-blue-400', text: 'text-blue-700 dark:text-blue-400', label: 'Sample Collected' },
  DELIVERING_TO_BRANCH: { bg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400', text: 'text-indigo-700 dark:text-indigo-400', label: 'In Transit to Lab' },
  DELIVERED_TO_LAB: { bg: 'bg-teal-500/10 text-teal-700 dark:text-teal-400', text: 'text-teal-700 dark:text-teal-400', label: 'Delivered to Lab' },
  PROCESSING: { bg: 'bg-purple-500/10 text-purple-700 dark:text-purple-400', text: 'text-purple-700 dark:text-purple-400', label: 'Processing' },
  REPORT_READY: { bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', text: 'text-emerald-700 dark:text-emerald-400', label: 'Report Ready' },
  COMPLETED: { bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', text: 'text-emerald-700 dark:text-emerald-400', label: 'Completed' },
  ACCEPTED: { bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400', text: 'text-amber-700 dark:text-amber-400', label: 'Partner Assigned' },
  ON_THE_WAY: { bg: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400', text: 'text-cyan-700 dark:text-cyan-400', label: 'On The Way' },
  REACHED_LOCATION: { bg: 'bg-sky-500/10 text-sky-700 dark:text-sky-400', text: 'text-sky-700 dark:text-sky-400', label: 'Reached Location' },
};

export const CollectionPartnersPage: React.FC = () => {
  const currentBranchId = useAppSelector(state => state.auth.currentBranchId);
  const currentUser = useAppSelector(state => state.auth.user);
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'SUPER_ADMIN' || (currentUser as any)?.isSuperAdmin;
  const userBranchId = (currentUser as any)?.branchId || (currentUser as any)?.adminUser?.branchId || (currentBranchId && currentBranchId !== 'all' ? currentBranchId : undefined);

  const { data: branchesData } = useBranchesQuery();

  // Tabs
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'LAB_MAPPING' | 'DAILY_SUMMARY' | 'LAB_WISE' | 'COMMISSION_WALLET'>('DIRECTORY');

  // Summary State
  const [summary, setSummary] = useState<{
    totalPartners: number;
    activePartners: number;
    samplesCollectedToday: number;
    totalTestValue: number;
    totalCommission: number;
    totalWalletCredits: number;
    branches: { id: string; name: string; city: string }[];
  } | null>(null);

  // Branches list merged from useBranchesQuery & summary.branches
  const branches = useMemo(() => {
    return (branchesData && branchesData.length > 0) ? branchesData : (summary?.branches || []);
  }, [branchesData, summary?.branches]);

  const accessibleBranches = useMemo(() => {
    if (!isSuperAdmin && userBranchId) {
      return branches.filter((b: any) => b.id === userBranchId);
    }
    return branches;
  }, [branches, isSuperAdmin, userBranchId]);

  const uniqueLocations = useMemo(() => {
    const locs: string[] = accessibleBranches
      .map((b: any) => b.city)
      .filter((c: any): c is string => Boolean(c && typeof c === 'string' && c.trim()));
    return Array.from(new Set(locs)).sort((a, b) => a.localeCompare(b));
  }, [accessibleBranches]);

  // Main Data States
  const [partners, setPartners] = useState<CollectionPartner[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummaryItem[]>([]);
  const [labWiseData, setLabWiseData] = useState<LabWiseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters State
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [selectedLab, setSelectedLab] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [phleboCategoryFilter, setPhleboCategoryFilter] = useState<'ALL' | 'FREELANCER' | 'IN_HOUSE'>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const locationFilteredBranches = useMemo(() => {
    if (locationFilter === 'ALL') return accessibleBranches;
    return accessibleBranches.filter((b: any) => (b.city || '').toLowerCase() === locationFilter.toLowerCase());
  }, [accessibleBranches, locationFilter]);

  useEffect(() => {
    if (!isSuperAdmin && userBranchId) {
      setSelectedLab(userBranchId);
      const myBranch = branches.find((b: any) => b.id === userBranchId);
      if (myBranch?.city) {
        setLocationFilter(myBranch.city);
      }
    }
  }, [isSuperAdmin, userBranchId, branches]);

  // Expandable row states for partner table
  const [expandedPartnerIds, setExpandedPartnerIds] = useState<Set<string>>(new Set());

  // Partner Detail Modal / Drawer State
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [partnerDetails, setPartnerDetails] = useState<{
    partner: CollectionPartner;
    collections: CollectionItem[];
    labWiseSummary: LabMapping[];
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailFilterStatus, setDetailFilterStatus] = useState('ALL');

  // Partner Config Edit Modal State
  const [configModalPartner, setConfigModalPartner] = useState<CollectionPartner | null>(null);
  const [editStatus, setEditStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'>('APPROVED');
  const [editCommissionRate, setEditCommissionRate] = useState<number>(30);
  const [editPaymentCycle, setEditPaymentCycle] = useState<string>('WEEKLY');
  const [editBranchId, setEditBranchId] = useState<string>('');
  const [editIsAvailable, setEditIsAvailable] = useState<boolean>(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Credit Commission Payout Modal State
  const [payoutItem, setPayoutItem] = useState<{
    bookingId: string;
    partnerId: string;
    partnerName: string;
    amount: number;
    patientName: string;
    testName: string;
  } | null>(null);
  const [payoutNotes, setPayoutNotes] = useState('');
  const [processingPayout, setProcessingPayout] = useState(false);

  // Toggle row expansion for lab mapping in main directory
  const togglePartnerExpand = (id: string) => {
    setExpandedPartnerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Fetch all datasets from backend
  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const effectiveBranchId = (!isSuperAdmin && userBranchId)
        ? userBranchId
        : (selectedLab !== 'ALL' ? selectedLab : undefined);

      const effectiveCity = (!isSuperAdmin && userBranchId)
        ? undefined
        : (effectiveBranchId ? undefined : (locationFilter !== 'ALL' ? locationFilter : undefined));

      const queryParams: any = {
        search: search || undefined,
        labId: effectiveBranchId,
        branchId: effectiveBranchId,
        city: effectiveCity,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        date: dateFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      const [summaryRes, partnersRes, dailyRes, labWiseRes] = await Promise.all([
        collectionPartnerService.getSummary({ branchId: effectiveBranchId, city: effectiveCity } as any),
        collectionPartnerService.getPartners(queryParams),
        collectionPartnerService.getDailySummary(queryParams),
        collectionPartnerService.getLabWise(queryParams),
      ]);

      setSummary(summaryRes);
      setPartners(partnersRes);
      setDailySummary(dailyRes);
      setLabWiseData(labWiseRes);
    } catch (err: any) {
      console.error('Failed to load collection partner data:', err);
      toast.error('Failed to load Collection Partner data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isSuperAdmin, userBranchId, search, locationFilter, selectedLab, selectedStatus, dateFilter, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch partner collection history details
  const fetchPartnerDetails = async (partnerId: string) => {
    setSelectedPartnerId(partnerId);
    setDetailsLoading(true);
    try {
      const res = await collectionPartnerService.getPartnerDetails(partnerId, {
        status: detailFilterStatus !== 'ALL' ? detailFilterStatus : undefined,
      });
      if (res) {
        const partnerObj = res.partner || res;
        const collectionsObj = res.collections || res.collectionsHistory || [];
        const labWise = res.labWiseSummary || [];
        setPartnerDetails({
          partner: {
            ...partnerObj,
            name: partnerObj.name || 'Collection Partner',
            totalTestValue: partnerObj.totalTestValue || 0,
            totalCommissionEarned: partnerObj.totalCommissionEarned || 0,
            totalWalletCredits: partnerObj.totalWalletCredits || 0,
            walletBalance: partnerObj.walletBalance || 0,
            commissionRate: partnerObj.commissionRate !== undefined ? partnerObj.commissionRate : 15,
          },
          collections: collectionsObj,
          labWiseSummary: labWise,
        });
      }
    } catch (err: any) {
      console.error('Failed to load partner details:', err);
      toast.error('Could not load collection history');
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPartnerId) {
      fetchPartnerDetails(selectedPartnerId);
    }
  }, [detailFilterStatus]);

  // Open config modal
  // Filter partners by category (Freelancers vs In-House)
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      const isFreelancer = p.phlebotomistType !== 'EMPLOYEE' && !p.isEmployee;
      if (phleboCategoryFilter === 'FREELANCER' && !isFreelancer) return false;
      if (phleboCategoryFilter === 'IN_HOUSE' && isFreelancer) return false;
      return true;
    });
  }, [partners, phleboCategoryFilter]);

  const openConfigModal = (p: CollectionPartner) => {
    setConfigModalPartner(p);
    setEditStatus(p.status);
    setEditCommissionRate(p.commissionRate);
    setEditPaymentCycle(p.paymentCycle || 'WEEKLY');
    setEditBranchId(p.assignedLab?.id || '');
    setEditIsAvailable(p.isAvailable);
  };

  // Quick Approve for pending phlebotomist
  const handleQuickApprove = async (partnerId: string, partnerName: string) => {
    try {
      await collectionPartnerService.updatePartnerStatus(partnerId, {
        approvalStatus: 'APPROVED',
      });
      toast.success(`Phlebotomist ${partnerName} approved successfully!`);
      fetchData(true);
    } catch (err: any) {
      console.error('Failed to approve phlebotomist:', err);
      toast.error('Failed to approve phlebotomist');
    }
  };

  const handleQuickReject = async (partnerId: string, partnerName: string) => {
    if (!confirm(`Are you sure you want to reject phlebotomist application for ${partnerName}?`)) return;
    try {
      await collectionPartnerService.updatePartnerStatus(partnerId, {
        approvalStatus: 'REJECTED',
      });
      toast.success(`Phlebotomist ${partnerName} application rejected`);
      fetchData(true);
    } catch (err: any) {
      console.error('Failed to reject phlebotomist:', err);
      toast.error('Failed to reject phlebotomist');
    }
  };

  const handleQuickSuspend = async (partnerId: string, partnerName: string) => {
    if (!confirm(`Are you sure you want to suspend phlebotomist ${partnerName}?`)) return;
    try {
      await collectionPartnerService.updatePartnerStatus(partnerId, {
        approvalStatus: 'SUSPENDED',
      });
      toast.success(`Phlebotomist ${partnerName} suspended.`);
      fetchData(true);
    } catch (err: any) {
      console.error('Failed to suspend phlebotomist:', err);
      toast.error('Failed to suspend phlebotomist');
    }
  };

  // Save Partner Config
  const handleSaveConfig = async () => {
    if (!configModalPartner) return;
    setSavingConfig(true);
    try {
      await collectionPartnerService.updatePartnerStatus(configModalPartner.id, {
        approvalStatus: editStatus,
        commissionRate: editCommissionRate,
        paymentCycle: editPaymentCycle,
        branchId: editBranchId || null,
        isAvailable: editIsAvailable,
      });
      toast.success('Phlebotomist settings & commission updated successfully');
      setConfigModalPartner(null);
      fetchData(true);
      if (selectedPartnerId === configModalPartner.id) {
        fetchPartnerDetails(configModalPartner.id);
      }
    } catch (err: any) {
      console.error('Failed to update partner config:', err);
      toast.error('Failed to update partner configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  // Handle Commission Payout / Wallet Credit
  const handleConfirmPayout = async () => {
    if (!payoutItem) return;
    setProcessingPayout(true);
    try {
      await collectionPartnerService.creditCommissionPayout({
        bookingId: payoutItem.bookingId,
        partnerId: payoutItem.partnerId,
        status: 'PAID',
        notes: payoutNotes || `Credited to Collection Partner wallet on ${new Date().toLocaleDateString()}`,
      });
      toast.success('Commission successfully credited to partner wallet');
      setPayoutItem(null);
      setPayoutNotes('');
      fetchData(true);
      if (selectedPartnerId) {
        fetchPartnerDetails(selectedPartnerId);
      }
    } catch (err: any) {
      console.error('Failed to credit commission:', err);
      toast.error('Failed to process wallet credit');
    } finally {
      setProcessingPayout(false);
    }
  };

  // Export Table to CSV
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = 'collection_partners_export.csv';

    if (activeTab === 'DIRECTORY' || activeTab === 'LAB_MAPPING') {
      filename = 'collection_partners_list.csv';
      headers = ['Name', 'Mobile', 'Email', 'Registration Date', 'Status', 'Samples Collected', 'Total Test Value', 'Commission Earned', 'Wallet Balance'];
      rows = partners.map((p) => [
        `"${p.name}"`,
        `"${p.mobile}"`,
        `"${p.email}"`,
        `"${new Date(p.registrationDate).toLocaleDateString()}"`,
        `"${p.status}"`,
        `${p.totalSamplesCollected}`,
        `"${p.totalTestValue}"`,
        `"${p.totalCommissionEarned}"`,
        `"${p.walletBalance}"`,
      ]);
    } else if (activeTab === 'DAILY_SUMMARY') {
      filename = 'daily_collection_summary.csv';
      headers = ['Date', 'Collection Partner', 'Lab Partner', 'Samples', 'Test Value', 'Commission', 'Wallet Credit'];
      rows = dailySummary.map((d) => [
        `"${d.date}"`,
        `"${d.collectionPartner}"`,
        `"${d.labPartner}"`,
        `${d.samples}`,
        `${d.testValue}`,
        `${d.commission}`,
        `${d.walletCredit}`,
      ]);
    } else if (activeTab === 'LAB_WISE') {
      filename = 'lab_wise_collection_summary.csv';
      headers = ['Collection Partner', 'Lab Partner', 'Number of Samples', 'Total Test Value', 'Total Commission', 'Wallet Amount Credited'];
      rows = labWiseData.map((l) => [
        `"${l.collectionPartner}"`,
        `"${l.labPartner}"`,
        `${l.numberOfSamples}`,
        `${l.totalTestValue}`,
        `${l.totalCommission}`,
        `${l.walletAmountCredited}`,
      ]);
    } else {
      filename = 'commission_and_wallet_ledger.csv';
      headers = ['Collection Partner', 'Mobile', 'Total Test Value', 'Commission %', 'Total Commission Earned', 'Total Amount Credited to Wallet', 'Current Wallet Balance'];
      rows = partners.map((p) => [
        `"${p.name}"`,
        `"${p.mobile}"`,
        `${p.totalTestValue}`,
        `${p.commissionRate}%`,
        `${p.totalCommissionEarned}`,
        `${p.totalWalletCredits}`,
        `${p.walletBalance}`,
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filename}`);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedLab('ALL');
    setSelectedStatus('ALL');
    setDateFilter('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-2 sm:px-4 md:px-0">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-[#0a7c7c]/15 via-teal-500/10 to-transparent p-5 sm:p-6 rounded-2xl border border-[#0a7c7c]/20 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#0a7c7c] text-white rounded-xl shadow-md shadow-[#0a7c7c]/25">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Collection Partner Management
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#0a7c7c]/10 text-[#0a7c7c] border border-[#0a7c7c]/20">
                  Doorstep Phlebotomy & Mapping
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Manage mobile-registered Collection Partners, track their handovers to Lab Partners, sample details, and wallet commissions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end lg:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-card border border-border text-foreground hover:bg-muted/80 transition-all shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4 text-muted-foreground" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-[#0a7c7c] text-white hover:bg-[#086363] transition-all shadow-sm shadow-[#0a7c7c]/20 active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* DASHBOARD SUMMARY CARDS (6 TOTAL) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Collection Partners */}
        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-[#0a7c7c]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Collection Partners</span>
            <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold mt-2 text-foreground">
            {summary?.totalPartners ?? 0}
          </p>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
            Registered mobile users
          </span>
        </div>

        {/* Active Partners */}
        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Partners</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold mt-2 text-foreground">
            {summary?.activePartners ?? 0}
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-1">
            Ready for collection
          </span>
        </div>

        {/* Samples Collected Today */}
        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-teal-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Samples Today</span>
            <div className="p-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold mt-2 text-foreground">
            {summary?.samplesCollectedToday ?? 0}
          </p>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
            Doorstep collections
          </span>
        </div>

        {/* Total Test Value */}
        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Test Value</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold mt-2 text-foreground">
            ₹{(summary?.totalTestValue ?? 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
            Handed to Lab Partners
          </span>
        </div>

        {/* Total Commission */}
        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-[#0a7c7c]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Commission</span>
            <div className="p-2 bg-[#0a7c7c]/10 text-[#0a7c7c] rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold mt-2 text-foreground">
            ₹{(summary?.totalCommission ?? 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
            Earned by phlebotomists
          </span>
        </div>

        {/* Total Wallet Credits */}
        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Wallet Credits</span>
            <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold mt-2 text-foreground">
            ₹{(summary?.totalWalletCredits ?? 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1 mt-1">
            Added to partner wallets
          </span>
        </div>
      </div>

      {/* Tabs & Search Filter Navigation Bar */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
          <button
            onClick={() => setActiveTab('DIRECTORY')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2',
              activeTab === 'DIRECTORY'
                ? 'bg-[#0a7c7c] text-white shadow-sm shadow-[#0a7c7c]/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
            )}
          >
            <Users className="w-4 h-4" />
            <span>Collection Partner List</span>
            <span className="text-xs px-1.5 py-0.2 rounded-full bg-white/20 text-white font-semibold">
              {partners.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('LAB_MAPPING')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2',
              activeTab === 'LAB_MAPPING'
                ? 'bg-[#0a7c7c] text-white shadow-sm shadow-[#0a7c7c]/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
            )}
          >
            <FlaskConical className="w-4 h-4" />
            <span>Partner → Lab Mapping</span>
          </button>

          <button
            onClick={() => setActiveTab('DAILY_SUMMARY')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2',
              activeTab === 'DAILY_SUMMARY'
                ? 'bg-[#0a7c7c] text-white shadow-sm shadow-[#0a7c7c]/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
            )}
          >
            <Calendar className="w-4 h-4" />
            <span>Daily Collection</span>
          </button>

          <button
            onClick={() => setActiveTab('LAB_WISE')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2',
              activeTab === 'LAB_WISE'
                ? 'bg-[#0a7c7c] text-white shadow-sm shadow-[#0a7c7c]/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
            )}
          >
            <Building2 className="w-4 h-4" />
            <span>Lab-Wise Summary</span>
          </button>

          <button
            onClick={() => setActiveTab('COMMISSION_WALLET')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2',
              activeTab === 'COMMISSION_WALLET'
                ? 'bg-[#0a7c7c] text-white shadow-sm shadow-[#0a7c7c]/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
            )}
          >
            <Wallet className="w-4 h-4" />
            <span>Commission & Wallet</span>
          </button>
        </div>

        {/* Global Search and Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-3 items-center">
          {/* Search Box: Name, Mobile, Email */}
          <div className="relative lg:col-span-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by Partner name, mobile number, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0a7c7c]/30 focus:border-[#0a7c7c] text-foreground transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Location / City Filter */}
          <div className="lg:col-span-2">
            <select
              value={locationFilter}
              onChange={(e) => {
                const newLoc = e.target.value;
                setLocationFilter(newLoc);
                if (newLoc !== 'ALL') {
                  const isStillValid = locationFilteredBranches.some((b: any) => b.id === selectedLab && (b.city || '').toLowerCase() === newLoc.toLowerCase());
                  if (!isStillValid) setSelectedLab('ALL');
                }
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0a7c7c]/30 focus:border-[#0a7c7c] text-foreground transition-all font-medium"
            >
              {isSuperAdmin && <option value="ALL">All Locations / Cities</option>}
              {uniqueLocations.map((loc: string) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Branch / Destination Lab Filter */}
          <div className="lg:col-span-3">
            <select
              value={selectedLab}
              onChange={(e) => setSelectedLab(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0a7c7c]/30 focus:border-[#0a7c7c] text-foreground transition-all font-medium"
            >
              {isSuperAdmin && (
                <option value="ALL">
                  {locationFilter === 'ALL' ? 'All Branches / Partners' : `All ${locationFilter} Branches`}
                </option>
              )}
              {locationFilteredBranches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.city})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0a7c7c]/30 focus:border-[#0a7c7c] text-foreground transition-all"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active & Available</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending Approval</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="lg:col-span-2">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setStartDate('');
                setEndDate('');
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0a7c7c]/30 focus:border-[#0a7c7c] text-foreground transition-all"
            />
          </div>

          {/* Clear Filters Button */}
          <div className="lg:col-span-1 flex justify-end">
            {(search || selectedLab !== 'ALL' || selectedStatus !== 'ALL' || dateFilter || startDate || endDate) && (
              <button
                onClick={clearFilters}
                className="p-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-500/10 transition-colors w-full flex items-center justify-center gap-1"
                title="Clear Filters"
              >
                <X className="w-4 h-4" />
                <span className="lg:hidden">Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TAB CONTENT AREAS */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border/80 rounded-2xl">
          <div className="w-10 h-10 border-4 border-[#0a7c7c]/30 border-t-[#0a7c7c] rounded-full animate-spin mb-3" />
          <p className="text-sm text-muted-foreground font-medium">Loading Collection Partners from database...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: COLLECTION PARTNER LIST */}
          {activeTab === 'DIRECTORY' && (
            <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-foreground">
                    1. Registered Collection Partners
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Showing {filteredPartners.length} phlebotomists & collection executives
                  </p>
                </div>

                {/* Phlebotomist Category Tabs */}
                <div className="flex items-center gap-1 bg-muted/80 p-1 rounded-xl border border-border">
                  {[
                    { id: 'ALL', label: `All Phlebotomists (${partners.length})` },
                    { id: 'FREELANCER', label: `App Freelancers (${partners.filter(p => p.phlebotomistType !== 'EMPLOYEE' && !p.isEmployee).length})` },
                    { id: 'IN_HOUSE', label: `In-House Staff (${partners.filter(p => p.phlebotomistType === 'EMPLOYEE' || p.isEmployee).length})` },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setPhleboCategoryFilter(tab.id as any)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        phleboCategoryFilter === tab.id
                          ? "bg-[#0a7c7c] text-white shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredPartners.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <h4 className="text-base font-semibold text-foreground">No Collection Partners Found</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    No partners matching the selected category or filters.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-medium">
                        <th className="py-3 px-4">Name & Code</th>
                        <th className="py-3 px-4">Mobile Number</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Registration Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-center">Total Samples</th>
                        <th className="py-3 px-4 text-right">Total Test Value</th>
                        <th className="py-3 px-4 text-right">Commission Earned</th>
                        <th className="py-3 px-4 text-right">Wallet Balance</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredPartners.map((p) => {
                        const statusBadge = STATUS_BADGES[p.status] || STATUS_BADGES.PENDING;
                        const StatusIcon = statusBadge.icon;
                        return (
                          <tr key={p.id} className="hover:bg-muted/40 transition-colors group">
                            {/* Name & Code */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0a7c7c] to-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                                  {p.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-foreground truncate">{p.name}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <p className="text-[11px] text-muted-foreground font-mono">{p.partnerCode}</p>
                                    {p.qualification && p.qualification !== 'Not Specified' && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-400">
                                        {p.qualification}
                                      </span>
                                    )}
                                    {p.phlebotomistType !== 'EMPLOYEE' && !p.isEmployee ? (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                        App Freelancer
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20">
                                        In-House Staff
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Mobile Number */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-foreground font-medium">
                                <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                <span>{p.mobile}</span>
                              </div>
                            </td>

                            {/* Email */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1 text-muted-foreground text-xs truncate max-w-[160px]" title={p.email}>
                                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">{p.email || 'N/A'}</span>
                              </div>
                            </td>

                            {/* Registration Date */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground">
                              {new Date(p.registrationDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col gap-1 items-start">
                                <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border', statusBadge.bg, statusBadge.text, statusBadge.border)}>
                                  <StatusIcon className="w-3 h-3" />
                                  {statusBadge.label}
                                </span>
                                {p.status === 'PENDING' ? (
                                  <button
                                    onClick={() => handleQuickApprove(p.id, p.name)}
                                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 mt-0.5 cursor-pointer"
                                    title="Approve Phlebotomist"
                                  >
                                    <CheckCircle2 className="w-2.5 h-2.5" /> Approve Now
                                  </button>
                                ) : p.status === 'SUSPENDED' ? (
                                  <button
                                    onClick={() => handleQuickApprove(p.id, p.name)}
                                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 mt-0.5 cursor-pointer"
                                    title="Reactivate Phlebotomist"
                                  >
                                    <CheckCircle2 className="w-2.5 h-2.5" /> Reactivate
                                  </button>
                                ) : (
                                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-md', p.isAvailable ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground')}>
                                    {p.isAvailable ? '● Available' : '○ Offline'}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Total Samples Collected */}
                            <td className="py-3.5 px-4 text-center font-bold text-foreground">
                              <span className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300">
                                {p.totalSamplesCollected}
                              </span>
                            </td>

                            {/* Total Test Value */}
                            <td className="py-3.5 px-4 text-right font-medium text-foreground">
                              ₹{p.totalTestValue.toLocaleString('en-IN')}
                            </td>

                            {/* Total Commission Earned */}
                            <td className="py-3.5 px-4 text-right font-semibold text-[#0a7c7c]">
                              {p.phlebotomistType !== 'EMPLOYEE' && !p.isEmployee ? (
                                <>
                                  <div>₹{p.totalCommissionEarned.toLocaleString('en-IN')}</div>
                                  <div className="text-[10px] text-muted-foreground">@{p.commissionRate}% comm.</div>
                                </>
                              ) : (
                                <>
                                  <div className="text-muted-foreground font-normal">₹0</div>
                                  <div className="text-[10px] text-slate-500 font-normal">Salaried Staff</div>
                                </>
                              )}
                            </td>

                            {/* Current Wallet Balance */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                ₹{p.walletBalance.toLocaleString('en-IN')}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                Credited: ₹{p.totalWalletCredits.toLocaleString('en-IN')}
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                {p.status === 'PENDING' && (
                                  <button
                                    onClick={() => handleQuickApprove(p.id, p.name)}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                                    title="Approve Phlebotomist"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Approve</span>
                                  </button>
                                )}
                                {p.status === 'APPROVED' && (
                                  <button
                                    onClick={() => handleQuickSuspend(p.id, p.name)}
                                    className="px-2.5 py-1.5 rounded-lg bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500 hover:text-white transition-all text-xs font-semibold flex items-center gap-1 shadow-sm active:scale-95 border border-orange-500/30 cursor-pointer"
                                    title="Suspend Phlebotomist"
                                  >
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    <span>Suspend</span>
                                  </button>
                                )}
                                {p.status === 'SUSPENDED' && (
                                  <button
                                    onClick={() => handleQuickApprove(p.id, p.name)}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                                    title="Reactivate / Approve Phlebotomist"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Reactivate</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => fetchPartnerDetails(p.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#0a7c7c]/10 text-[#0a7c7c] hover:bg-[#0a7c7c] hover:text-white transition-all text-xs font-medium flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                                  title="View Sample Collection Details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Details</span>
                                </button>
                                {p.phlebotomistType !== 'EMPLOYEE' && !p.isEmployee && (
                                  <button
                                    onClick={() => openConfigModal(p)}
                                    className="px-2.5 py-1.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 hover:bg-[#0a7c7c] hover:text-white transition-all text-xs font-semibold flex items-center gap-1 shadow-sm active:scale-95 border border-teal-500/20 cursor-pointer"
                                    title="Edit Commission Rate & Settings"
                                  >
                                    <Percent className="w-3 h-3" />
                                    <span>Edit Commission</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COLLECTION PARTNER → LAB MAPPING */}
          {activeTab === 'LAB_MAPPING' && (
            <div className="space-y-4">
              <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm">
                <div className="border-b border-border/60 pb-3 mb-4">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground">
                    2. Collection Partner → Lab Partner Mapping
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Shows which Lab Partners each Collection Partner is submitting/handing over collected samples to, along with sample volumes, test values, and credited wallet commissions.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {partners.map((p) => (
                    <div
                      key={p.id}
                      className="border border-border/80 bg-muted/10 rounded-xl p-4 space-y-3 hover:border-[#0a7c7c]/40 transition-all"
                    >
                      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#0a7c7c] text-white flex items-center justify-center font-bold text-xs">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-foreground">{p.name}</h4>
                            <p className="text-[11px] text-muted-foreground">{p.mobile} • {p.partnerCode}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => fetchPartnerDetails(p.id)}
                          className="px-2 py-1 rounded-md text-xs font-medium text-[#0a7c7c] bg-[#0a7c7c]/10 hover:bg-[#0a7c7c] hover:text-white transition-colors"
                        >
                          Full History →
                        </button>
                      </div>

                      {/* Lab Handovers List for this partner */}
                      {p.labMappings && p.labMappings.length > 0 ? (
                        <div className="space-y-2">
                          {p.labMappings.map((lm, idx) => (
                            <div
                              key={idx}
                              className="bg-card border border-border/70 rounded-lg p-3 text-xs space-y-1.5 shadow-sm"
                            >
                              <div className="flex items-center justify-between font-semibold text-foreground">
                                <div className="flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-[#0a7c7c]" />
                                  <span>{lm.labName}</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 font-bold">
                                  {lm.samples} samples
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/40 text-[11px]">
                                <div>
                                  <span className="text-muted-foreground block">Test Value</span>
                                  <span className="font-medium text-foreground">₹{lm.totalTestValue.toLocaleString('en-IN')}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">Commission</span>
                                  <span className="font-semibold text-[#0a7c7c]">₹{lm.collectionCommission.toLocaleString('en-IN')}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">Wallet Credited</span>
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{lm.walletCredited.toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 bg-card rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                          {p.assignedLab ? (
                            <span>Default Assigned Lab: {p.assignedLab.name} (0 delivered samples yet)</span>
                          ) : (
                            <span>No samples handed over to Lab Partners yet</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DAILY COLLECTION */}
          {activeTab === 'DAILY_SUMMARY' && (
            <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border/60 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-foreground">
                    6. Daily Collection Summary
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Daily summary showing: Date | Collection Partner | Lab Partner | Samples | Test Value | Commission | Wallet Credit
                  </p>
                </div>
              </div>

              {dailySummary.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <h4 className="text-base font-semibold text-foreground">No Daily Collection Records</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    No samples matching the filters for the selected dates.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-medium">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Collection Partner</th>
                        <th className="py-3 px-4">Lab Partner</th>
                        <th className="py-3 px-4 text-center">Samples</th>
                        <th className="py-3 px-4 text-right">Test Value</th>
                        <th className="py-3 px-4 text-right">Commission</th>
                        <th className="py-3 px-4 text-right">Wallet Credit</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {dailySummary.map((item, idx) => (
                        <tr key={`${item.date}_${item.partnerId}_${idx}`} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-[#0a7c7c]" />
                              <span>{new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-foreground">{item.collectionPartner}</div>
                            <div className="text-[11px] text-muted-foreground">{item.partnerMobile}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                              <Building2 className="w-3.5 h-3.5 text-[#0a7c7c] flex-shrink-0" />
                              <span>{item.labPartner}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold">
                            <span className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300">
                              {item.samples}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right font-medium text-foreground">
                            ₹{item.testValue.toLocaleString('en-IN')}
                          </td>

                          <td className="py-3.5 px-4 text-right font-semibold text-[#0a7c7c]">
                            ₹{item.commission.toLocaleString('en-IN')}
                            <div className="text-[10px] text-muted-foreground">@{item.commissionRate}%</div>
                          </td>

                          <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{item.walletCredit.toLocaleString('en-IN')}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => fetchPartnerDetails(item.partnerId)}
                              className="px-2.5 py-1 text-xs font-medium text-[#0a7c7c] hover:underline"
                            >
                              View History
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LAB-WISE SUMMARY */}
          {activeTab === 'LAB_WISE' && (
            <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border/60 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-foreground">
                    5. Lab-Wise Summary
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Collection Partner → Lab Partner → Number of Samples → Total Test Value → Total Commission → Wallet Amount Credited
                  </p>
                </div>
              </div>

              {labWiseData.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <Building2 className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <h4 className="text-base font-semibold text-foreground">No Lab Submissions Found</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    No samples handed over for the selected filter parameters.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-medium">
                        <th className="py-3 px-4">Collection Partner</th>
                        <th className="py-3 px-4 text-center"><ArrowRight className="w-4 h-4 mx-auto text-muted-foreground" /></th>
                        <th className="py-3 px-4">Lab Partner</th>
                        <th className="py-3 px-4 text-center">Number of Samples</th>
                        <th className="py-3 px-4 text-right">Total Test Value</th>
                        <th className="py-3 px-4 text-right">Total Commission</th>
                        <th className="py-3 px-4 text-right">Wallet Credited</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {labWiseData.map((item, idx) => (
                        <tr key={`${item.partnerId}_${item.labId}_${idx}`} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-foreground">{item.collectionPartner}</div>
                            <div className="text-[11px] text-muted-foreground">{item.partnerMobile}</div>
                          </td>

                          <td className="py-3.5 px-4 text-center text-[#0a7c7c]">
                            <ArrowRight className="w-4 h-4 mx-auto" />
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-[#0a7c7c]" />
                              <span>{item.labPartner}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">City: {item.city}</div>
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold">
                            <span className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300">
                              {item.numberOfSamples}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right font-medium text-foreground">
                            ₹{item.totalTestValue.toLocaleString('en-IN')}
                          </td>

                          <td className="py-3.5 px-4 text-right font-semibold text-[#0a7c7c]">
                            ₹{item.totalCommission.toLocaleString('en-IN')}
                            <div className="text-[10px] text-muted-foreground">@{item.commissionRate}%</div>
                          </td>

                          <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{item.walletAmountCredited.toLocaleString('en-IN')}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => fetchPartnerDetails(item.partnerId)}
                              className="px-2.5 py-1 text-xs font-medium text-[#0a7c7c] hover:underline"
                            >
                              Partner Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: COMMISSION & WALLET */}
          {activeTab === 'COMMISSION_WALLET' && (
            <div className="space-y-6">
              <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                  <div>
                    <h3 className="font-semibold text-base text-foreground">
                      4. Commission & Partner Wallet Ledger
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Overview of collected sample values, commission %, total amounts credited to wallets, and current outstanding balances.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                      Total Outstanding Balance: ₹
                      {partners.reduce((sum, p) => sum + p.walletBalance, 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar mt-4">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-medium">
                        <th className="py-3 px-4">Collection Partner</th>
                        <th className="py-3 px-4">Mobile & Code</th>
                        <th className="py-3 px-4 text-right">Total Test Value</th>
                        <th className="py-3 px-4 text-center">Commission %</th>
                        <th className="py-3 px-4 text-right">Total Commission</th>
                        <th className="py-3 px-4 text-right">Credited to Wallet</th>
                        <th className="py-3 px-4 text-right">Current Wallet Balance</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {partners.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-foreground">
                            {p.name}
                          </td>

                          <td className="py-3.5 px-4 text-muted-foreground">
                            <div>{p.mobile}</div>
                            <div className="text-[11px] font-mono">{p.partnerCode}</div>
                          </td>

                          <td className="py-3.5 px-4 text-right font-medium text-foreground">
                            ₹{p.totalTestValue.toLocaleString('en-IN')}
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-[#0a7c7c]">
                            {p.commissionRate}%
                          </td>

                          <td className="py-3.5 px-4 text-right font-semibold text-foreground">
                            ₹{p.totalCommissionEarned.toLocaleString('en-IN')}
                          </td>

                          <td className="py-3.5 px-4 text-right font-semibold text-purple-600 dark:text-purple-400">
                            ₹{p.totalWalletCredits.toLocaleString('en-IN')}
                          </td>

                          <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{p.walletBalance.toLocaleString('en-IN')}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => fetchPartnerDetails(p.id)}
                              className="px-3 py-1.5 rounded-lg bg-[#0a7c7c] text-white hover:bg-[#086363] text-xs font-medium transition-all shadow-sm active:scale-95"
                            >
                              View Samples
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* SAMPLE COLLECTION DETAILS DRAWER / MODAL */}
      <AnimatePresence>
        {selectedPartnerId && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedPartnerId(null);
                setPartnerDetails(null);
              }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-4xl bg-card border-l border-border h-full shadow-2xl flex flex-col z-10 overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0a7c7c] text-white flex items-center justify-center font-bold text-base shadow-sm">
                    {partnerDetails?.partner?.name?.charAt(0).toUpperCase() || 'C'}
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-foreground">
                      {partnerDetails?.partner?.name || 'Collection Partner'}
                    </h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>Code: {partnerDetails?.partner?.partnerCode || 'N/A'}</span>
                      <span>•</span>
                      <span>Mobile: {partnerDetails?.partner?.mobile || 'N/A'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {partnerDetails?.partner && (
                    <button
                      onClick={() => openConfigModal(partnerDetails.partner)}
                      className="px-3 py-1.5 rounded-lg bg-muted text-foreground hover:bg-muted/80 text-xs font-medium border border-border flex items-center gap-1 transition-all"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Edit Settings</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedPartnerId(null);
                      setPartnerDetails(null);
                    }}
                    className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
                {detailsLoading || !partnerDetails ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-[#0a7c7c]/30 border-t-[#0a7c7c] rounded-full animate-spin mb-3" />
                    <p className="text-sm text-muted-foreground">Loading collection history...</p>
                  </div>
                ) : (
                  <>
                    {/* Phlebotomist Profile & Verification Details Card */}
                    <div className="bg-card p-4 rounded-xl border border-border/80 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                        <span className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4 text-[#0a7c7c]" />
                          Phlebotomist Profile & Verification Details
                        </span>
                        {partnerDetails.partner.qualification && partnerDetails.partner.qualification !== 'Not Specified' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
                            {partnerDetails.partner.qualification}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-2.5 bg-muted/30 border border-border/60 rounded-lg">
                          <span className="text-[11px] text-muted-foreground block font-medium">Qualification / Certification</span>
                          <span className="font-bold text-foreground text-sm mt-0.5 block">
                            {partnerDetails.partner.qualification || 'Not Specified'}
                          </span>
                        </div>
                        <div className="p-2.5 bg-muted/30 border border-border/60 rounded-lg">
                          <span className="text-[11px] text-muted-foreground block font-medium">Experience / Designation</span>
                          <span className="font-medium text-foreground mt-0.5 block truncate" title={partnerDetails.partner.experience || 'N/A'}>
                            {partnerDetails.partner.experience || 'Standard Experience'}
                          </span>
                        </div>
                        <div className="p-2.5 bg-muted/30 border border-border/60 rounded-lg">
                          <span className="text-[11px] text-muted-foreground block font-medium">Preferred Service Area</span>
                          <span className="font-medium text-foreground mt-0.5 block truncate" title={partnerDetails.partner.serviceArea || partnerDetails.partner.address || 'Independent'}>
                            {partnerDetails.partner.serviceArea || partnerDetails.partner.address || 'Independent'}
                          </span>
                        </div>
                      </div>

                      {/* Government ID Documents (Aadhaar / PAN Card) */}
                      <div className="pt-2 border-t border-border/40">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                          Attached Government ID Proof (Aadhaar / PAN Card)
                        </span>
                        {partnerDetails.partner.documents && partnerDetails.partner.documents.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {partnerDetails.partner.documents.map((doc, idx) => (
                              <div key={idx} className="p-3 bg-muted/30 border border-border rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-[#0a7c7c] flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-xs text-foreground truncate">
                                      {doc.documentType === 'PAN_CARD' ? 'PAN Card' : 'Aadhaar Card'}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground truncate">{doc.fileName}</p>
                                  </div>
                                </div>
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-lg bg-[#0a7c7c] text-white hover:bg-[#086363] text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all flex-shrink-0"
                                >
                                  <span>View Document</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                            <Clock className="w-4 h-4 flex-shrink-0" />
                            <span>No government ID document uploaded yet.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Partner Totals Card (Requirement 4) */}
                    <div className="bg-muted/20 p-4 rounded-xl border border-border/60 space-y-3">
                      <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <span className="font-semibold text-xs text-foreground uppercase tracking-wider">
                          Commission & Wallet Totals
                        </span>
                        <span className="text-xs text-[#0a7c7c] font-medium">
                          Commission Rate: {partnerDetails?.partner?.commissionRate ?? 15}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <span className="text-[11px] text-muted-foreground font-medium">Total Test Value</span>
                          <p className="text-lg font-bold text-foreground mt-0.5">
                            ₹{(partnerDetails?.partner?.totalTestValue ?? 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <span className="text-[11px] text-muted-foreground font-medium">Total Commission</span>
                          <p className="text-lg font-bold text-[#0a7c7c] mt-0.5">
                            ₹{(partnerDetails?.partner?.totalCommissionEarned ?? 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <span className="text-[11px] text-muted-foreground font-medium">Total Wallet Credits</span>
                          <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                            ₹{(partnerDetails?.partner?.totalWalletCredits ?? 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <span className="text-[11px] text-muted-foreground font-medium">Current Wallet Balance</span>
                          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            ₹{(partnerDetails?.partner?.walletBalance ?? 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Lab Partner Submissions for this partner (Requirement 5) */}
                    {partnerDetails.labWiseSummary && partnerDetails.labWiseSummary.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                          Lab Partner Submissions
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {partnerDetails.labWiseSummary.map((lm, idx) => (
                            <div key={idx} className="p-3 bg-card border border-border/80 rounded-xl text-xs space-y-1">
                              <div className="flex justify-between items-center font-semibold text-foreground">
                                <span className="flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-[#0a7c7c]" />
                                  {lm.labName}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 font-bold">
                                  {lm.samples} samples
                                </span>
                              </div>
                              <div className="flex justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                                <span>Value: ₹{lm.totalTestValue.toLocaleString('en-IN')}</span>
                                <span>Commission: ₹{lm.collectionCommission.toLocaleString('en-IN')}</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Credited: ₹{lm.walletCredited.toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sample Collection Details Table (Requirement 3) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                          <FileCheck2 className="w-4 h-4 text-[#0a7c7c]" />
                          <span>3. Sample Collection Details ({partnerDetails.collections.length})</span>
                        </h4>

                        <select
                          value={detailFilterStatus}
                          onChange={(e) => setDetailFilterStatus(e.target.value)}
                          className="px-2.5 py-1 text-xs bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0a7c7c] text-foreground"
                        >
                          <option value="ALL">All Statuses</option>
                          <option value="SAMPLE_COLLECTED">Sample Collected</option>
                          <option value="DELIVERING_TO_BRANCH">In Transit</option>
                          <option value="DELIVERED_TO_LAB">Delivered to Lab</option>
                          <option value="PROCESSING">Processing</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </div>

                      {partnerDetails.collections.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-border rounded-xl">
                          <p className="text-sm text-muted-foreground">No collected samples found for this partner.</p>
                        </div>
                      ) : (
                        <div className="border border-border/80 rounded-xl overflow-hidden shadow-sm">
                          <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-muted/40 border-b border-border/60 text-muted-foreground font-medium">
                                  <th className="py-2.5 px-3">Collection Date</th>
                                  <th className="py-2.5 px-3">Sample ID</th>
                                  <th className="py-2.5 px-3">Test Name</th>
                                  <th className="py-2.5 px-3 text-right">Test Amount</th>
                                  <th className="py-2.5 px-3">Lab Partner Name</th>
                                  <th className="py-2.5 px-3">Collection Status</th>
                                  <th className="py-2.5 px-3 text-center">Rate</th>
                                  <th className="py-2.5 px-3 text-right">Commission</th>
                                  <th className="py-2.5 px-3 text-right">Wallet Credit</th>
                                  <th className="py-2.5 px-3 text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/40">
                                {partnerDetails.collections.map((item) => {
                                  const statusStyle = COLLECTION_STATUS_STYLES[item.collectionStatus] || {
                                    bg: 'bg-muted text-muted-foreground',
                                    label: item.collectionStatus,
                                  };
                                  return (
                                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                      {/* Collection Date */}
                                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                                        {new Date(item.collectionDate).toLocaleDateString('en-IN', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </td>

                                      {/* Sample ID */}
                                      <td className="py-2.5 px-3 font-mono">
                                        <div className="font-semibold text-foreground">{item.sampleId}</div>
                                        <div className="text-[10px] text-muted-foreground">Ref: {item.bookingCode}</div>
                                      </td>

                                      {/* Test Name */}
                                      <td className="py-2.5 px-3 font-medium text-foreground max-w-[140px] truncate" title={item.testName}>
                                        {item.testName}
                                      </td>

                                      {/* Test Amount */}
                                      <td className="py-2.5 px-3 text-right font-medium text-foreground">
                                        ₹{item.testAmount.toLocaleString('en-IN')}
                                      </td>

                                      {/* Lab Partner Name */}
                                      <td className="py-2.5 px-3 text-muted-foreground truncate max-w-[130px]" title={item.labPartnerName}>
                                        <div className="flex items-center gap-1">
                                          <Building2 className="w-3 h-3 text-[#0a7c7c] flex-shrink-0" />
                                          <span className="truncate">{item.labPartnerName}</span>
                                        </div>
                                      </td>

                                      {/* Collection Status */}
                                      <td className="py-2.5 px-3">
                                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap', statusStyle.bg)}>
                                          {statusStyle.label}
                                        </span>
                                      </td>

                                      {/* Commission Rate */}
                                      <td className="py-2.5 px-3 text-center text-muted-foreground font-medium">
                                        {item.commissionRate}%
                                      </td>

                                      {/* Commission Amount */}
                                      <td className="py-2.5 px-3 text-right font-semibold text-[#0a7c7c]">
                                        ₹{item.commissionAmount.toLocaleString('en-IN')}
                                      </td>

                                      {/* Wallet Credit Amount */}
                                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                        {item.isCreditedToWallet ? (
                                          `₹${item.walletCreditAmount.toLocaleString('en-IN')}`
                                        ) : (
                                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">Pending</span>
                                        )}
                                      </td>

                                      {/* Actions */}
                                      <td className="py-2.5 px-3 text-center">
                                        {!item.isCreditedToWallet ? (
                                          <button
                                            onClick={() =>
                                              setPayoutItem({
                                                bookingId: item.id,
                                                partnerId: partnerDetails.partner.id,
                                                partnerName: partnerDetails.partner.name,
                                                amount: item.commissionAmount,
                                                patientName: item.patient.name,
                                                testName: item.testName,
                                              })
                                            }
                                            className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-medium shadow-sm transition-all active:scale-95"
                                          >
                                            Credit Wallet
                                          </button>
                                        ) : (
                                          <span className="text-[10px] font-mono text-muted-foreground" title={item.walletTransactionRef || 'N/A'}>
                                            {item.walletTransactionRef ? `${item.walletTransactionRef.slice(0, 10)}...` : 'Credited'}
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PARTNER CONFIGURATION MODAL */}
      <AnimatePresence>
        {configModalPartner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h3 className="font-bold text-foreground">Configure Collection Partner</h3>
                  <p className="text-xs text-muted-foreground">{configModalPartner.name} ({configModalPartner.partnerCode})</p>
                </div>
                <button
                  onClick={() => setConfigModalPartner(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block font-medium text-foreground mb-1">Approval Status</label>
                  <select
                    value={editStatus}
                    onChange={(e: any) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-foreground focus:ring-2 focus:ring-[#0a7c7c]"
                  >
                    <option value="APPROVED">Approved</option>
                    <option value="PENDING">Pending Approval</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-foreground mb-1">Default Destination Lab</label>
                  <select
                    value={editBranchId}
                    onChange={(e) => setEditBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-foreground focus:ring-2 focus:ring-[#0a7c7c]"
                  >
                    <option value="">Central Pathology Hub (Default)</option>
                    {summary?.branches?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Freelancer vs In-House Commission Config */}
                {configModalPartner.phlebotomistType !== 'EMPLOYEE' && !configModalPartner.isEmployee ? (
                  <>
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-800 dark:text-emerald-200">App Freelance Phlebotomist</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 uppercase">
                        Commission Based
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-foreground mb-1">Collection Commission Rate (%) *</label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={editCommissionRate}
                          onChange={(e) => setEditCommissionRate(Math.max(0, Math.min(100, Number(e.target.value))))}
                          className="w-full pl-3 pr-9 py-2 bg-muted/30 border border-border rounded-xl text-foreground font-bold text-emerald-600 focus:ring-2 focus:ring-[#0a7c7c] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <div className="absolute right-3 flex items-center pointer-events-none text-muted-foreground">
                          <Percent className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Har collected sample booking par phlebotomist ko itna % commission milega.</p>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-foreground mb-1">Payout Settlement Cycle</label>
                      <select
                        value={editPaymentCycle}
                        onChange={(e) => setEditPaymentCycle(e.target.value)}
                        className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-foreground focus:ring-2 focus:ring-[#0a7c7c]"
                      >
                        <option value="WEEKLY">Weekly Payout</option>
                        <option value="15_DAYS">15 Days (Fortnightly)</option>
                        <option value="MONTHLY">Monthly Settlement</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="p-3 bg-muted/50 border border-border rounded-xl text-xs text-muted-foreground">
                    <span className="font-bold text-foreground block mb-0.5">In-House Staff Phlebotomist</span>
                    This phlebotomist is salaried staff assigned to branch lab operations. Referral commission is not applicable.
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border">
                  <div>
                    <span className="font-medium text-foreground block">Active for Sample Dispatch</span>
                    <span className="text-[11px] text-muted-foreground">Phlebotomist can receive collection orders</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editIsAvailable}
                    onChange={(e) => setEditIsAvailable(e.target.checked)}
                    className="w-4 h-4 accent-[#0a7c7c] cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfigModalPartner(null)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-muted text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-[#0a7c7c] text-white hover:bg-[#086363] disabled:opacity-60 shadow-sm"
                >
                  {savingConfig ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WALLET COMMISSION CREDIT CONFIRMATION MODAL */}
      <AnimatePresence>
        {payoutItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Credit Partner Wallet</h3>
                  <p className="text-xs text-muted-foreground">Add commission to phlebotomist wallet</p>
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Collection Partner:</span>
                  <span className="font-semibold text-foreground">{payoutItem.partnerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patient:</span>
                  <span className="text-foreground">{payoutItem.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Test:</span>
                  <span className="text-foreground truncate max-w-[200px]">{payoutItem.testName}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border/60 font-bold text-sm">
                  <span className="text-foreground">Amount Added to Wallet:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">₹{payoutItem.amount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Transaction Reference / Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Doorstep Sample Collection Commission Credit"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:ring-2 focus:ring-[#0a7c7c]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setPayoutItem(null)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-muted text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPayout}
                  disabled={processingPayout}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 shadow-sm"
                >
                  {processingPayout ? 'Processing...' : 'Confirm & Credit Wallet'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CollectionPartnersPage;
