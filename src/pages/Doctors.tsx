import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/redux/hooks';
import { useRolesQuery, useAllPermissionsQuery, useBranchesQuery } from '@/hooks/useAdminQueries';
import { doctorService, commissionService, adminUserService, rbacService } from '@/services/api';
import { branchService, Branch } from '@/services/branch.service';
import { AdminRole, Permission } from '@/types/rbac';
import {
  Stethoscope, Plus, Pencil, Trash2, Search, X, Loader2,
  Building2, CheckCircle2, Clock, XCircle, ShieldAlert,
  FileSignature, Eye, EyeOff, UserCheck,
  DollarSign, Activity, TrendingUp, FileText, RefreshCw,
  Briefcase, CheckSquare, Square, ExternalLink, Upload
} from 'lucide-react';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

export interface DoctorRecord {
  id: string;
  name: string;
  code?: string;
  qualification: string;
  registrationNo: string;
  specialization?: string;
  designation?: string;
  photoUrl?: string;
  signatureUrl?: string;
  branchId?: string;
  partnerId?: string;
  commissionRate?: number;
  paymentCycle?: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectionReason?: string;
  isActive: boolean;
  doctorType?: 'DIRECT' | 'EMPLOYEE';
  user?: {
    id: string;
    name: string;
    email: string;
    mobile?: string;
  };
  branch?: {
    id: string;
    name: string;
    city: string;
    code?: string;
  };
  createdAt?: string;
}

const COMMON_SPECIALIZATIONS = [
  'Pathology',
  'Gynecology & Obstetrics',
  'Radiology',
  'Cardiology',
  'General Physician / Internal Medicine',
  'Pediatrics',
  'Dermatology',
  'Orthopedics',
  'Neurology',
  'Microbiology & Biochemistry',
];

const MODULE_PERMISSIONS: { module: string; label: string; actions: string[] }[] = [
  { module: 'dashboard', label: 'Dashboard', actions: ['view'] },
  { module: 'users', label: 'User Management', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'doctors', label: 'Doctor Management', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'staff', label: 'Employee & Staff', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'lab_tests', label: 'Test Catalog', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'packages', label: 'Packages', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'bookings', label: 'Bookings', actions: ['view', 'create', 'edit', 'delete', 'assign'] },
  { module: 'samples', label: 'Sample Queue', actions: ['view', 'edit', 'assign'] },
  { module: 'reports', label: 'Report Approval', actions: ['view', 'approve', 'edit', 'delete'] },
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

export const DoctorsPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAppSelector(state => state.auth.user);
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'SUPER_ADMIN' || (currentUser as any)?.isSuperAdmin;
  const isDoctorUser = (currentUser?.role as string) === 'DOCTOR' || (currentUser as any)?.roleSlug === 'doctor' || (currentUser as any)?.userType === 'DOCTOR';
  const userBranchId = (currentUser as any)?.branchId || (currentUser as any)?.adminUser?.branchId;

  const [activeView, setActiveView] = useState<'DIRECTORY' | 'PORTAL'>(isDoctorUser ? 'PORTAL' : 'DIRECTORY');
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [portalSearch, setPortalSearch] = useState('');
  const [specFilter, setSpecFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [approvalFilter, setApprovalFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'SUSPENDED'>('ALL');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [doctorCategoryFilter, setDoctorCategoryFilter] = useState<'ALL' | 'FREELANCER' | 'IN_HOUSE'>('ALL');

  // Portal View Specific State
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [portalPeriod, setPortalPeriod] = useState<'WEEKLY' | '15_DAYS' | '30_DAYS' | 'ALL'>('ALL');
  const [portalData, setPortalData] = useState<any>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DoctorRecord | null>(null);
  const [viewingDoctor, setViewingDoctor] = useState<DoctorRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewSignature, setPreviewSignature] = useState<DoctorRecord | null>(null);

  // Form State
  const [userType, setUserType] = useState<'STAFF' | 'DOCTOR' | 'EMPLOYEE' | 'ADMIN'>('DOCTOR');
  const [doctorType, setDoctorType] = useState<'DIRECT' | 'EMPLOYEE'>('EMPLOYEE');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formRoleId, setFormRoleId] = useState('');
  const [formBranchId, setFormBranchId] = useState('');
  const [formFranchiseId, setFormFranchiseId] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formQualification, setFormQualification] = useState('');
  const [formRegistrationNo, setFormRegistrationNo] = useState('');
  const [formSignatureUrl, setFormSignatureUrl] = useState('');
  const [signatureUploading, setSignatureUploading] = useState(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [formCommissionRate, setFormCommissionRate] = useState<number>(30);
  const [formPaymentCycle, setFormPaymentCycle] = useState<string>('MONTHLY');

  const handleSignatureFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset value so user can re-select same file if needed
    e.target.value = '';

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedTypes.includes(file.type) && !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      toast.error('Only JPG, JPEG, PNG, and WEBP image files are allowed.');
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      toast.error('Signature file size must be less than 5 MB.');
      return;
    }

    setSignatureUploading(true);
    try {
      const res = await doctorService.uploadSignature(file);
      if (res?.url) {
        setFormSignatureUrl(res.url);
        toast.success('Signature uploaded successfully');
      } else {
        throw new Error('No signature URL returned from server');
      }
    } catch (err: any) {
      console.error('Signature upload failed:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to upload signature image.');
    } finally {
      setSignatureUploading(false);
    }
  };

  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [customRoleName, setCustomRoleName] = useState('');

  const { data: rolesData } = useRolesQuery();
  const { data: permsData } = useAllPermissionsQuery();
  const { data: branchesData } = useBranchesQuery();

  useEffect(() => {
    if (rolesData) setRoles(rolesData.filter((r: AdminRole) => r.slug !== 'super_admin'));
    if (permsData) setAllPermissions(permsData);
    if (branchesData) setBranches(branchesData);
  }, [rolesData, permsData, branchesData]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [docRes, branchRes] = await Promise.allSettled([
        doctorService.getDoctors(),
        branchService.getAll(),
      ]);

      if (docRes.status === 'fulfilled' && Array.isArray(docRes.value)) {
        setDoctors(docRes.value);
        if (docRes.value.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(docRes.value[0].id);
        }
      }
      if (branchRes.status === 'fulfilled' && branchRes.value?.data) {
        setBranches(branchRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load doctors data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorPortal = async (docId?: string, period = portalPeriod) => {
    const targetId = isDoctorUser ? undefined : (docId || selectedDoctorId);
    setPortalLoading(true);
    try {
      const res = await commissionService.getDoctorPortalData(period, targetId);
      setPortalData(res);
      if (res?.doctor?.id && !selectedDoctorId) {
        setSelectedDoctorId(res.doctor.id);
      }
    } catch (err) {
      console.error('Failed to load doctor portal data:', err);
    } finally {
      setPortalLoading(false);
    }
  };

  useEffect(() => {
    if (!isDoctorUser) {
      loadData();
    }
  }, [isDoctorUser]);

  useEffect(() => {
    if (activeView === 'PORTAL' || isDoctorUser) {
      loadDoctorPortal(isDoctorUser ? undefined : selectedDoctorId, portalPeriod);
    }
  }, [activeView, isDoctorUser, selectedDoctorId, portalPeriod]);

  const openPortalForDoctor = (doc: DoctorRecord) => {
    setSelectedDoctorId(doc.id);
    setActiveView('PORTAL');
    loadDoctorPortal(doc.id, portalPeriod);
  };

  const openCreate = (defaultType: 'DOCTOR' | 'EMPLOYEE' | 'STAFF' | 'ADMIN' = 'DOCTOR') => {
    setEditing(null);
    setUserType(defaultType);
    setFormName('');
    setFormEmail('');
    setFormMobile('');
    setFormPassword('');
    setShowPassword(false);
    setFormBranchId(userBranchId || '');
    setFormFranchiseId('');
    setFormDepartment(defaultType === 'EMPLOYEE' ? 'Pathology Lab' : '');
    setFormDesignation(defaultType === 'DOCTOR' ? 'Consultant Pathologist' : (defaultType === 'EMPLOYEE' ? 'Lab Technician' : ''));
    setFormQualification(defaultType === 'DOCTOR' ? 'MBBS, MD (Pathology)' : '');
    setFormRegistrationNo('');
    setFormSignatureUrl('');
    setDoctorType('EMPLOYEE');
    setFormCommissionRate(0);
    setFormPaymentCycle('MONTHLY');
    setSelectedPerms(new Set());
    setIsCustomRole(false);
    setCustomRoleName('');

    if (defaultType === 'DOCTOR') {
      const docRole = roles.find(r => r.name.toLowerCase().includes('pathologist') || r.slug.includes('pathologist'));
      setFormRoleId(docRole?.id || roles[0]?.id || '');
    } else {
      setFormRoleId(roles[0]?.id || '');
    }

    setModalOpen(true);
  };

  const openEdit = (d: DoctorRecord) => {
    setEditing(d);
    setUserType('DOCTOR');
    setFormName(d.name);
    setFormEmail(d.user?.email || (d as any).email || '');
    setFormMobile(d.user?.mobile || (d as any).mobile || '');
    setFormPassword('');
    setShowPassword(false);
    setFormRegistrationNo(d.registrationNo || '');
    setFormQualification(d.qualification || 'MBBS, MD (Pathology)');
    setFormDesignation(d.designation || 'Consultant Pathologist');
    setFormBranchId(d.branchId || (d.branch?.id) || '');
    setFormSignatureUrl(d.signatureUrl || '');
    setDoctorType(d.doctorType || 'EMPLOYEE');
    setFormCommissionRate(d.commissionRate !== undefined && d.commissionRate !== null ? Number(d.commissionRate) : (d.doctorType === 'DIRECT' ? 30 : 0));
    setFormPaymentCycle(d.paymentCycle || 'MONTHLY');
    setFormFranchiseId('');
    setFormDepartment('');

    // Prepopulate existing role and permissions
    const existingRoleId = (d.user as any)?.adminUser?.roleId || (d.user as any)?.adminUser?.role?.id || (d as any).roleId || (d as any).role?.id;
    const matchedRole = roles.find(r => r.id === existingRoleId) || roles.find(r => r.name.toLowerCase().includes('pathologist') || r.slug.includes('pathologist')) || roles[0];
    const currentRoleId = matchedRole?.id || existingRoleId || '';
    setFormRoleId(currentRoleId);

    const activeRole = roles.find(r => r.id === currentRoleId) || (d.user as any)?.adminUser?.role || matchedRole;
    if (activeRole) {
      const perms = new Set<string>(
        ((activeRole as any)?.permissions || []).map((rp: any) => String(rp.permission?.id || rp.permissionId || rp.id))
      );
      setSelectedPerms(perms);
    } else {
      setSelectedPerms(new Set<string>());
    }

    setIsCustomRole(false);
    setCustomRoleName('');
    setModalOpen(true);
  };

  const handleUserTypeChange = (type: 'STAFF' | 'DOCTOR' | 'EMPLOYEE' | 'ADMIN') => {
    setUserType(type);
    if (type === 'DOCTOR') {
      if (!formDesignation) setFormDesignation('Senior Pathologist');
      if (!formQualification) setFormQualification('MBBS, MD (Pathology)');
      const docRole = roles.find(r => r.name.toLowerCase().includes('pathologist') || r.slug.includes('pathologist'));
      if (docRole) setFormRoleId(docRole.id);
    } else if (type === 'EMPLOYEE') {
      if (!formDesignation) setFormDesignation('Lab Technician');
      if (!formDepartment) setFormDepartment('Biochemistry / Hematology');
    }
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
    if (!modDef) return;
    const modulePerms = allPermissions.filter(p =>
      (p.module === moduleKey || (moduleKey === 'lab_tests' && p.module === 'tests') || (moduleKey === 'audit_logs' && p.module === 'logs')) &&
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
    if (roleId === 'custom') {
      setIsCustomRole(true);
      setFormRoleId('');
      setSelectedPerms(new Set<string>());
      return;
    }
    setIsCustomRole(false);
    setFormRoleId(roleId);
    const role = roles.find(r => r.id === roleId);
    if (role) {
      const perms = new Set<string>(
        ((role as any).permissions || []).map((rp: any) => String(rp.permission?.id || rp.permissionId || rp.id))
      );
      setSelectedPerms(perms);
    }
  };

  const handleSave = async () => {
    if (!formName) {
      toast.error('Doctor Name is required');
      return;
    }
    if (!editing && !formEmail) {
      toast.error('Email Address is required');
      return;
    }
    if (!editing && !formPassword) {
      toast.error('Password is required');
      return;
    }
    if (formMobile && !/^[6-9]\d{9}$/.test(formMobile.trim())) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    if (userType === 'DOCTOR' && !formRegistrationNo) {
      toast.error('Doctor Registration Number is required');
      return;
    }
    if (isCustomRole && !customRoleName.trim()) {
      toast.error('Enter a name for the custom role');
      return;
    }

    setSaving(true);
    try {
      let roleId = formRoleId;
      if (isCustomRole) {
        try {
          const newRole = await rbacService.createRole({
            name: customRoleName.trim(),
            description: `Custom role for ${formName}`,
            permissionIds: Array.from(selectedPerms),
          });
          roleId = newRole.id;
        } catch (rErr) {
          console.warn('Custom role create error:', rErr);
        }
      }

      const payload: any = {
        name: formName,
        email: formEmail.trim() || undefined,
        mobile: formMobile.trim() || undefined,
        roleId: roleId || undefined,
        userType,
        branchId: formBranchId || undefined,
        franchiseId: formFranchiseId || undefined,
        department: formDepartment || undefined,
        designation: formDesignation || undefined,
        qualification: formQualification || undefined,
        registrationNo: formRegistrationNo || undefined,
        signatureUrl: formSignatureUrl || undefined,
        doctorType: userType === 'DOCTOR' ? (editing ? (doctorType || 'EMPLOYEE') : 'EMPLOYEE') : undefined,
        commissionRate: doctorType === 'DIRECT' ? Number(formCommissionRate || 0) : 0,
        paymentCycle: doctorType === 'DIRECT' ? (formPaymentCycle || 'MONTHLY') : 'MONTHLY',
      };
      if (formPassword) payload.password = formPassword;

      if (editing) {
        await doctorService.updateDoctor(editing.id, payload);
        toast.success('Doctor updated successfully');
      } else {
        await doctorService.createDoctor({
          ...payload,
          approvalStatus: 'PENDING',
          isActive: false,
        });
        toast.success('Doctor added in Pending Review. Please approve to activate.');
      }
      setModalOpen(false);
      loadData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to save doctor');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (d: DoctorRecord) => {
    if (d.approvalStatus === 'PENDING') {
      toast.error('Doctor must be approved before activating account.');
      return;
    }
    if (d.approvalStatus === 'SUSPENDED') {
      toast.error('Doctor is suspended. Please reactivate approval status first.');
      return;
    }
    try {
      await doctorService.updateDoctor(d.id, { isActive: !d.isActive });
      toast.success(d.isActive ? 'Doctor marked inactive' : 'Doctor activated');
      setDoctors(prev => prev.map(doc => doc.id === d.id ? { ...doc, isActive: !d.isActive } : doc));
      loadData();
    } catch {
      toast.error('Failed to update active status');
    }
  };

  const handleSuspendDoctor = async (d: DoctorRecord) => {
    if (!confirm(`Are you sure you want to suspend Dr. ${d.name}? The doctor will not be able to access the portal.`)) return;
    try {
      await doctorService.updateDoctor(d.id, { approvalStatus: 'SUSPENDED', isActive: false });
      toast.success(`Dr. ${d.name} suspended.`);
      setDoctors(prev => prev.map(doc => doc.id === d.id ? { ...doc, approvalStatus: 'SUSPENDED', isActive: false } : doc));
      loadData();
    } catch {
      toast.error('Failed to suspend doctor');
    }
  };

  const handleApproveDoctor = async (d: DoctorRecord) => {
    try {
      await doctorService.updateDoctor(d.id, { approvalStatus: 'APPROVED', isActive: true });
      toast.success(`Dr. ${d.name} approved successfully!`);
      setDoctors(prev => prev.map(doc => doc.id === d.id ? { ...doc, approvalStatus: 'APPROVED', isActive: true } : doc));
      loadData();
    } catch {
      toast.error('Failed to approve doctor');
    }
  };

  const handleRejectDoctor = async (d: DoctorRecord) => {
    if (!confirm(`Are you sure you want to reject doctor application for Dr. ${d.name}?`)) return;
    try {
      await doctorService.updateDoctor(d.id, { approvalStatus: 'REJECTED', isActive: false });
      toast.success(`Dr. ${d.name} application rejected.`);
      setDoctors(prev => prev.map(doc => doc.id === d.id ? { ...doc, approvalStatus: 'REJECTED', isActive: false } : doc));
      loadData();
    } catch {
      toast.error('Failed to reject doctor');
    }
  };

  const handleDelete = async (d: DoctorRecord) => {
    if (!confirm(`Are you sure you want to delete Dr. ${d.name}?`)) return;
    try {
      await doctorService.deleteDoctor(d.id);
      toast.success('Doctor deleted successfully');
      setDoctors(prev => prev.filter(doc => doc.id !== d.id));
      loadData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to delete doctor');
    }
  };

  const accessibleBranches = useMemo(() => {
    if (!isSuperAdmin && userBranchId) {
      return branches.filter(b => b.id === userBranchId);
    }
    return branches;
  }, [branches, isSuperAdmin, userBranchId]);

  const uniqueLocations = useMemo(() => {
    const locs = accessibleBranches
      .map(b => b.city)
      .filter((c): c is string => Boolean(c && c.trim()));
    return Array.from(new Set(locs)).sort((a, b) => a.localeCompare(b));
  }, [accessibleBranches]);

  const locationFilteredBranches = useMemo(() => {
    if (locationFilter === 'ALL') return accessibleBranches;
    return accessibleBranches.filter(b => (b.city || '').toLowerCase() === locationFilter.toLowerCase());
  }, [accessibleBranches, locationFilter]);

  useEffect(() => {
    if (!isSuperAdmin && userBranchId) {
      setBranchFilter(userBranchId);
      const myBranch = branches.find(b => b.id === userBranchId);
      if (myBranch?.city) {
        setLocationFilter(myBranch.city);
      }
    }
  }, [isSuperAdmin, userBranchId, branches]);

  const baseDoctors = useMemo(() => {
    if (!isSuperAdmin && userBranchId) {
      return doctors.filter(d => d.branchId === userBranchId || d.branch?.id === userBranchId);
    }
    return doctors;
  }, [doctors, isSuperAdmin, userBranchId]);

  const filteredDoctors = useMemo(() => {
    return baseDoctors.filter(d => {
      // Category filter: Freelancer (App) vs In-House
      if (doctorCategoryFilter === 'FREELANCER' && d.doctorType !== 'DIRECT') return false;
      if (doctorCategoryFilter === 'IN_HOUSE' && d.doctorType === 'DIRECT') return false;

      const appStatus = d.approvalStatus || 'PENDING';
      if (approvalFilter !== 'ALL' && appStatus !== approvalFilter) return false;
      if (activeFilter === 'ACTIVE' && !d.isActive) return false;
      if (activeFilter === 'INACTIVE' && d.isActive) return false;
      if (specFilter !== 'ALL' && d.specialization !== specFilter) return false;

      // Location / City filter
      if (locationFilter !== 'ALL') {
        const docBranch = branches.find(b => b.id === d.branchId || b.id === d.branch?.id) || d.branch;
        if (!docBranch || (docBranch.city || '').toLowerCase() !== locationFilter.toLowerCase()) {
          return false;
        }
      }

      // Specific Branch filter
      if (branchFilter !== 'ALL' && d.branchId !== branchFilter && d.branch?.id !== branchFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.registrationNo.toLowerCase().includes(q) ||
          d.qualification.toLowerCase().includes(q) ||
          (d.code && d.code.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [baseDoctors, branches, doctorCategoryFilter, approvalFilter, activeFilter, specFilter, locationFilter, branchFilter, search]);

  const filteredReferrals = useMemo(() => {
    if (!portalData?.referrals) return [];
    if (!portalSearch.trim()) return portalData.referrals;
    const q = portalSearch.toLowerCase();
    return portalData.referrals.filter((item: any) =>
      item.patientName?.toLowerCase().includes(q) ||
      item.bookingCode?.toLowerCase().includes(q) ||
      item.patientMobile?.includes(q) ||
      item.tests?.some((t: any) => t.name?.toLowerCase().includes(q))
    );
  }, [portalData?.referrals, portalSearch]);

  return (
    <div className="space-y-6">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-500/20 text-teal-600 flex items-center justify-center font-bold shadow-sm shrink-0">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {isDoctorUser ? 'Doctor Portal Dashboard' : 'Doctor Management & Portal'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isDoctorUser
                ? 'Your referred patients, diagnostic tests, 30% commission payouts & verified lab reports'
                : 'Manage doctor profiles, referred samples, test-wise 30% commissions & lab reports'}
            </p>
          </div>
        </div>

        {!isDoctorUser && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('/doctor-portal/login')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/80 text-xs font-bold transition-all shadow-sm"
              title="Open Doctor Login Portal"
            >
              <Stethoscope className="w-3.5 h-3.5" /> Doctor Portal Login
            </button>

            <button
              onClick={() => openCreate('DOCTOR')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors shadow-md shadow-teal-600/20"
            >
              <Plus className="w-4 h-4" /> Add Doctor
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: PORTAL VIEW */}
      {activeView === 'PORTAL' ? (
        <div className="space-y-6">
          {/* Top Control Bar (NO dropdown of all doctors) */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {!isDoctorUser && (
                <button
                  onClick={() => setActiveView('DIRECTORY')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/60 hover:bg-muted border border-border text-xs font-bold text-foreground transition-all shadow-sm"
                >
                  ← Back to Doctor Directory
                </button>
              )}
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 text-teal-800 dark:text-teal-200 text-xs font-bold">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                <span>
                  Dr. {portalData?.doctor?.name || doctors.find(d => d.id === selectedDoctorId)?.name || 'Doctor'}
                </span>
                <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-teal-200/50 dark:bg-teal-900/80 text-teal-900 dark:text-teal-100">
                  {portalData?.doctor?.code || doctors.find(d => d.id === selectedDoctorId)?.code || 'DOC'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
                      loadDoctorPortal(isDoctorUser ? undefined : selectedDoctorId, tab.id as any);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      portalPeriod === tab.id
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => loadDoctorPortal(isDoctorUser ? undefined : selectedDoctorId, portalPeriod)}
                className="p-2 rounded-xl bg-card border border-border hover:bg-muted text-foreground transition-colors"
                title="Refresh Portal Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${portalLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Doctor Overview Banner */}
          <div className="bg-gradient-to-r from-teal-900/10 via-card to-card border border-teal-500/30 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">Referred Diagnostics & Commissions</div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground">
                Dr. {portalData?.doctor?.name || doctors.find(d => d.id === selectedDoctorId)?.name || 'Doctor'}
              </h2>
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 pt-0.5">
                <span className="font-semibold text-foreground">{portalData?.doctor?.qualification || 'MBBS, MD'}</span>
                <span>•</span>
                <span>{portalData?.doctor?.specialization || 'Clinical Pathology'}</span>
                <span>•</span>
                <span>Reg: <strong className="text-foreground">{portalData?.doctor?.registrationNo || 'MCI-REG'}</strong></span>
                {portalData?.doctor?.branch?.name && (
                  <>
                    <span>•</span>
                    <span className="text-teal-700 dark:text-teal-300 font-medium">{portalData.doctor.branch.name}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-900/60 rounded-xl px-4 py-2.5 text-center">
                <div className="text-[10px] font-bold uppercase text-teal-700 dark:text-teal-300">Commission Rate</div>
                <div className="text-xl font-black text-teal-800 dark:text-teal-200">{portalData?.summary?.commissionRate ?? 30}%</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 rounded-xl px-4 py-2.5 text-center">
                <div className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300">Payment Cycle</div>
                <div className="text-xl font-black text-blue-800 dark:text-blue-200">{portalData?.summary?.paymentCycle || 'MONTHLY'}</div>
              </div>
            </div>
          </div>

          {/* 4 KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Referred Patients</span>
                <Activity className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-black text-foreground">{portalData?.summary?.totalReferredSamples ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{portalData?.summary?.totalTestsCount ?? 0} Total Tests Conducted</div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Diagnostic Turnover</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-foreground">₹{(portalData?.summary?.totalBilledAmount ?? 0).toLocaleString('en-IN')}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Total Billed Diagnostic Value</div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-emerald-600 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Calculated Commission</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-600">₹{(portalData?.summary?.totalCommissionEarned ?? 0).toLocaleString('en-IN')}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Earned @ {portalData?.summary?.commissionRate ?? 30}% Rate</div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Payout Balance</span>
                <CheckCircle2 className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-xs text-emerald-600 font-bold">₹{(portalData?.summary?.paidCommission ?? 0).toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-muted-foreground font-semibold">Paid</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-amber-600 font-bold">₹{(portalData?.summary?.unpaidCommission ?? 0).toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-muted-foreground font-semibold">Unpaid (Pending)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Referred Samples Table with Search */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 bg-muted/40 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" /> Doctor Referred Samples & Diagnostic Reports
              </h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search patient, test, ref..."
                    value={portalSearch}
                    onChange={e => setPortalSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-teal-500 w-48 sm:w-56"
                  />
                </div>
                <div className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                  {filteredReferrals.length} Referrals
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Patient Name</th>
                    <th className="py-3 px-4">Tests Ordered</th>
                    <th className="py-3 px-4 text-right">Billed Amount</th>
                    <th className="py-3 px-4 text-right">Commission ({portalData?.summary?.commissionRate ?? 30}%)</th>
                    <th className="py-3 px-4 text-center">Payout Status</th>
                    <th className="py-3 px-4 text-center">Lab Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {portalLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2 text-teal-600" /> Loading referral records...
                      </td>
                    </tr>
                  ) : !filteredReferrals || filteredReferrals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-muted-foreground">
                        {portalSearch ? `No referrals matching "${portalSearch}"` : 'No referred samples found for this doctor in this cycle period.'}
                      </td>
                    </tr>
                  ) : (
                    filteredReferrals.map((item: any) => (
                      <tr key={item.bookingId} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-700 dark:text-teal-400">
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

                        <td className="py-3.5 px-4 text-right font-bold text-emerald-600 font-mono">
                          +₹{item.commissionAmount?.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            item.payoutStatus === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            ● {item.payoutStatus}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {item.report ? (
                            <a
                              href={item.report.verificationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 text-teal-700 dark:text-teal-300 text-xs font-bold hover:bg-teal-100 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" /> View Report
                            </a>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Processing</span>
                          )}
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
        /* VIEW 2: DOCTOR DIRECTORY */
        <>
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card border border-border rounded-xl p-3">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Doctor Category Tabs (Freelancer vs In-House) */}
              <div className="flex items-center gap-1 bg-muted/80 p-1 rounded-xl border border-border">
                {[
                  { id: 'ALL', label: `All Doctors (${baseDoctors.length})` },
                  { id: 'FREELANCER', label: `App Freelancers (${baseDoctors.filter(d => d.doctorType === 'DIRECT').length})` },
                  { id: 'IN_HOUSE', label: `In-House Doctors (${baseDoctors.filter(d => d.doctorType !== 'DIRECT').length})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDoctorCategoryFilter(tab.id as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      doctorCategoryFilter === tab.id
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Approval Filter Tabs */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border">
                {[
                  { id: 'ALL', label: `All (${baseDoctors.length})` },
                  { id: 'APPROVED', label: `Approved (${baseDoctors.filter(d => d.approvalStatus === 'APPROVED').length})` },
                  { id: 'PENDING', label: `Pending (${baseDoctors.filter(d => (d.approvalStatus || 'PENDING') === 'PENDING').length})` },
                  { id: 'SUSPENDED', label: `Suspended (${baseDoctors.filter(d => d.approvalStatus === 'SUSPENDED').length})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setApprovalFilter(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      approvalFilter === tab.id
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <select
                value={activeFilter}
                onChange={e => setActiveFilter(e.target.value as any)}
                className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 outline-none font-medium text-foreground"
              >
                <option value="ALL">All Status (Active & Inactive)</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>

              <select
                value={specFilter}
                onChange={e => setSpecFilter(e.target.value)}
                className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 outline-none font-medium text-foreground"
              >
                <option value="ALL">All Specializations</option>
                {COMMON_SPECIALIZATIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {/* Location / City Filter */}
              <select
                value={locationFilter}
                onChange={e => {
                  const newLoc = e.target.value;
                  setLocationFilter(newLoc);
                  if (newLoc !== 'ALL') {
                    const isStillValid = locationFilteredBranches.some(b => b.id === branchFilter && (b.city || '').toLowerCase() === newLoc.toLowerCase());
                    if (!isStillValid) setBranchFilter('ALL');
                  }
                }}
                className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 outline-none font-medium text-foreground"
              >
                {isSuperAdmin && <option value="ALL">All Locations / Cities</option>}
                {uniqueLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>

              {/* Branch Filter */}
              <select
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
                className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 outline-none font-medium text-foreground"
              >
                {isSuperAdmin && (
                  <option value="ALL">
                    {locationFilter === 'ALL' ? 'All Branches / Partners' : `All ${locationFilter} Branches`}
                  </option>
                )}
                {locationFilteredBranches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
                ))}
              </select>
            </div>

            <div className="w-full md:w-64">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search doctors, reg no..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg outline-none focus:border-teal-500 text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Doctors Table */}
          {loading ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-teal-600" /> Loading doctor directory...
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="py-3 px-5">Doctor Details</th>
                    <th className="py-3 px-4">Specialization & Role</th>
                    <th className="py-3 px-4">Branch / Area</th>
                    <th className="py-3 px-4 text-center">Digital Signature</th>
                    <th className="py-3 px-4 text-center">Approval Status</th>
                    <th className="py-3 px-4 text-center">Account Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDoctors.map(d => (
                    <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-5">
                        <div
                          onClick={() => setViewingDoctor(d)}
                          className="flex items-center gap-3 cursor-pointer group"
                          title="Click to view doctor details"
                        >
                          <div className="w-9 h-9 rounded-full bg-teal-50 dark:bg-teal-950/50 border border-teal-500/20 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center text-xs flex-shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                            {d.photoUrl ? (
                              <img src={d.photoUrl} alt={d.name} className="w-full h-full object-cover" />
                            ) : (
                              `Dr.`
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-foreground text-sm group-hover:text-teal-600 transition-colors">Dr. {d.name}</div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                              <span className="font-mono text-teal-600 dark:text-teal-400 font-semibold">{d.registrationNo}</span>
                              <span>•</span>
                              <span>{d.qualification}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/60 inline-block">
                            {d.specialization || 'Pathology'}
                          </span>
                          {d.doctorType === 'DIRECT' ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 inline-flex items-center gap-1">
                              App Freelancer ({d.commissionRate ?? 30}% Comm)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 inline-block">
                              In-House Doctor
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{d.designation || 'Senior Consultant'}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{d.branch?.name || 'All Branches'}</div>
                        <div className="text-[10px] text-muted-foreground">{d.branch?.city || 'Central Lab'}</div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {d.signatureUrl ? (
                          <button
                            onClick={() => setPreviewSignature(d)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 text-teal-700 dark:text-teal-300 text-[10px] font-bold hover:bg-teal-100 transition-colors cursor-pointer"
                          >
                            <FileSignature className="w-3.5 h-3.5" /> View Signature
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                            Digital Stamp
                          </span>
                        )}
                      </td>

                      {/* Column 5: Approval Status */}
                      <td className="py-3.5 px-4 text-center">
                        {d.approvalStatus === 'PENDING' || !d.approvalStatus ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                              <Clock className="w-2.5 h-2.5" /> Pending Review
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleApproveDoctor(d)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                                title="Approve Doctor Application"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Approve
                              </button>
                              <button
                                onClick={() => handleRejectDoctor(d)}
                                className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-[11px] font-bold border border-rose-200 transition-all active:scale-95 cursor-pointer"
                                title="Reject Doctor Application"
                              >
                                <XCircle className="w-3 h-3" /> Reject
                              </button>
                            </div>
                          </div>
                        ) : d.approvalStatus === 'SUSPENDED' ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200">
                              <ShieldAlert className="w-3 h-3" /> Suspended
                            </span>
                            <button
                              onClick={() => handleApproveDoctor(d)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                              title="Reactivate / Approve Doctor"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Reactivate
                            </button>
                          </div>
                        ) : d.approvalStatus === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Approved
                            </span>
                            <button
                              onClick={() => handleSuspendDoctor(d)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 text-[10px] font-semibold border border-orange-200/80 transition-all active:scale-95 cursor-pointer"
                              title="Suspend Doctor Account"
                            >
                              <ShieldAlert className="w-2.5 h-2.5" /> Suspend
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Column 6: Account Status & Portal */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {d.approvalStatus === 'PENDING' || !d.approvalStatus ? (
                            <span className="text-[10px] text-muted-foreground font-medium italic">
                              ○ Inactive (Pending)
                            </span>
                          ) : d.approvalStatus === 'SUSPENDED' ? (
                            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
                              ○ Inactive (Suspended)
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleActive(d)}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                                d.isActive
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
                              }`}
                              title={d.isActive ? 'Click to deactivate doctor' : 'Click to activate doctor'}
                            >
                              {d.isActive ? '● Active' : '○ Inactive'}
                            </button>
                          )}

                          <button
                            onClick={() => openPortalForDoctor(d)}
                            className="text-[10px] font-bold text-teal-600 hover:underline flex items-center gap-1"
                          >
                            <Activity className="w-3 h-3" /> View Portal
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingDoctor(d)}
                            className="p-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950/50 text-muted-foreground hover:text-teal-600 transition-colors cursor-pointer"
                            title="View Doctor Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEdit(d)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Edit Doctor"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(d)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                            title="Delete Doctor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal for Creating / Editing Doctor (Exact same as Admin Users) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal-600" />
                {editing ? 'Edit Doctor Profile' : 'Add New Doctor'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Doctor Category Indicator */}
              <div className="p-3 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/60 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-600/10 text-teal-600 flex items-center justify-center font-bold">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-teal-950 dark:text-teal-200">Doctor / Pathologist Account</div>
                    <div className="text-[10px] text-teal-700/80 dark:text-teal-400">Adds Doctor profile with Medical Reg No, Signature & Diagnostic Portal Access</div>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
                  Doctor Login Enabled
                </span>
              </div>

              {/* Primary User Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Full Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder={userType === 'DOCTOR' ? 'e.g. Dr. Anjali Mehta' : 'e.g. Rahul Sharma'}
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Email Address *</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="e.g. doctor@medsseva.com"
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Mobile Number</label>
                  <input
                    type="tel"
                    value={formMobile}
                    onChange={e => setFormMobile(e.target.value)}
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    {editing ? 'New Password (leave blank to keep)' : 'Password *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formPassword}
                      onChange={e => setFormPassword(e.target.value)}
                      placeholder={editing ? 'Leave blank to keep current' : 'Min 8 characters'}
                      className="w-full h-10 pl-3 pr-10 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Conditional Doctor-Specific Fields */}
              {userType === 'DOCTOR' && (
                <div className="bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/60 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5 uppercase">
                    <Stethoscope className="w-4 h-4" /> Doctor & Clinical Verification Details
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">Medical Registration No. *</label>
                      <input
                        type="text"
                        value={formRegistrationNo}
                        onChange={e => setFormRegistrationNo(e.target.value)}
                        placeholder="e.g. MCI-44922 / MMC-12345"
                        className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">Qualification</label>
                      <input
                        type="text"
                        value={formQualification}
                        onChange={e => setFormQualification(e.target.value)}
                        placeholder="e.g. MBBS, MD (Pathology)"
                        className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">Designation</label>
                      <input
                        type="text"
                        value={formDesignation}
                        onChange={e => setFormDesignation(e.target.value)}
                        placeholder="e.g. Senior Consultant Pathologist"
                        className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/30"
                      />
                    </div>
                    {/* Conditional Doctor Category / Commission Section */}
                    {doctorType === 'DIRECT' ? (
                      <div className="md:col-span-2 p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                            Freelancer Doctor - Referral Commission Settings
                          </span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                            App Registered Doctor
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="text-xs font-semibold text-foreground mb-1 block">
                              Commission Rate (%) *
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step="0.5"
                                value={formCommissionRate}
                                onChange={e => setFormCommissionRate(Math.max(0, Math.min(100, Number(e.target.value))))}
                                placeholder="30"
                                className="w-full h-10 px-3 pr-8 bg-background border border-emerald-300 dark:border-emerald-700 rounded-xl text-sm font-bold text-emerald-700 dark:text-emerald-300 outline-none focus:ring-2 focus:ring-emerald-500/30"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Tests referred by this doctor will be credited at this percentage.
                            </p>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-foreground mb-1 block">Payout Cycle</label>
                            <select
                              value={formPaymentCycle}
                              onChange={e => setFormPaymentCycle(e.target.value)}
                              className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
                            >
                              <option value="WEEKLY">Weekly Payout</option>
                              <option value="15_DAYS">15 Days (Fortnightly)</option>
                              <option value="MONTHLY">Monthly Settlement</option>
                            </select>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Frequency of commission invoice settlement.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">Doctor Type</label>
                        <div className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl text-xs font-semibold text-teal-800 dark:text-teal-300 flex items-center">
                          Internal Employee / Pathologist (Salaried)
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">Assign Branch / Area</label>
                      <select
                        value={formBranchId}
                        onChange={e => setFormBranchId(e.target.value)}
                        className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/30"
                      >
                        <option value="">All Branches / Central</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <FileSignature className="h-4 w-4 text-teal-600" />
                          Doctor Signature (Upload / URL)
                        </label>
                        {formSignatureUrl && (
                          <button
                            type="button"
                            onClick={() => setFormSignatureUrl('')}
                            className="text-[11px] text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" /> Remove Signature
                          </button>
                        )}
                      </div>

                      <input
                        type="file"
                        ref={signatureInputRef}
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleSignatureFileSelect}
                        className="hidden"
                      />

                      {formSignatureUrl ? (
                        <div className="p-3 bg-muted/40 border border-border rounded-xl flex flex-col sm:flex-row items-center gap-4">
                          <div className="bg-white border border-slate-200 rounded-lg p-2 min-w-[140px] max-w-[200px] h-20 flex items-center justify-center shadow-xs">
                            <img
                              src={formSignatureUrl}
                              alt="Doctor Signature Preview"
                              className="max-h-16 max-w-full object-contain"
                              crossOrigin="anonymous"
                            />
                          </div>
                          <div className="flex-1 text-center sm:text-left space-y-1">
                            <div className="text-xs font-bold text-emerald-600 flex items-center gap-1 justify-center sm:justify-start">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Signature Attached & Active
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate max-w-xs">{formSignatureUrl}</p>
                            <div className="flex items-center gap-2 justify-center sm:justify-start pt-1">
                              <button
                                type="button"
                                disabled={signatureUploading}
                                onClick={() => signatureInputRef.current?.click()}
                                className="px-2.5 py-1 text-xs font-semibold bg-background border border-border hover:bg-muted rounded-lg flex items-center gap-1 transition-colors"
                              >
                                {signatureUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3 text-teal-600" />}
                                Replace Signature
                              </button>
                              <a
                                href={formSignatureUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" /> View Full
                              </a>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => !signatureUploading && signatureInputRef.current?.click()}
                          className={cn(
                            "border-2 border-dashed border-border hover:border-teal-500/60 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40",
                            signatureUploading && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          {signatureUploading ? (
                            <div className="flex flex-col items-center gap-2 py-2">
                              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                              <span className="text-xs font-semibold text-muted-foreground">Uploading signature image...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1 py-1">
                              <div className="h-9 w-9 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center mb-1">
                                <Upload className="h-4 w-4" />
                              </div>
                              <span className="text-xs font-bold text-foreground">Click to upload doctor signature</span>
                              <span className="text-[11px] text-muted-foreground">Upload from Files / Gallery (PNG, JPG, WEBP • Max 5MB)</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="pt-1">
                        <input
                          type="text"
                          value={formSignatureUrl}
                          onChange={e => setFormSignatureUrl(e.target.value)}
                          placeholder="Or paste direct image URL (e.g. https://res.cloudinary.com/.../signature.png)"
                          className="w-full h-8 px-3 bg-background border border-border/70 rounded-lg text-xs outline-none focus:ring-1 focus:ring-teal-500/30 text-muted-foreground"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        This signature image will appear on generated diagnostic reports in place of the generic digital signature stamp. If blank, standard digital signature stamp will be used.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Employee-Specific Fields */}
              {userType === 'EMPLOYEE' && (
                <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5 uppercase">
                    <Briefcase className="w-4 h-4" /> Employee Department & Branch
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">Designation</label>
                      <input
                        type="text"
                        value={formDesignation}
                        onChange={e => setFormDesignation(e.target.value)}
                        placeholder="e.g. Lab Technician / Phlebotomist"
                        className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">Department</label>
                      <input
                        type="text"
                        value={formDepartment}
                        onChange={e => setFormDepartment(e.target.value)}
                        placeholder="e.g. Biochemistry / Hematology"
                        className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-foreground mb-1 block">Assign Branch / Area</label>
                      <select
                        value={formBranchId}
                        onChange={e => setFormBranchId(e.target.value)}
                        className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                      >
                        <option value="">Select Branch</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Role & Franchise Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Access Role *</label>
                  <select
                    value={isCustomRole ? 'custom' : formRoleId}
                    onChange={e => handleRoleChange(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select a role</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                    <option value="custom">+ Create Custom Role</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Franchise ID (optional)</label>
                  <input
                    type="text"
                    value={formFranchiseId}
                    onChange={e => setFormFranchiseId(e.target.value)}
                    placeholder="e.g. MUM-CENT-01"
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {isCustomRole && (
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Custom Role Name *</label>
                  <input
                    type="text"
                    value={customRoleName}
                    onChange={e => setCustomRoleName(e.target.value)}
                    placeholder="e.g. Pathologist Verifier"
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              )}

              {/* Permissions Matrix */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-foreground">Permissions Matrix</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedPerms(new Set(allPermissions.map(p => p.id)))}
                      className="text-xs text-primary hover:underline font-medium"
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

                <div className="space-y-2 border border-border rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  {MODULE_PERMISSIONS.map(mod => {
                    const modulePerms = allPermissions.filter(p =>
                      (p.module === mod.module || (mod.module === 'lab_tests' && p.module === 'tests') || (mod.module === 'audit_logs' && p.module === 'logs')) &&
                      mod.actions.some(act => act === p.action || (act === 'edit' && p.action === 'update') || (act === 'update' && p.action === 'edit'))
                    );
                    const allSelected = modulePerms.length > 0 && modulePerms.every(p => selectedPerms.has(p.id));
                    return (
                      <div key={mod.module} className="border-b border-border/50 last:border-0">
                        <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
                          <span className="text-xs font-semibold text-foreground">{mod.label}</span>
                          <button
                            type="button"
                            onClick={() => toggleModuleAll(mod.module)}
                            className="text-[10px] text-primary hover:underline"
                          >
                            {allSelected ? 'Deselect all' : 'Select all'}
                          </button>
                        </div>
                        <div className="px-4 py-1.5 flex flex-wrap gap-2.5">
                          {mod.actions.map(action => {
                            const perm = allPermissions.find(p =>
                              (p.module === mod.module || (mod.module === 'lab_tests' && p.module === 'tests') || (mod.module === 'audit_logs' && p.module === 'logs')) &&
                              (p.action === action || (action === 'edit' && p.action === 'update') || (action === 'update' && p.action === 'edit'))
                            );
                            if (!perm) return null;
                            const checked = selectedPerms.has(perm.id);
                            return (
                              <label
                                key={action}
                                className={cn(
                                  "flex items-center gap-1.5 text-xs cursor-pointer select-none px-2 py-1 rounded-lg transition-colors",
                                  checked ? "text-primary bg-primary/10 font-medium" : "text-muted-foreground hover:bg-muted"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePerm(perm.id)}
                                  className="hidden"
                                />
                                {checked
                                  ? <CheckSquare className="w-3.5 h-3.5 flex-shrink-0" />
                                  : <Square className="w-3.5 h-3.5 flex-shrink-0" />
                                }
                                {action}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">{selectedPerms.size} permissions selected</p>
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-md shadow-primary/20"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Save Changes' : (userType === 'DOCTOR' ? 'Save Doctor' : 'Create User')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Preview Modal */}
      {previewSignature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
            <h3 className="font-bold text-foreground">Signature Preview</h3>
            <p className="text-xs text-muted-foreground">{previewSignature.name} ({previewSignature.qualification})</p>
            <div className="bg-white p-4 rounded-xl border border-border flex items-center justify-center min-h-32">
              <img
                src={previewSignature.signatureUrl}
                alt="Doctor Signature"
                className="max-h-24 max-w-full object-contain"
              />
            </div>
            <button
              onClick={() => setPreviewSignature(null)}
              className="w-full py-2 bg-muted hover:bg-muted/80 rounded-xl text-xs font-semibold transition-colors"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
      {/* View Doctor Details Modal */}
      {viewingDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-border bg-gradient-to-r from-teal-500/10 via-teal-500/5 to-transparent flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-teal-600/20 overflow-hidden">
                  {viewingDoctor.photoUrl ? (
                    <img src={viewingDoctor.photoUrl} alt={viewingDoctor.name} className="w-full h-full object-cover" />
                  ) : (
                    `Dr.`
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground">Dr. {viewingDoctor.name}</h2>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      viewingDoctor.approvalStatus === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : viewingDoctor.approvalStatus === 'PENDING'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                    }`}>
                      {viewingDoctor.approvalStatus || 'APPROVED'}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      viewingDoctor.isActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}>
                      {viewingDoctor.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span className="font-semibold text-teal-600 dark:text-teal-400">{viewingDoctor.specialization || 'General / Pathology'}</span>
                    <span>•</span>
                    <span>{viewingDoctor.qualification || 'MBBS'}</span>
                    <span>•</span>
                    <span className="font-mono">{viewingDoctor.registrationNo || 'No Reg'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingDoctor(null)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Professional Credentials Card */}
              <div className="bg-muted/30 border border-border/80 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                  Medical & Professional Credentials
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Medical Registration (MCI)</span>
                    <span className="font-semibold text-foreground font-mono">{viewingDoctor.registrationNo || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Qualifications</span>
                    <span className="font-semibold text-foreground">{viewingDoctor.qualification || 'MBBS'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Specialization</span>
                    <span className="font-semibold text-teal-600 dark:text-teal-400">{viewingDoctor.specialization || 'Pathology'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Designation / Role</span>
                    <span className="font-semibold text-foreground">{viewingDoctor.designation || 'Consultant Doctor'}</span>
                  </div>
                </div>
              </div>

              {/* Contact & Location Card */}
              <div className="bg-muted/30 border border-border/80 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-600" />
                  Contact Info & Assigned Branch
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Email Address</span>
                    <span className="font-semibold text-foreground break-all">{viewingDoctor.user?.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Mobile Number</span>
                    <span className="font-semibold text-foreground">{viewingDoctor.user?.mobile || 'Not provided'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[11px] text-muted-foreground block">Assigned Branch / Location</span>
                    <span className="font-semibold text-foreground">
                      {viewingDoctor.branch?.name ? `${viewingDoctor.branch.name} (${viewingDoctor.branch.city || ''})` : 'All Branches / Central Lab'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Commission & Commercials Card (only for non-employee / freelance referral doctors with commission) */}
              {viewingDoctor.doctorType !== 'EMPLOYEE' && (viewingDoctor.commissionRate ?? 0) > 0 && (
                <div className="bg-muted/30 border border-border/80 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-teal-600" />
                    Commercials & Commission
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Test Referral Commission</span>
                      <span className="font-bold text-emerald-600 text-sm">{viewingDoctor.commissionRate ?? 30}%</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Payment Cycle</span>
                      <span className="font-semibold text-foreground">{viewingDoctor.paymentCycle || 'MONTHLY'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Digital Signature & Stamp Card */}
              <div className="bg-muted/30 border border-border/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileSignature className="w-3.5 h-3.5 text-teal-600" />
                    Doctor Digital Signature & Stamp
                  </h3>
                  {viewingDoctor.signatureUrl ? (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Attached & Active
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Digital Stamp Only</span>
                  )}
                </div>

                {viewingDoctor.signatureUrl ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-card border border-border rounded-xl">
                    <div className="bg-white border border-slate-200 rounded-lg p-2 min-w-[140px] max-w-[200px] h-20 flex items-center justify-center shadow-xs">
                      <img
                        src={viewingDoctor.signatureUrl}
                        alt="Doctor Signature Preview"
                        className="max-h-16 max-w-full object-contain"
                        crossOrigin="anonymous"
                      />
                    </div>
                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <p className="text-xs font-semibold text-foreground">Verified Doctor Signature</p>
                      <p className="text-[11px] text-muted-foreground">Stamped on authorized lab test reports</p>
                      <a
                        href={viewingDoctor.signatureUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-teal-600 hover:underline pt-1 font-semibold"
                      >
                        <ExternalLink className="w-3 h-3" /> View High-Res Signature
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Using standard digital stamp on medical reports.</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-border flex items-center justify-between gap-3 flex-shrink-0 bg-card">
              <button
                onClick={() => {
                  const d = viewingDoctor;
                  setViewingDoctor(null);
                  openPortalForDoctor(d);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 text-xs font-semibold border border-teal-200/80 transition-colors cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5" /> View Doctor Portal
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewingDoctor(null)}
                  className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const d = viewingDoctor;
                    setViewingDoctor(null);
                    openEdit(d);
                  }}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors shadow-md shadow-teal-600/20 cursor-pointer"
                >
                  <Pencil className="w-4 h-4" /> Edit Doctor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DoctorsPage;
