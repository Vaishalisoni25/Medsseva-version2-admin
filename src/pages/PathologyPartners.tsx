import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { usePartnersQuery, useBranchesQuery, useRolesQuery, useAllPermissionsQuery } from '@/hooks/useAdminQueries';
import { testService, commissionService } from '../services/api';
import { customFormatService } from '@/services/customFormat.service';
import { exportInvoiceToPdf } from '@/utils/exportInvoicePdf';
import { LiveReportPreview } from '@/components/customFormats/LiveReportPreview';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, CheckCircle2, XCircle, AlertCircle,
  Microscope, Phone, Mail, MapPin, Star, Clock,
  ShieldCheck, ShieldX, ShieldAlert, RefreshCw,
  DollarSign, Activity, TrendingUp, FileText, Building2, Loader2,
  Plus, Edit3, Trash2, Eye, EyeOff, Percent, UserCheck, ExternalLink, ArrowLeft,
  Download, ZoomIn, ZoomOut,
  LayoutDashboard, UserRound, Stethoscope, Briefcase, CalendarRange,
  Receipt, FilePieChart, TestTube, PackagePlus, Palette, NotepadText,
  CheckSquare, Square
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'BLOCKED' | 'CORRECTION_REQUIRED';

export type CanonicalPartnerType = 'ALL' | 'LAB_PARTNER' | 'CHANNEL_PARTNER';

export interface PartnerDocumentItem {
  id: string;
  partnerId: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  fileSize?: number;
  status: 'NOT_UPLOADED' | 'UPLOADED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'CORRECTION_REQUIRED';
  rejectionReason?: string;
  correctionReason?: string;
  uploadedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export const DOC_CONFIGS = [
  // Medical & CEA Registration
  { type: 'MEDICAL_CEA_REGISTRATION', label: 'Medical & CEA Registration Certificate', category: 'MEDICAL', required: true },
  { type: 'BMW_LICENCE', label: 'Bio-Medical Waste (BMW) Licence', category: 'MEDICAL', required: true },
  { type: 'PATHOLOGIST_QUALIFICATION', label: 'Pathologist Degree / Qualification', category: 'MEDICAL', required: true },
  { type: 'NABL_CERTIFICATE', label: 'NABL Accreditation Certificate', category: 'MEDICAL', required: false },
  // Business & Legal Verification
  { type: 'REGISTRATION_CERTIFICATE', label: 'Business Registration / Trade License', category: 'LEGAL', required: true },
  { type: 'PAN_CARD', label: 'Lab / Entity PAN Card', category: 'LEGAL', required: true },
  { type: 'GST_CERTIFICATE', label: 'GST Registration Certificate', category: 'LEGAL', required: false },
  { type: 'CANCELLED_CHEQUE', label: 'Bank Cancelled Cheque / Passbook', category: 'LEGAL', required: false },
];

export const getPartnerTypeInfo = (role?: string) => {
  const r = (role || '').toUpperCase().trim();
  if (r === 'PHLEBOTOMIST' || r.includes('PHLEBO') || r === 'COLLECTION_PARTNER' || r.includes('SAMPLE COLLECTOR')) {
    return {
      typeKey: 'PHLEBOTOMIST' as CanonicalPartnerType,
      label: 'Phlebotomist',
      badgeBg: 'bg-blue-50 dark:bg-blue-950/50',
      badgeText: 'text-blue-700 dark:text-blue-300',
      badgeBorder: 'border-blue-200 dark:border-blue-800/60',
      icon: UserCheck,
    };
  }
  if (r === 'CHANNEL_PARTNER' || r.includes('CHANNEL')) {
    return {
      typeKey: 'CHANNEL_PARTNER' as CanonicalPartnerType,
      label: 'Channel Partner',
      badgeBg: 'bg-purple-50 dark:bg-purple-950/50',
      badgeText: 'text-purple-700 dark:text-purple-300',
      badgeBorder: 'border-purple-200 dark:border-purple-800/60',
      icon: Building2,
    };
  }
  return {
    typeKey: 'LAB_PARTNER' as CanonicalPartnerType,
    label: 'Lab Partner',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800/60',
    icon: Microscope,
  };
};

interface Partner {
  id: string;
  userId: string;
  labName: string;
  ownerName?: string;
  partnerCode?: string;
  role: string;
  city?: string;
  state?: string;
  pincode?: string;
  address?: string;
  preferredServiceArea?: string;
  rating: number;
  totalCollections: number;
  commissionRate?: number;
  paymentCycle?: string;
  approvalStatus: ApprovalStatus;
  rejectionReason?: string;
  correctionReason?: string;
  isAvailable: boolean;
  createdAt: string;
  branchId?: string;
  user: {
    id: string;
    name: string;
    email?: string;
    mobile: string;
    createdAt: string;
    adminUser?: {
      id?: string;
      roleId?: string;
      branchId?: string;
      isActive?: boolean;
      role?: {
        id: string;
        name: string;
        slug: string;
        permissions?: {
          permissionId?: string;
          permission?: { id: string; module: string; action: string };
        }[];
      };
      branch?: { id: string; name: string; city?: string };
    };
  };
  documents?: PartnerDocumentItem[];
}

export const MODULE_PERMISSIONS: { module: string; label: string; actions: string[] }[] = [
  { module: 'dashboard', label: 'Dashboard', actions: ['view'] },
  { module: 'users', label: 'User Management', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'doctors', label: 'Doctor Management', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'staff', label: 'Employee & Staff', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'lab_tests', label: 'Test Catalog', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'packages', label: 'Packages', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'bookings', label: 'Bookings', actions: ['view', 'create', 'edit', 'delete', 'assign'] },
  { module: 'samples', label: 'Sample Queue', actions: ['view', 'edit', 'assign'] },
  { module: 'reports', label: 'Report Approval', actions: ['view', 'approve', 'edit', 'delete'] },
  { module: 'expenses', label: 'Expenses', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'payments', label: 'Payments', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'coupons', label: 'Coupons & Offers', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'franchise', label: 'Franchise Tracking', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'inventory', label: 'LIMS Inventory', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'notifications', label: 'Notifications & SMS', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'cms', label: 'CMS Management', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'support', label: 'CRM Support', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'settings', label: 'Settings', actions: ['view', 'edit'] },
  { module: 'roles_permissions', label: 'Roles & Permissions', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'analytics', label: 'Analytics', actions: ['view', 'export'] },
  { module: 'audit_logs', label: 'API Monitor Logs', actions: ['view'] },
];

const STATUS_CONFIG: Record<ApprovalStatus, { bg: string; text: string; border: string; icon: any; label: string }> = {
  PENDING:             { bg: 'bg-amber-50 dark:bg-amber-950/40',   text: 'text-amber-700 dark:text-amber-300',   border: 'border-amber-200 dark:border-amber-800',   icon: Clock,        label: 'Pending'   },
  APPROVED:            { bg: 'bg-emerald-50 dark:bg-emerald-950/40',text: 'text-emerald-700 dark:text-emerald-300',border: 'border-emerald-200 dark:border-emerald-800',icon: CheckCircle2, label: 'Approved'  },
  REJECTED:            { bg: 'bg-rose-50 dark:bg-rose-950/40',     text: 'text-rose-700 dark:text-rose-300',     border: 'border-rose-200 dark:border-rose-800',     icon: XCircle,      label: 'Rejected'  },
  SUSPENDED:           { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800', icon: ShieldAlert,  label: 'Suspended' },
  BLOCKED:             { bg: 'bg-red-100 dark:bg-red-950/60',       text: 'text-red-800 dark:text-red-300',       border: 'border-red-300 dark:border-red-700',       icon: ShieldX,      label: 'Blocked'   },
  CORRECTION_REQUIRED: { bg: 'bg-yellow-50 dark:bg-yellow-950/40', text: 'text-yellow-800 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-700', icon: AlertCircle,  label: 'Correction Req' },
};

const REJECTION_REASONS = [
  'Invalid Documents',
  'Incorrect Address',
  'Duplicate Registration',
  'License Verification Failed',
  'Incomplete Information',
  'Outside Service Area',
];

import { useAppSelector } from '@/redux/hooks';

export const PathologyPartnersPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAppSelector(state => state.auth.user);
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'SUPER_ADMIN' || (currentUser as any)?.isSuperAdmin;
  const userBranchId = (currentUser as any)?.branchId || (currentUser as any)?.adminUser?.branchId;

  const { data: branchesData } = useBranchesQuery();
  const [branches, setBranches] = useState<any[]>([]);
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');

  useEffect(() => {
    if (branchesData) {
      setBranches(branchesData);
    }
  }, [branchesData]);

  const accessibleBranches = React.useMemo(() => {
    if (!isSuperAdmin && userBranchId) {
      return branches.filter((b: any) => b.id === userBranchId);
    }
    return branches;
  }, [branches, isSuperAdmin, userBranchId]);

  const uniqueLocations = React.useMemo(() => {
    const locs = accessibleBranches
      .map((b: any) => b.city)
      .filter((c: any): c is string => Boolean(c && c.trim()));
    return Array.from(new Set(locs)).sort((a: string, b: string) => a.localeCompare(b));
  }, [accessibleBranches]);

  const locationFilteredBranches = React.useMemo(() => {
    if (locationFilter === 'ALL') return accessibleBranches;
    return accessibleBranches.filter((b: any) => (b.city || '').toLowerCase() === locationFilter.toLowerCase());
  }, [accessibleBranches, locationFilter]);

  useEffect(() => {
    if (!isSuperAdmin && userBranchId) {
      setBranchFilter(userBranchId);
      const myBranch = branches.find((b: any) => b.id === userBranchId);
      if (myBranch?.city) {
        setLocationFilter(myBranch.city);
      }
    }
  }, [isSuperAdmin, userBranchId, branches]);

  const [activeView, setActiveView] = useState<'DIRECTORY' | 'PORTAL'>('DIRECTORY');
  const [partners, setPartners] = useState<Partner[]>([]);

  const [partnerTypeFilter, setPartnerTypeFilter] = useState<CanonicalPartnerType>('ALL');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isRequestingCorrection, setIsRequestingCorrection] = useState(false);
  const [correctionReasonInput, setCorrectionReasonInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [partnerRatings, setPartnerRatings] = useState<any>(null);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  // Custom Report Template & Preview Modal State
  const [customTemplate, setCustomTemplate] = useState<any>(null);
  const [selectedReportItem, setSelectedReportItem] = useState<any>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(0.85);

  // Partner Portal Specific State
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [portalPeriod, setPortalPeriod] = useState<'WEEKLY' | '15_DAYS' | '30_DAYS' | 'ALL'>('ALL');
  const [portalData, setPortalData] = useState<any>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Add / Edit Partner Modal State
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [formLabName, setFormLabName] = useState('');
  const [formContactName, setFormContactName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formRole, setFormRole] = useState('LAB_PARTNER');
  const [formPartnerCode, setFormPartnerCode] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCommissionRate, setFormCommissionRate] = useState<number>(30);
  const [formPaymentCycle, setFormPaymentCycle] = useState('MONTHLY');
  const [formApprovalStatus, setFormApprovalStatus] = useState<ApprovalStatus>('APPROVED');
  const [formAdminRoleId, setFormAdminRoleId] = useState('');
  const [formGrantAdminAccess, setFormGrantAdminAccess] = useState(true);
  const [savingPartner, setSavingPartner] = useState(false);

  const { data: partnersData, isLoading: partnersQueryLoading } = usePartnersQuery();
  const { data: rolesData } = useRolesQuery();
  const { data: allPermissionsData } = useAllPermissionsQuery();
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const isLoading = partnersQueryLoading && partners.length === 0;

  const getDefaultPartnerPermIds = (allPerms: any[]) => {
    if (!allPerms || allPerms.length === 0) return new Set<string>();
    const permIds = new Set<string>();
    const defaultModules = ['dashboard', 'users', 'doctors', 'staff', 'lab_tests', 'packages', 'bookings', 'reports', 'expenses', 'cms', 'payments', 'prescriptions'];
    for (const modKey of defaultModules) {
      const matched = allPerms.filter((p: any) =>
        (p.module === modKey || (modKey === 'lab_tests' && p.module === 'tests') || (modKey === 'expenses' && p.module === 'payments') || (modKey === 'audit_logs' && p.module === 'logs'))
      );
      matched.forEach((p: any) => permIds.add(p.id));
    }
    return permIds;
  };

  const togglePerm = (permId: string) => {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      next.has(permId) ? next.delete(permId) : next.add(permId);
      return next;
    });
  };

  const toggleModuleAll = (moduleKey: string) => {
    const modDef = MODULE_PERMISSIONS.find(m => m.module === moduleKey);
    if (!modDef || !allPermissionsData) return;
    const modulePerms = (allPermissionsData as any[]).filter(p =>
      (p.module === moduleKey || (moduleKey === 'lab_tests' && p.module === 'tests') || (moduleKey === 'expenses' && p.module === 'payments') || (moduleKey === 'audit_logs' && p.module === 'logs')) &&
      modDef.actions.some(act => act === p.action || (act === 'edit' && p.action === 'update') || (act === 'update' && p.action === 'edit'))
    );
    const allSelected = modulePerms.length > 0 && modulePerms.every(p => selectedPerms.has(p.id));
    setSelectedPerms(prev => {
      const next = new Set(prev);
      modulePerms.forEach(p => allSelected ? next.delete(p.id) : next.add(p.id));
      return next;
    });
  };

  const handleRoleChange = (roleId: string) => {
    setFormAdminRoleId(roleId);
    const role = (rolesData || []).find((r: any) => r.id === roleId);
    if (role && role.permissions && role.permissions.length > 0) {
      const rolePerms = new Set<string>(
        role.permissions.map((rp: any) => rp.permissionId || rp.permission?.id || rp.id)
      );
      setSelectedPerms(rolePerms);
    }
  };

  useEffect(() => {
    if (partnersData) {
      setPartners(partnersData);
      if (partnersData.length > 0 && !selectedPartnerId) {
        setSelectedPartnerId(partnersData[0].id);
      }
    }
  }, [partnersData]);

  useEffect(() => {
    customFormatService.getReportTemplates()
      .then(templates => {
        const def = templates.find((t: any) => t.isDefault) || templates[0];
        if (def) setCustomTemplate(def);
      })
      .catch(() => {});
  }, []);

  const handleDownloadReportPdf = async () => {
    if (!selectedReportItem) return;
    setExportingPdf(true);
    try {
      await exportInvoiceToPdf('#admin-partner-report-preview-sheet', `Lab_Report_${selectedReportItem.bookingCode || 'Report'}.pdf`);
      toast.success('Report PDF downloaded successfully');
    } catch (err) {
      console.error('Export report PDF error:', err);
      toast.error('Failed to download Report PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const patientReportData = selectedReportItem ? {
    patientName: selectedReportItem.patientName,
    age: selectedReportItem.patientAge || '32',
    gender: selectedReportItem.patientGender || 'Male',
    mobile: selectedReportItem.patientMobile || '',
    bookingCode: selectedReportItem.bookingCode,
    sampleId: `SMP-${selectedReportItem.bookingCode?.slice(-4) || '101'}`,
    collectionDate: selectedReportItem.scheduledDate || selectedReportItem.createdAt,
    reportingDate: selectedReportItem.report?.reportedDate || new Date().toISOString(),
    referredBy: portalData?.partner?.labName || partners.find(p => p.id === selectedPartnerId)?.labName || 'Authorized Pathology Center',
    branchName: portalData?.partner?.address || 'Main Central Laboratory',
  } : undefined;

  const testReportItems = selectedReportItem?.tests?.map((t: any) => ({
    testName: t.name || 'Diagnostic Investigation',
    testCode: t.code || 'LAB-TEST',
    category: t.category || 'CLINICAL PATHOLOGY / BIOCHEMISTRY',
    parameters: t.parameters && t.parameters.length > 0
      ? t.parameters
      : [
          { name: t.name || 'Sample Parameter', value: 'Normal / Complete', unit: '-', referenceRange: 'Within Biological Limits', isAbnormal: false, flag: 'NORMAL' as const },
        ],
    remarks: 'Sample investigated on automated analyzers and verified as per NABL guidelines.',
    interpretation: 'Diagnostic parameters are within normal physiological reference intervals.',
  })) || [];

  const loadPartnerPortal = async (partId?: string, period = portalPeriod) => {
    const targetId = partId || selectedPartnerId || (partners.length > 0 ? partners[0].id : '');
    if (!targetId && partners.length === 0) return;
    setPortalLoading(true);
    try {
      const res = await commissionService.getPartnerPortalData(period, targetId);
      setPortalData(res);
      if (res?.partner?.id && res.partner.id !== selectedPartnerId) {
        setSelectedPartnerId(res.partner.id);
      }
    } catch (err) {
      console.error('Failed to load partner portal data:', err);
      toast.error('Failed to load partner commission data.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleTogglePayout = async (bookingId: string, partnerId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID';
    try {
      await commissionService.updatePayoutStatus({
        bookingId,
        partnerId,
        status: nextStatus,
      });
      toast.success(`Payout marked as ${nextStatus}`);
      loadPartnerPortal(selectedPartnerId, portalPeriod);
    } catch (err: any) {
      toast.error('Failed to update payout status');
    }
  };

  useEffect(() => {
    if (activeView === 'PORTAL') {
      loadPartnerPortal(selectedPartnerId, portalPeriod);
    }
  }, [activeView, selectedPartnerId, portalPeriod]);

  const openPortalForPartner = (partner: Partner) => {
    setSelectedPartnerId(partner.id);
    setActiveView('PORTAL');
    loadPartnerPortal(partner.id, portalPeriod);
  };

  const openCreatePartner = () => {
    setEditingPartner(null);
    setFormLabName('');
    setFormContactName('');
    setFormEmail('');
    setFormMobile('');
    setFormPassword('');
    setShowPassword(false);
    setFormRole('LAB_PARTNER');
    setFormPartnerCode(`PART-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormAddress('');
    setFormCommissionRate(30);
    setFormPaymentCycle('MONTHLY');
    setFormApprovalStatus('PENDING');
    const defaultRole = (rolesData || []).find((r: any) => r.slug === 'partner_admin' || r.slug === 'branch_admin' || r.slug === 'admin') || rolesData?.[0];
    setFormAdminRoleId(defaultRole?.id || '');
    setFormGrantAdminAccess(true);
    setSelectedPerms(getDefaultPartnerPermIds(allPermissionsData || []));
    setPartnerModalOpen(true);
  };

  const openEditPartner = (p: Partner) => {
    setEditingPartner(p);
    setFormLabName(p.labName || '');
    setFormContactName(p.user?.name || '');
    setFormEmail(p.user?.email || '');
    setFormMobile(p.user?.mobile || '');
    setFormPassword('');
    setShowPassword(false);
    const typeInfo = getPartnerTypeInfo(p.role);
    setFormRole(typeInfo.typeKey);
    setFormPartnerCode(p.partnerCode || `PART-${p.id.slice(0, 5).toUpperCase()}`);
    setFormAddress(p.address || '');
    setFormCommissionRate(p.commissionRate !== undefined && p.commissionRate !== null ? Number(p.commissionRate) : 30);
    setFormPaymentCycle(p.paymentCycle || 'MONTHLY');
    setFormApprovalStatus(p.approvalStatus || 'APPROVED');
    const existingRoleId = p.user?.adminUser?.roleId || (p.user?.adminUser as any)?.role?.id;
    const defaultRole = (rolesData || []).find((r: any) => r.slug === 'partner_admin' || r.slug === 'branch_admin' || r.slug === 'admin') || rolesData?.[0];
    setFormAdminRoleId(existingRoleId || defaultRole?.id || '');
    
    const isPhlebotomist = (typeInfo.typeKey as string) === 'PHLEBOTOMIST' || String(p.role || '').toUpperCase().includes('PHLEBO');
    setFormGrantAdminAccess(isPhlebotomist ? false : Boolean(p.user?.adminUser || true));

    // Pre-populate permissions for this partner
    const existingPerms = (p.user?.adminUser?.role as any)?.permissions || [];
    if (!isPhlebotomist && existingPerms.length > 0) {
      const ids = new Set<string>(existingPerms.map((rp: any) => String(rp.permissionId || rp.permission?.id || rp.id)));
      setSelectedPerms(ids);
    } else {
      setSelectedPerms(getDefaultPartnerPermIds(allPermissionsData || []));
    }

    setPartnerModalOpen(true);
  };

  const handleSavePartner = async () => {
    if (!formLabName.trim()) {
      toast.error('Diagnostic Lab / Organization Name is required');
      return;
    }
    if (!formRole) {
      toast.error('Please select a Partner Type');
      return;
    }
    if (!formContactName.trim()) {
      toast.error('Contact Person Name is required');
      return;
    }
    const cleanMobile = formMobile.trim().replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length !== 10) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    if (!editingPartner && !formPassword && formRole !== 'PHLEBOTOMIST') {
      toast.error('Password is required for partner login');
      return;
    }

    setSavingPartner(true);
    try {
      const isPhleb = formRole === 'PHLEBOTOMIST';
      const payload: any = {
        labName: formLabName.trim(),
        name: formContactName.trim(),
        mobile: cleanMobile,
        email: formEmail.trim() || undefined,
        role: formRole,
        partnerCode: formPartnerCode.trim() || undefined,
        address: formAddress.trim() || undefined,
        commissionRate: Number(formCommissionRate) || 30,
        paymentCycle: formPaymentCycle || 'MONTHLY',
        approvalStatus: formApprovalStatus,
        adminRoleId: !isPhleb && formGrantAdminAccess ? formAdminRoleId || undefined : undefined,
        grantAdminAccess: !isPhleb && formGrantAdminAccess,
        permissionIds: !isPhleb && formGrantAdminAccess ? Array.from(selectedPerms) : [],
      };
      if (formPassword && !isPhleb) payload.password = formPassword;

      if (editingPartner) {
        const updated = await testService.updatePartner(editingPartner.id, payload);
        const updatedObj = updated?.partner || updated;
        setPartners(prev => prev.map(p => p.id === editingPartner.id ? { ...p, ...updatedObj } : p));
        if (selectedPartner?.id === editingPartner.id) {
          setSelectedPartner(prev => prev ? { ...prev, ...updatedObj } : null);
        }
        queryClient.invalidateQueries({ queryKey: ['partners'] });
        toast.success('Partner updated successfully');
      } else {
        const created = await testService.createPartner(payload);
        const createdObj = created?.partner || created;
        setPartners(prev => [createdObj, ...prev]);
        queryClient.invalidateQueries({ queryKey: ['partners'] });
        toast.success('Partner added successfully');
      }
      setPartnerModalOpen(false);
    } catch (err: any) {
      console.error('Save partner error:', err);
      toast.error(err?.response?.data?.error || 'Failed to save partner');
    } finally {
      setSavingPartner(false);
    }
  };

  const handleDeletePartner = async (partnerId: string, labName: string) => {
    if (!window.confirm(`Are you sure you want to delete partner "${labName}"? This action will unlink associated records and cannot be undone.`)) return;
    try {
      await testService.deletePartner(partnerId);
      setPartners(prev => prev.filter(p => p.id !== partnerId));
      if (selectedPartner?.id === partnerId) setSelectedPartner(null);
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success('Partner deleted successfully');
    } catch (err: any) {
      console.error('Delete partner error:', err);
      toast.error(err?.response?.data?.error || err?.response?.data?.details || 'Failed to delete partner');
    }
  };

  const handleApprove = async (partner: Partner) => {
    setIsUpdating(true);
    try {
      await testService.updatePartnerApproval(partner.id, 'APPROVED');
      setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, approvalStatus: 'APPROVED' } : p));
      if (selectedPartner?.id === partner.id) setSelectedPartner({ ...partner, approvalStatus: 'APPROVED' });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success(`${partner.user.name} approved successfully.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to approve partner.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPartner) return;
    const reason = rejectionReason === 'Other' ? customReason : rejectionReason;
    if (!reason) { toast.error('Please select or enter a rejection reason.'); return; }

    setIsUpdating(true);
    try {
      await testService.updatePartnerApproval(selectedPartner.id, 'REJECTED', reason);
      setPartners(prev => prev.map(p => p.id === selectedPartner.id
        ? { ...p, approvalStatus: 'REJECTED', rejectionReason: reason } : p));
      setSelectedPartner({ ...selectedPartner, approvalStatus: 'REJECTED', rejectionReason: reason });
      setIsRejecting(false);
      setRejectionReason('');
      setCustomReason('');
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success('Partner rejected.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to reject partner.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSuspend = async (partner: Partner) => {
    setIsUpdating(true);
    try {
      await testService.updatePartnerApproval(partner.id, 'SUSPENDED');
      setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, approvalStatus: 'SUSPENDED' } : p));
      if (selectedPartner?.id === partner.id) setSelectedPartner({ ...partner, approvalStatus: 'SUSPENDED' });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success('Partner suspended.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to suspend partner.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBlock = async (partner: Partner) => {
    if (!window.confirm(`Are you sure you want to BLOCK partner "${partner.labName}"?`)) return;
    setIsUpdating(true);
    try {
      await testService.updatePartnerApproval(partner.id, 'BLOCKED');
      setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, approvalStatus: 'BLOCKED' } : p));
      if (selectedPartner?.id === partner.id) setSelectedPartner(prev => prev ? { ...prev, approvalStatus: 'BLOCKED' } : null);
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success(`Partner "${partner.labName}" blocked.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to block partner.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRequestCorrectionSubmit = async () => {
    if (!selectedPartner) return;
    if (!correctionReasonInput.trim()) {
      toast.error('Please enter a correction reason.');
      return;
    }
    setIsUpdating(true);
    try {
      await testService.updatePartnerApproval(selectedPartner.id, 'CORRECTION_REQUIRED', undefined, correctionReasonInput.trim());
      setPartners(prev => prev.map(p => p.id === selectedPartner.id ? { ...p, approvalStatus: 'CORRECTION_REQUIRED', correctionReason: correctionReasonInput.trim() } : p));
      setSelectedPartner(prev => prev ? { ...prev, approvalStatus: 'CORRECTION_REQUIRED', correctionReason: correctionReasonInput.trim() } : null);
      setIsRequestingCorrection(false);
      setCorrectionReasonInput('');
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success('Correction request sent to partner.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to request correction.');
    } finally {
      setIsUpdating(false);
    }
  };

  const openPartnerDetails = async (partner: Partner) => {
    setSelectedPartner(partner);
    loadPartnerRatings(partner.id);
    try {
      const full = await testService.getPartnerDetails(partner.id);
      if (full) {
        setSelectedPartner(prev => prev ? { ...prev, ...full } : full);
      }
    } catch (e) {
      console.warn('Could not load detailed partner documents:', e);
    }
  };

  const handleVerifyDocument = async (docId: string, status: string, reason?: string) => {
    if (!selectedPartner) return;
    try {
      const res = await testService.updatePartnerDocumentStatus(selectedPartner.id, docId, status, status === 'REJECTED' ? reason : undefined, status === 'CORRECTION_REQUIRED' ? reason : undefined);
      const updatedDoc = res.document;
      if (updatedDoc) {
        setSelectedPartner(prev => {
          if (!prev) return null;
          const docs = (prev.documents || []).map(d => d.id === docId ? updatedDoc : d);
          return { ...prev, documents: docs };
        });
        toast.success(`Document marked as ${status.replace('_', ' ')}.`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update document status.');
    }
  };

  const loadPartnerRatings = async (partnerId: string) => {
    setRatingsLoading(true);
    setPartnerRatings(null);
    try {
      const data = await testService.getPartnerRatings(partnerId);
      setPartnerRatings(data);
    } catch {
      setPartnerRatings(null);
    } finally {
      setRatingsLoading(false);
    }
  };

  const handleActivate = async (partner: Partner) => {
    setIsUpdating(true);
    try {
      await testService.updatePartnerApproval(partner.id, 'APPROVED');
      setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, approvalStatus: 'APPROVED' } : p));
      if (selectedPartner?.id === partner.id) setSelectedPartner({ ...partner, approvalStatus: 'APPROVED' });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast.success('Partner reactivated.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to activate partner.');
    } finally {
      setIsUpdating(false);
    }
  };

  const basePartners = React.useMemo(() => {
    return partners.filter((p: any) => {
      // Exclude Phlebotomists from Tie-up Partners & Portal (Phlebotomists are managed in Collection Partner Management)
      const roleUpper = String(p.role || '').toUpperCase();
      const labNameUpper = String(p.labName || '').toUpperCase();
      const userRoleUpper = String(p.user?.role || '').toUpperCase();
      const codeUpper = String(p.partnerCode || '').toUpperCase();
      if (
        roleUpper.includes('PHLEBO') ||
        roleUpper.includes('COLLECTOR') ||
        roleUpper === 'EXECUTIVE' ||
        userRoleUpper === 'EXECUTIVE' ||
        labNameUpper.includes('PHLEBOTOMIST') ||
        codeUpper.includes('PHLEBO')
      ) {
        return false;
      }

      const partnerBranchId = p.branchId || p.user?.adminUser?.branchId;
      const partnerBranch = branches.find((b: any) => b.id === partnerBranchId) || p.user?.adminUser?.branch;

      if (!isSuperAdmin && userBranchId) {
        if (partnerBranchId !== userBranchId && partnerBranch?.id !== userBranchId) {
          return false;
        }
      }

      // Location / City filter
      if (locationFilter !== 'ALL') {
        const branchCity = partnerBranch?.city || p.city;
        if (!branchCity || branchCity.toLowerCase() !== locationFilter.toLowerCase()) {
          return false;
        }
      }

      // Specific Branch filter
      if (branchFilter !== 'ALL') {
        if (partnerBranchId !== branchFilter && partnerBranch?.id !== branchFilter) {
          return false;
        }
      }

      return true;
    });
  }, [partners, branches, isSuperAdmin, userBranchId, locationFilter, branchFilter]);

  const filtered = basePartners.filter(p => {
    const typeInfo = getPartnerTypeInfo(p.role);
    const matchesSearch =
      p.user.name.toLowerCase().includes(search.toLowerCase()) ||
      p.user.mobile.includes(search) ||
      p.labName.toLowerCase().includes(search.toLowerCase()) ||
      typeInfo.label.toLowerCase().includes(search.toLowerCase()) ||
      (p.partnerCode || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.approvalStatus === statusFilter;
    const matchesType = partnerTypeFilter === 'ALL' || typeInfo.typeKey === partnerTypeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const typeCounts = {
    ALL: basePartners.length,
    LAB_PARTNER: basePartners.filter(p => getPartnerTypeInfo(p.role).typeKey === 'LAB_PARTNER').length,
    CHANNEL_PARTNER: basePartners.filter(p => getPartnerTypeInfo(p.role).typeKey === 'CHANNEL_PARTNER').length,
  };

  const counts: Record<string, number> = {
    ALL: basePartners.length,
    PENDING: basePartners.filter(p => p.approvalStatus === 'PENDING').length,
    APPROVED: basePartners.filter(p => p.approvalStatus === 'APPROVED').length,
    REJECTED: basePartners.filter(p => p.approvalStatus === 'REJECTED').length,
    SUSPENDED: basePartners.filter(p => p.approvalStatus === 'SUSPENDED').length,
    BLOCKED: basePartners.filter(p => p.approvalStatus === 'BLOCKED').length,
    CORRECTION_REQUIRED: basePartners.filter(p => p.approvalStatus === 'CORRECTION_REQUIRED').length,
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header & View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" /> Tie-up Pathology Partners & Portal
          </h1>
          <p className="text-xs text-muted-foreground">Manage tie-up diagnostic laboratories, sample collections & referral commissions.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/partner-portal/login')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-xs font-bold transition-all shadow-sm"
            title="Open Partner Login Portal"
          >
            <Building2 className="w-3.5 h-3.5" /> Partner Portal Login
          </button>

          <button
            onClick={openCreatePartner}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Add New Partner
          </button>

          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-xs font-bold hover:bg-muted transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* VIEW 1: TIE-UP PARTNER REFERRAL & COMMISSION PORTAL */}
      {activeView === 'PORTAL' ? (
        <div className="space-y-6">
          {/* Controls Bar with Back Button */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveView('DIRECTORY')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-colors border border-border"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Partner Directory
              </button>
              <div className="text-xs font-bold text-emerald-600">
                Viewing: {portalData?.partner?.labName || partners.find(p => p.id === selectedPartnerId)?.labName || 'Partner'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border text-xs">
                {[
                  { id: 'WEEKLY', label: 'Weekly (7D)' },
                  { id: '15_DAYS', label: '15 Days' },
                  { id: '30_DAYS', label: '30 Days' },
                  { id: 'ALL', label: 'All Time' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setPortalPeriod(tab.id as any);
                      loadPartnerPortal(selectedPartnerId, tab.id as any);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      portalPeriod === tab.id
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => loadPartnerPortal(selectedPartnerId, portalPeriod)}
                className="p-2 rounded-xl bg-card border border-border hover:bg-muted text-foreground transition-colors"
                title="Refresh Portal Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${portalLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Partner Overview Banner */}
          <div className="bg-gradient-to-r from-emerald-900/10 via-card to-card border border-emerald-500/30 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Tie-up Laboratory Network</div>
              <h2 className="text-xl font-black text-foreground">
                {portalData?.partner?.labName || partners.find(p => p.id === selectedPartnerId)?.labName || 'Partner Lab'}
              </h2>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <span>Code: <strong className="text-emerald-600 font-mono">{portalData?.partner?.partnerCode || 'PART-201'}</strong></span>
                <span>•</span>
                <span>{portalData?.partner?.address || 'Authorized Center'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 rounded-xl px-4 py-2 text-center">
                <div className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">Lab Code</div>
                <div className="text-lg font-black text-emerald-800 dark:text-emerald-200">{portalData?.partner?.partnerCode || 'PART-201'}</div>
              </div>
              <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200/80 rounded-xl px-4 py-2 text-center">
                <div className="text-[10px] font-bold uppercase text-teal-700 dark:text-teal-300">Payment Cycle</div>
                <div className="text-lg font-black text-teal-800 dark:text-teal-200">{portalData?.summary?.paymentCycle || 'MONTHLY'}</div>
              </div>
            </div>
          </div>

          {/* KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Processed Samples</span>
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-foreground">{portalData?.summary?.totalReferredSamples ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{portalData?.summary?.totalTestsCount ?? 0} Tests Investigated</div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Billed Turnover</span>
                <TrendingUp className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-black text-foreground">₹{portalData?.summary?.totalBilledAmount?.toLocaleString('en-IN') ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Total Lab Collections</div>
            </div>


            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Payout Status</span>
                <CheckCircle2 className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-xs text-emerald-600 font-bold">₹{portalData?.summary?.paidCommission?.toLocaleString('en-IN') ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground font-semibold">Paid</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-amber-600 font-bold">₹{portalData?.summary?.unpaidCommission?.toLocaleString('en-IN') ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground font-semibold">Unpaid (Pending)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Samples Table */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 bg-muted/40 border-b border-border flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" /> Tie-up Partner Lab Collections & Reports
              </h3>
              <div className="text-xs text-muted-foreground font-mono">
                {portalData?.referrals?.length ?? 0} Samples
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Patient Name</th>
                    <th className="py-3 px-4">Investigated Tests</th>
                    <th className="py-3 px-4 text-right">Billed Amount</th>

                    <th className="py-3 px-4 text-center">Payout Status</th>
                    <th className="py-3 px-4 text-center">Lab Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {portalLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2 text-emerald-600" /> Loading partner records...
                      </td>
                    </tr>
                  ) : !portalData?.referrals || portalData.referrals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-muted-foreground">
                        No sample records found for this partner in this cycle period.
                      </td>
                    </tr>
                  ) : (
                    portalData.referrals.map((item: any) => (
                      <tr key={item.bookingId} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {item.bookingCode}
                          <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                            {new Date(item.scheduledDate || item.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-foreground">
                          {item.patientName}
                          <div className="text-[10px] text-muted-foreground font-normal">
                            {item.patientAge ? `${item.patientAge} Y` : ''} {item.patientGender ? `• ${item.patientGender}` : ''}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {item.tests?.map((t: any, idx: number) => (
                              <span key={idx} className="bg-muted border border-border text-foreground px-2 py-0.5 rounded text-[10px]">
                                {t.name} (₹{t.price})
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-foreground font-mono">
                          ₹{item.totalPaid?.toLocaleString('en-IN')}
                        </td>



                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleTogglePayout(item.bookingId, selectedPartnerId, item.payoutStatus)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase transition-all hover:opacity-80 active:scale-95 ${
                              item.payoutStatus === 'PAID'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                            }`}
                            title="Click to toggle payout status (Paid / Unpaid)"
                          >
                            ● {item.payoutStatus}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedReportItem(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer shadow-2xs"
                          >
                            <FileText className="w-3.5 h-3.5" /> View Report
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 2: PARTNER DIRECTORY & APPROVALS */
        <>
          {/* Partner Type Top Filter Tabs */}
          <div className="bg-card border border-border rounded-2xl p-2.5 shadow-sm flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: 'All Partners', icon: Building2, count: typeCounts.ALL },
              { id: 'LAB_PARTNER', label: 'Lab Partner', icon: Microscope, count: typeCounts.LAB_PARTNER },
              { id: 'CHANNEL_PARTNER', label: 'Channel Partner', icon: Building2, count: typeCounts.CHANNEL_PARTNER },
            ].map(tab => {
              const TabIcon = tab.icon;
              const isActive = partnerTypeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setPartnerTypeFilter(tab.id as CanonicalPartnerType)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all',
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent'
                  )}
                >
                  <TabIcon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-extrabold',
                    isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                  )}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] as ApprovalStatus[]).map(s => {
              const cfg = STATUS_CONFIG[s];
              const Icon = cfg.icon;
              return (
                <div key={s} className="bg-card border border-border p-4 rounded-xl shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={cn('h-4 w-4', cfg.text)} />
                    <span className="text-xs font-bold text-muted-foreground uppercase">{cfg.label}</span>
                  </div>
                  {isLoading ? (
                    <div className="h-7 bg-muted rounded w-10 animate-pulse mt-1" />
                  ) : (
                    <div className={cn('text-2xl font-bold', cfg.text)}>{counts[s]}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, mobile, lab, or partner type..."
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-card border border-input text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Location / City Filter */}
            <div className="w-full sm:w-48">
              <select
                value={locationFilter}
                onChange={e => {
                  const newLoc = e.target.value;
                  setLocationFilter(newLoc);
                  if (newLoc !== 'ALL') {
                    const isStillValid = locationFilteredBranches.some((b: any) => b.id === branchFilter && (b.city || '').toLowerCase() === newLoc.toLowerCase());
                    if (!isStillValid) setBranchFilter('ALL');
                  }
                }}
                className="w-full text-xs bg-card border border-input rounded-lg px-2.5 py-2 outline-none font-medium text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {isSuperAdmin && <option value="ALL">All Locations / Cities</option>}
                {uniqueLocations.map((loc: string) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Branch Filter */}
            <div className="w-full sm:w-56">
              <select
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
                className="w-full text-xs bg-card border border-input rounded-lg px-2.5 py-2 outline-none font-medium text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
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

            <div className="flex gap-2 flex-wrap">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors',
                    statusFilter === s
                      ? 'bg-primary text-white border-primary'
                      : 'bg-card text-muted-foreground border-border hover:border-primary'
                  )}
                >
                  {s === 'ALL' ? `All (${counts.ALL})` : `${STATUS_CONFIG[s as ApprovalStatus].label} (${counts[s as ApprovalStatus]})`}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-bold">Partner</th>
                    <th className="px-6 py-4 font-bold">Partner Type</th>
                    <th className="px-6 py-4 font-bold">Lab / Organization</th>
                    <th className="px-6 py-4 font-bold">Contact</th>
                    <th className="px-6 py-4 font-bold">Rating</th>
                    <th className="px-6 py-4 font-bold">Status</th>

                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <>
                      {[1, 2, 3, 4, 5].map(i => (
                        <tr key={i} className="animate-pulse border-b border-border">
                          <td className="px-6 py-4"><div className="h-5 bg-muted rounded w-32" /></td>
                          <td className="px-6 py-4"><div className="h-5 bg-muted rounded w-24" /></td>
                          <td className="px-6 py-4"><div className="h-5 bg-muted rounded w-24" /></td>
                          <td className="px-6 py-4"><div className="h-5 bg-muted rounded w-28" /></td>
                          <td className="px-6 py-4"><div className="h-5 bg-muted rounded w-16" /></td>
                          <td className="px-6 py-4"><div className="h-5 bg-muted rounded w-20" /></td>
                          <td className="px-6 py-4"><div className="h-5 bg-muted rounded w-20" /></td>
                          <td className="px-6 py-4 text-right"><div className="h-5 bg-muted rounded w-16 ml-auto" /></td>
                        </tr>
                      ))}
                    </>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                        No partners found matching the selected filters.
                      </td>
                    </tr>
                  ) : filtered.map(partner => {
                    const cfg = STATUS_CONFIG[partner.approvalStatus];
                    const StatusIcon = cfg.icon;
                    const typeInfo = getPartnerTypeInfo(partner.role);
                    const TypeIcon = typeInfo.icon;
                    return (
                      <tr
                        key={partner.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => openPartnerDetails(partner)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm uppercase">
                              {partner.user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{partner.user.name}</div>
                              <div className="text-xs text-muted-foreground">{partner.user.mobile}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold border rounded-lg',
                            typeInfo.badgeBg, typeInfo.badgeText, typeInfo.badgeBorder
                          )}>
                            <TypeIcon className="w-3.5 h-3.5" />
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">{partner.labName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground font-mono">
                              {partner.partnerCode || `PART-${partner.id.slice(0, 5).toUpperCase()}`}
                            </span>
                            {(() => {
                              const partnerBranchId = (partner as any).branchId || (partner as any).user?.adminUser?.branchId;
                              const matchedBranch = branches.find((b: any) => b.id === partnerBranchId) || (partner as any).user?.adminUser?.branch;
                              const adminRole = (partner as any).user?.adminUser?.role;
                              const hasAdminAccess = (partner as any).user?.adminUser?.isActive;
                              return (
                                <>
                                  {matchedBranch && (
                                    <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                                      <Building2 className="w-2.5 h-2.5" />
                                      {matchedBranch.name}
                                    </span>
                                  )}
                                  {adminRole && hasAdminAccess && (
                                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                                      <ShieldCheck className="w-2.5 h-2.5" />
                                      {adminRole.name}
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {partner.user.mobile}
                          </div>
                          {partner.user.email && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3" /> {partner.user.email}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                            <span className="text-sm font-semibold">{partner.rating.toFixed(1)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{partner.totalCollections} collections</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold border rounded-full',
                            cfg.bg, cfg.text, cfg.border
                          )}>
                            <StatusIcon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openPartnerDetails(partner)}
                              className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-emerald-200 dark:border-emerald-800"
                              title="View Details & Onboarding Verification"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View Details</span>
                            </button>

                            <button
                              onClick={() => openEditPartner(partner)}
                              className="h-7 w-7 bg-muted text-foreground hover:bg-primary/10 hover:text-primary rounded-full flex items-center justify-center border border-border transition-colors"
                              title="Edit Partner & Commission"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>

                            {partner.approvalStatus === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleApprove(partner)}
                                  disabled={isUpdating}
                                  className="h-7 w-7 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-full flex items-center justify-center border border-emerald-200"
                                  title="Approve"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => { setSelectedPartner(partner); setIsRejecting(true); }}
                                  disabled={isUpdating}
                                  className="h-7 w-7 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-full flex items-center justify-center border border-rose-200"
                                  title="Reject"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                            {partner.approvalStatus === 'APPROVED' && (
                              <button
                                onClick={() => handleSuspend(partner)}
                                disabled={isUpdating}
                                className="h-7 w-7 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-full flex items-center justify-center border border-orange-200"
                                title="Suspend"
                              >
                                <ShieldAlert className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {(partner.approvalStatus === 'SUSPENDED' || partner.approvalStatus === 'REJECTED') && (
                              <button
                                onClick={() => handleActivate(partner)}
                                disabled={isUpdating}
                                className="h-7 w-7 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-full flex items-center justify-center border border-emerald-200"
                                title="Reactivate"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeletePartner(partner.id, partner.labName)}
                              className="h-7 w-7 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-full flex items-center justify-center border border-rose-200 transition-colors"
                              title="Delete Partner"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Detail Drawer — Onboarding & Document Verification */}
      <AnimatePresence>
        {selectedPartner && !isRejecting && !isRequestingCorrection && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 cursor-pointer"
              onClick={() => setSelectedPartner(null)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-card border-l border-border z-50 shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-border bg-muted/20 shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold border rounded-full',
                        STATUS_CONFIG[selectedPartner.approvalStatus]?.bg || 'bg-muted',
                        STATUS_CONFIG[selectedPartner.approvalStatus]?.text || 'text-foreground',
                        STATUS_CONFIG[selectedPartner.approvalStatus]?.border || 'border-border'
                      )}>
                        {STATUS_CONFIG[selectedPartner.approvalStatus]?.label || selectedPartner.approvalStatus}
                      </span>
                      {(() => {
                        const tInfo = getPartnerTypeInfo(selectedPartner.role);
                        const TIcon = tInfo.icon;
                        return (
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold border rounded-full',
                            tInfo.badgeBg, tInfo.badgeText, tInfo.badgeBorder
                          )}>
                            <TIcon className="w-3 h-3" />
                            {tInfo.label}
                          </span>
                        );
                      })()}
                    </div>
                    <h2 className="text-xl font-extrabold text-foreground">{selectedPartner.labName}</h2>
                    <p className="text-xs text-muted-foreground font-mono">Partner Code: {selectedPartner.partnerCode || 'N/A'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditPartner(selectedPartner)}
                      className="p-2 hover:bg-primary/10 text-primary rounded-lg border border-border transition-colors flex items-center gap-1 text-xs font-bold"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button onClick={() => setSelectedPartner(null)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Drawer Body — Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Section 1: LAB & OWNER DETAILS */}
                <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-3">
                  <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" /> Lab & Owner Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-bold uppercase">Diagnostic Centre Name</span>
                      <span className="font-bold text-foreground text-sm">{selectedPartner.labName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-bold uppercase">Owner / Director Name</span>
                      <span className="font-bold text-foreground">{selectedPartner.ownerName || selectedPartner.user.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-bold uppercase">Authorized Contact Person</span>
                      <span className="font-semibold text-foreground">{selectedPartner.user.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-bold uppercase">Mobile Number</span>
                      <span className="font-semibold text-foreground">{selectedPartner.user.mobile}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-bold uppercase">Email Address</span>
                      <span className="font-semibold text-foreground">{selectedPartner.user.email || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-bold uppercase">Service Area / Radius</span>
                      <span className="font-semibold text-foreground">{selectedPartner.preferredServiceArea || selectedPartner.city || 'N/A'}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground block text-[10px] font-bold uppercase">Complete Address</span>
                      <span className="font-medium text-foreground">{selectedPartner.address || 'N/A'}, {selectedPartner.city || ''} {selectedPartner.state ? `, ${selectedPartner.state}` : ''} {selectedPartner.pincode ? `- ${selectedPartner.pincode}` : ''}</span>
                    </div>
                  </div>
                </div>

                {/* Section 2: MEDICAL & CEA REGISTRATION */}
                <div className="bg-card border border-border rounded-2xl p-4 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" /> Medical & CEA Registration Documents
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {DOC_CONFIGS.filter(c => c.category === 'MEDICAL').map(meta => {
                      const doc = (selectedPartner.documents || []).find(d => d.documentType === meta.type);
                      return (
                        <div key={meta.type} className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">{meta.label}</span>
                              <span className={cn('text-[9px] font-extrabold px-1.5 py-0.5 rounded', meta.required ? 'bg-rose-100 text-rose-700' : 'bg-muted text-muted-foreground')}>
                                {meta.required ? 'REQUIRED' : 'OPTIONAL'}
                              </span>
                            </div>

                            {doc ? (
                              <span className={cn(
                                'text-[10px] font-extrabold px-2 py-0.5 rounded-full border',
                                doc.status === 'VERIFIED' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                doc.status === 'REJECTED' && 'bg-rose-50 text-rose-700 border-rose-200',
                                doc.status === 'CORRECTION_REQUIRED' && 'bg-amber-50 text-amber-700 border-amber-200',
                                (doc.status === 'UPLOADED' || doc.status === 'UNDER_REVIEW') && 'bg-blue-50 text-blue-700 border-blue-200'
                              )}>
                                ● {doc.status.replace('_', ' ')}
                              </span>
                            ) : (
                              <span className={cn('text-[10px] font-extrabold px-2 py-0.5 rounded-full', meta.required ? 'bg-rose-100 text-rose-800' : 'bg-muted text-muted-foreground')}>
                                {meta.required ? 'Missing Required Document' : 'Not Provided'}
                              </span>
                            )}
                          </div>

                          {doc && (
                            <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
                              <div className="text-muted-foreground text-[11px]">
                                <span className="font-mono font-medium text-foreground">{doc.fileName}</span>
                                <span className="ml-2">({new Date(doc.uploadedAt).toLocaleDateString('en-IN')})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> View Document
                                </a>

                                <button
                                  onClick={() => handleVerifyDocument(doc.id, 'VERIFIED')}
                                  className="px-2 py-0.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded text-[10px] font-bold"
                                  title="Mark as Verified"
                                >
                                  Verify
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = window.prompt('Enter rejection reason for ' + meta.label + ':');
                                    if (reason) handleVerifyDocument(doc.id, 'REJECTED', reason);
                                  }}
                                  className="px-2 py-0.5 bg-rose-100 text-rose-800 hover:bg-rose-200 rounded text-[10px] font-bold"
                                  title="Reject Document"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = window.prompt('Enter correction request for ' + meta.label + ':');
                                    if (reason) handleVerifyDocument(doc.id, 'CORRECTION_REQUIRED', reason);
                                  }}
                                  className="px-2 py-0.5 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded text-[10px] font-bold"
                                  title="Request Document Correction"
                                >
                                  Correction
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 3: BUSINESS & LEGAL VERIFICATION */}
                <div className="bg-card border border-border rounded-2xl p-4 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600" /> Business & Legal Verification Documents
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {DOC_CONFIGS.filter(c => c.category === 'LEGAL').map(meta => {
                      const doc = (selectedPartner.documents || []).find(d => d.documentType === meta.type);
                      return (
                        <div key={meta.type} className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">{meta.label}</span>
                              <span className={cn('text-[9px] font-extrabold px-1.5 py-0.5 rounded', meta.required ? 'bg-rose-100 text-rose-700' : 'bg-muted text-muted-foreground')}>
                                {meta.required ? 'REQUIRED' : 'OPTIONAL'}
                              </span>
                            </div>

                            {doc ? (
                              <span className={cn(
                                'text-[10px] font-extrabold px-2 py-0.5 rounded-full border',
                                doc.status === 'VERIFIED' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                doc.status === 'REJECTED' && 'bg-rose-50 text-rose-700 border-rose-200',
                                doc.status === 'CORRECTION_REQUIRED' && 'bg-amber-50 text-amber-700 border-amber-200',
                                (doc.status === 'UPLOADED' || doc.status === 'UNDER_REVIEW') && 'bg-blue-50 text-blue-700 border-blue-200'
                              )}>
                                ● {doc.status.replace('_', ' ')}
                              </span>
                            ) : (
                              <span className={cn('text-[10px] font-extrabold px-2 py-0.5 rounded-full', meta.required ? 'bg-rose-100 text-rose-800' : 'bg-muted text-muted-foreground')}>
                                {meta.required ? 'Missing Required Document' : 'Not Provided'}
                              </span>
                            )}
                          </div>

                          {doc && (
                            <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
                              <div className="text-muted-foreground text-[11px]">
                                <span className="font-mono font-medium text-foreground">{doc.fileName}</span>
                                <span className="ml-2">({new Date(doc.uploadedAt).toLocaleDateString('en-IN')})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> View Document
                                </a>

                                <button
                                  onClick={() => handleVerifyDocument(doc.id, 'VERIFIED')}
                                  className="px-2 py-0.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded text-[10px] font-bold"
                                  title="Mark as Verified"
                                >
                                  Verify
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = window.prompt('Enter rejection reason for ' + meta.label + ':');
                                    if (reason) handleVerifyDocument(doc.id, 'REJECTED', reason);
                                  }}
                                  className="px-2 py-0.5 bg-rose-100 text-rose-800 hover:bg-rose-200 rounded text-[10px] font-bold"
                                  title="Reject Document"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = window.prompt('Enter correction request for ' + meta.label + ':');
                                    if (reason) handleVerifyDocument(doc.id, 'CORRECTION_REQUIRED', reason);
                                  }}
                                  className="px-2 py-0.5 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded text-[10px] font-bold"
                                  title="Request Document Correction"
                                >
                                  Correction
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 4: Performance & Commission Summary */}
                <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-3">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Referral & Commission Details</h3>
                  <div className="grid grid-cols-1 gap-3 text-xs">
                    <div className="bg-card p-3 rounded-lg border border-border">
                      <span className="text-muted-foreground block text-[10px] font-bold uppercase">Payment Cycle</span>
                      <span className="text-base font-bold text-foreground">{selectedPartner.paymentCycle || 'MONTHLY'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Footer — ADMIN ACTION BAR */}
              <div className="p-4 border-t border-border bg-muted/40 shrink-0 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center">
                  Admin Verification Actions for {selectedPartner.labName}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => handleApprove(selectedPartner)}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" /> APPROVE
                  </button>

                  <button
                    onClick={() => setIsRequestingCorrection(true)}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <AlertCircle className="w-4 h-4" /> Request Correction
                  </button>

                  <button
                    onClick={() => setIsRejecting(true)}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> REJECT
                  </button>

                  <button
                    onClick={() => handleSuspend(selectedPartner)}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <ShieldAlert className="w-4 h-4" /> SUSPEND
                  </button>

                  <button
                    onClick={() => handleBlock(selectedPartner)}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <ShieldX className="w-4 h-4" /> BLOCK
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal for Creating / Editing Partner */}
      <AnimatePresence>
        {partnerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0 bg-muted/20">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  {editingPartner ? 'Edit Tie-up Partner' : 'Add New Tie-up Partner'}
                </h2>
                <button
                  onClick={() => setPartnerModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Lab Name */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-foreground mb-1.5">
                      Diagnostic Lab / Center Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Pathology & Diagnostic Lab"
                      value={formLabName}
                      onChange={e => setFormLabName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-semibold"
                    />
                  </div>

                  {/* Contact Person Name */}
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5">
                      Contact Person / Owner Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Rajesh Verma"
                      value={formContactName}
                      onChange={e => setFormContactName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  {/* Partner Type */}
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5">
                      Partner Type <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={formRole}
                      onChange={e => setFormRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold text-foreground"
                    >
                      <option value="LAB_PARTNER">Lab Partner</option>
                      <option value="CHANNEL_PARTNER">Channel Partner</option>
                    </select>
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5">
                      Mobile Number <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">+91</span>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="9876543210"
                        value={formMobile}
                        onChange={e => setFormMobile(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono font-medium"
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="lab@example.com"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  {/* Partner Code */}
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5">
                      Partner Code / Reference ID
                    </label>
                    <input
                      type="text"
                      placeholder="PART-001"
                      value={formPartnerCode}
                      onChange={e => setFormPartnerCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                    />
                  </div>

                  {/* Admin Panel Access / Phlebotomist Restriction Callout */}
                  {formRole === 'PHLEBOTOMIST' ? (
                    <div className="md:col-span-2 p-5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-start gap-3.5 shadow-sm">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold shrink-0 mt-0.5">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                          Phlebotomists Cannot Be Assigned Admin Access
                        </h4>
                        <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                          Phlebotomists and sample collectors operate strictly through the <strong>MedsSeva Mobile App</strong> for sample collection bookings and home visit fulfillment. They cannot be granted credentials to the Admin Panel nor assigned Branch Admin permissions.
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Admin Panel Access & Role Assignment Card for Lab Partners */
                    <div className="md:col-span-2 p-5 bg-gradient-to-br from-indigo-50/70 via-background to-blue-50/50 dark:from-indigo-950/30 dark:via-background dark:to-blue-950/20 border border-indigo-200/80 dark:border-indigo-800/50 rounded-2xl space-y-4 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <label className="text-xs font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wider block">
                              Admin Panel Access & Lab Branch Credentials
                            </label>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Allow this partner to log into the Admin Panel to manage their lab's patients, bookings, and reports as Branch Admin.
                            </p>
                          </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={formGrantAdminAccess}
                            onChange={e => setFormGrantAdminAccess(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                          <span className="ml-2 text-xs font-bold text-foreground">
                            {formGrantAdminAccess ? 'Admin Access Enabled' : 'Disabled'}
                          </span>
                        </label>
                      </div>

                    {formGrantAdminAccess && (
                      <div className="space-y-3.5 pt-2 border-t border-indigo-100 dark:border-indigo-900/50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {/* Admin Role Selection */}
                          <div>
                            <label className="block text-[11px] font-bold text-foreground mb-1">
                              Assigned Admin Role <span className="text-destructive">*</span>
                            </label>
                            <select
                              value={formAdminRoleId}
                              onChange={e => handleRoleChange(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-background text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            >
                              {(rolesData || [])
                                .filter((r: any) => r.slug !== 'super_admin')
                                .map((r: any) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name} ({r.slug})
                                  </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Permissions configured under Roles & Permissions will govern what sections this partner can view and manage.
                            </p>
                          </div>

                          {/* Admin Password */}
                          <div>
                            <label className="block text-[11px] font-bold text-foreground mb-1">
                              {editingPartner ? 'Admin Panel Password (leave blank to keep current)' : 'Admin Panel Password'} {!editingPartner && <span className="text-destructive">*</span>}
                            </label>
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder={editingPartner ? '•••••••• (Keep existing password)' : 'Enter secure admin password'}
                                value={formPassword}
                                onChange={e => setFormPassword(e.target.value)}
                                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-background text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Partner will use their Mobile Number / Email + this Password to sign into the Admin Panel.
                            </p>
                          </div>
                        </div>

                        {/* Permissions Matrix (Exact layout matching 2nd screenshot) */}
                        <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-foreground">Permissions Matrix</label>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  if (allPermissionsData) {
                                    setSelectedPerms(new Set((allPermissionsData as any[]).map(p => p.id)));
                                  }
                                }}
                                className="text-xs text-teal-700 dark:text-teal-400 hover:underline font-medium"
                              >
                                Select All
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedPerms(new Set())}
                                className="text-xs text-muted-foreground hover:underline"
                              >
                                Clear All
                              </button>
                            </div>
                          </div>

                          <div className="border border-border/80 dark:border-border rounded-xl bg-card overflow-hidden max-h-60 overflow-y-auto">
                            {MODULE_PERMISSIONS.map(mod => {
                              const modulePerms = (allPermissionsData as any[] || []).filter(p =>
                                (p.module === mod.module || (mod.module === 'lab_tests' && p.module === 'tests') || (mod.module === 'expenses' && p.module === 'payments') || (mod.module === 'audit_logs' && p.module === 'logs')) &&
                                mod.actions.some(act => act === p.action || (act === 'edit' && p.action === 'update') || (act === 'update' && p.action === 'edit'))
                              );
                              const allSelected = modulePerms.length > 0 && modulePerms.every(p => selectedPerms.has(p.id));

                              return (
                                <div key={mod.module} className="border-b border-border/50 last:border-0 p-3.5 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-foreground">{mod.label}</span>
                                    <button
                                      type="button"
                                      onClick={() => toggleModuleAll(mod.module)}
                                      className="text-xs text-teal-700 dark:text-teal-400 hover:underline font-medium"
                                    >
                                      {allSelected ? 'Deselect all' : 'Select all'}
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-5 pt-0.5">
                                    {mod.actions.map(action => {
                                      const perm = (allPermissionsData as any[] || []).find(p =>
                                        (p.module === mod.module || (mod.module === 'lab_tests' && p.module === 'tests') || (mod.module === 'expenses' && p.module === 'payments') || (mod.module === 'audit_logs' && p.module === 'logs')) &&
                                        (p.action === action || (action === 'edit' && p.action === 'update') || (action === 'update' && p.action === 'edit'))
                                      );
                                      if (!perm) return null;
                                      const checked = selectedPerms.has(perm.id);

                                      return (
                                        <label
                                          key={action}
                                          className="flex items-center gap-2 text-xs text-foreground/80 hover:text-foreground cursor-pointer select-none"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => togglePerm(perm.id)}
                                            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                                          />
                                          <span>{action}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <p className="text-xs text-muted-foreground">
                            {selectedPerms.size} permissions selected
                          </p>
                        </div>

                        {/* Branch Isolation Informational Callout */}
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/40 text-blue-900 dark:text-blue-200 text-xs">
                          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-bold">Branch Data Isolation Active: </span>
                            A dedicated Branch corresponding to this lab is automatically maintained. Upon logging into the Admin Panel, this partner will strictly see and manage data belonging to their own branch (doctors, staff, bookings, reports, inventory), without accessing any other branch or global system records.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                  {/* Payment Cycle Section */}
                  <div className="md:col-span-2 p-4 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" /> Payment & Payout Cycle
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                          Payment & Payout Cycle
                        </label>
                        <select
                          value={formPaymentCycle}
                          onChange={e => setFormPaymentCycle(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-background text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                        >
                          <option value="MONTHLY">Monthly (End of Month)</option>
                          <option value="15_DAYS">Bi-Weekly (15 Days)</option>
                          <option value="WEEKLY">Weekly (Every Monday)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Approval Status */}
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5">
                      Approval Status
                    </label>
                    <select
                      value={formApprovalStatus}
                      onChange={e => setFormApprovalStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-semibold"
                    >
                      <option value="APPROVED">Approved & Active</option>
                      <option value="PENDING">Pending Verification</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>

                  {/* Complete Address */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-foreground mb-1.5">
                      Complete Address / Center Location
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Shop/Building No, Landmark, Area, City, Pincode"
                      value={formAddress}
                      onChange={e => setFormAddress(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-5 border-t border-border flex-shrink-0 bg-muted/20">
                <button
                  type="button"
                  onClick={() => setPartnerModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePartner}
                  disabled={savingPartner}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-black hover:bg-primary/90 shadow-sm transition-all flex items-center gap-2 disabled:opacity-60"
                >
                  {savingPartner ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving Partner...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> {editingPartner ? 'Save Changes' : 'Create Partner'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rejection Reason Modal */}
      <AnimatePresence>
        {isRejecting && selectedPartner && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[60] cursor-pointer"
              onClick={() => setIsRejecting(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            >
              <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-foreground text-lg">Reject Partner</h3>
                  <button onClick={() => setIsRejecting(false)} className="p-1.5 hover:bg-muted rounded-lg">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  Select a reason for rejecting <span className="font-bold text-foreground">{selectedPartner.user.name}</span>.
                  This will be sent to the partner.
                </p>

                <div className="space-y-2 mb-4">
                  {REJECTION_REASONS.map(r => (
                    <button
                      key={r}
                      onClick={() => setRejectionReason(r)}
                      className={cn(
                        'w-full text-left px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                        rejectionReason === r
                          ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                          : 'bg-card border-border hover:border-rose-200'
                      )}
                    >
                      {r}
                    </button>
                  ))}
                  <button
                    onClick={() => setRejectionReason('Other')}
                    className={cn(
                      'w-full text-left px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                      rejectionReason === 'Other'
                        ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                        : 'bg-card border-border hover:border-rose-200'
                    )}
                  >
                    Other (custom reason)
                  </button>
                </div>

                {rejectionReason === 'Other' && (
                  <textarea
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 mb-4 resize-none"
                    rows={3}
                    placeholder="Enter custom rejection reason..."
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                  />
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsRejecting(false)}
                    className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-bold hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isUpdating || !rejectionReason}
                    className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 disabled:opacity-50"
                  >
                    {isUpdating ? 'Rejecting...' : 'Confirm Reject'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Request Correction Modal */}
      <AnimatePresence>
        {isRequestingCorrection && selectedPartner && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[60] cursor-pointer"
              onClick={() => setIsRequestingCorrection(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            >
              <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-amber-700 dark:text-amber-300 text-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> Request Onboarding Correction
                  </h3>
                  <button onClick={() => setIsRequestingCorrection(false)} className="p-1.5 hover:bg-muted rounded-lg">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-xs text-muted-foreground mb-4">
                  Specify details/documents that need to be corrected or re-uploaded by <strong className="text-foreground">{selectedPartner.labName}</strong>:
                </p>

                <textarea
                  className="w-full border border-input rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 mb-4 resize-none"
                  rows={4}
                  placeholder="e.g. Please re-upload a clear copy of your Bio-Medical Waste (BMW) Licence and update the state pincode..."
                  value={correctionReasonInput}
                  onChange={e => setCorrectionReasonInput(e.target.value)}
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsRequestingCorrection(false)}
                    className="flex-1 px-4 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestCorrectionSubmit}
                    disabled={isUpdating || !correctionReasonInput.trim()}
                    className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 disabled:opacity-50 shadow-sm"
                  >
                    {isUpdating ? 'Submitting...' : 'Send Correction Request'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* REPORT PREVIEW MODAL */}
      <AnimatePresence>
        {selectedReportItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-300 font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">
                      Diagnostic Lab Report — {selectedReportItem.patientName}
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      Booking Ref: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{selectedReportItem.bookingCode}</strong> • Official Diagnostic Report Template
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Zoom controls */}
                  <div className="hidden sm:flex items-center bg-card border border-border rounded-xl p-1 gap-1">
                    <button
                      onClick={() => setPreviewZoom(z => Math.max(0.4, z - 0.1))}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] font-bold text-foreground px-1 font-mono">{Math.round(previewZoom * 100)}%</span>
                    <button
                      onClick={() => setPreviewZoom(z => Math.min(1.2, z + 0.1))}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={handleDownloadReportPdf}
                    disabled={exportingPdf}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {exportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span>{exportingPdf ? 'Exporting PDF...' : 'Download PDF'}</span>
                  </button>

                  <button
                    onClick={() => setSelectedReportItem(null)}
                    className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body - Report Template Sheet */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-muted/20 flex justify-center items-start">
                <div id="admin-partner-report-preview-sheet" className="shadow-2xl rounded-sm">
                  <LiveReportPreview
                    template={customTemplate || {}}
                    patientData={patientReportData}
                    tests={testReportItems}
                    scale={previewZoom}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};