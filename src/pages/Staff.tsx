import React, { useState, useEffect, useMemo, useRef } from 'react';
import { staffService } from '@/services/api';
import { branchService, Branch } from '@/services/branch.service';
import { useAppSelector } from '@/redux/hooks';
import { AdminRole } from '@/types/rbac';
import {
  Briefcase, Plus, Pencil, Trash2, Search, X, Loader2,
  Building2, CheckCircle2, ShieldCheck, Mail, Phone,
  Users, UserCheck, ToggleLeft, ToggleRight, Eye, EyeOff,
  FileSignature, Upload, ExternalLink
} from 'lucide-react';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

export interface StaffRecord {
  id: string;
  isActive: boolean;
  department?: string;
  designation?: string;
  signatureUrl?: string;
  franchiseId?: string;
  branchId?: string;
  partnerId?: string;
  userType?: string;
  branch?: {
    id: string;
    name: string;
    city: string;
    code?: string;
  };
  pathologyPartner?: {
    labName: string;
    city?: string;
  };
  role?: {
    id: string;
    name: string;
    slug?: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    mobile?: string;
    role: string;
    createdAt?: string;
  };
}

const COMMON_DEPARTMENTS = [
  'Pathology Lab',
  'Biochemistry & Hematology',
  'Sample Collection (Phlebotomy)',
  'Microbiology & Serology',
  'Reception & Operations',
  'Quality Control & Assurance',
  'Logistics & Courier',
  'Administration & Support',
  'Others',
];

const COMMON_DESIGNATIONS = [
  'Lab Technician',
  'Senior Lab Technician',
  'Phlebotomist / Sample Collector',
  'Lab Assistant',
  'Receptionist',
  'Operations Executive',
  'Branch Coordinator',
  'Quality Analyst',
  'Others',
];

export const StaffPage: React.FC = () => {
  const currentUser = useAppSelector(state => state.auth.user);
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'SUPER_ADMIN' || (currentUser as any)?.isSuperAdmin;
  const userBranchId = (currentUser as any)?.branchId || (currentUser as any)?.adminUser?.branchId || '';
  const userPartnerId = (currentUser as any)?.partnerId || (currentUser as any)?.adminUser?.partnerId || '';

  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRecord | null>(null);
  const [viewingStaff, setViewingStaff] = useState<StaffRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formDepartment, setFormDepartment] = useState('Pathology Lab');
  const [customDepartment, setCustomDepartment] = useState('');
  const [formDesignation, setFormDesignation] = useState('Lab Technician');
  const [customDesignation, setCustomDesignation] = useState('');
  const [formBranchId, setFormBranchId] = useState('');
  const [formFranchiseId, setFormFranchiseId] = useState('');
  const [formSignatureUrl, setFormSignatureUrl] = useState('');
  const [signatureUploading, setSignatureUploading] = useState(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);

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
      const res = await staffService.uploadSignature(file);
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

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffRes, branchRes] = await Promise.allSettled([
        staffService.getStaff(),
        branchService.getAdminLocations(),
      ]);

      if (staffRes.status === 'fulfilled' && Array.isArray(staffRes.value)) {
        setStaffList(staffRes.value);
      }
      if (branchRes.status === 'fulfilled' && branchRes.value?.data) {
        setBranches(branchRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load staff data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormEmail('');
    setFormMobile('');
    setFormPassword('');
    setShowPassword(false);
    setFormDepartment('Pathology Lab');
    setCustomDepartment('');
    setFormDesignation('Lab Technician');
    setCustomDesignation('');
    const userBranch = userBranchId ? `BRANCH:${userBranchId}` : (userPartnerId ? `PARTNER:${userPartnerId}` : (branches[0] ? `${branches[0].type}:${branches[0].id}` : ''));
    setFormBranchId(userBranch);
    setFormFranchiseId('');
    setFormSignatureUrl('');
    setModalOpen(true);
  };

  const openEdit = (s: StaffRecord) => {
    setEditing(s);
    setFormName(s.user.name);
    setFormEmail(s.user.email);
    setFormMobile(s.user.mobile || '');
    setFormPassword('');
    setShowPassword(false);

    const isCustomDept = s.department && !COMMON_DEPARTMENTS.filter(d => d !== 'Others').includes(s.department);
    if (isCustomDept) {
      setFormDepartment('Others');
      setCustomDepartment(s.department || '');
    } else {
      setFormDepartment(s.department || 'Pathology Lab');
      setCustomDepartment('');
    }

    const isCustomDesig = s.designation && !COMMON_DESIGNATIONS.filter(d => d !== 'Others').includes(s.designation);
    if (isCustomDesig) {
      setFormDesignation('Others');
      setCustomDesignation(s.designation || '');
    } else {
      setFormDesignation(s.designation || 'Lab Technician');
      setCustomDesignation('');
    }

    const initBranch = s.branchId ? `BRANCH:${s.branchId}` : (s.partnerId ? `PARTNER:${s.partnerId}` : '');
    setFormBranchId(initBranch);
    setFormFranchiseId(s.franchiseId || '');
    setFormSignatureUrl(s.signatureUrl || (s as any).adminUser?.signatureUrl || '');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      toast.error('Name and Email are required');
      return;
    }
    if (formMobile && !/^[6-9]\d{9}$/.test(formMobile.trim())) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }

    const finalDepartment = formDepartment === 'Others' ? customDepartment.trim() : formDepartment;
    const finalDesignation = formDesignation === 'Others' ? customDesignation.trim() : formDesignation;

    if (!finalDepartment) {
      toast.error('Please enter department name');
      return;
    }
    if (!finalDesignation) {
      toast.error('Please enter staff role / designation');
      return;
    }

    let finalBranchId = undefined;
    let finalPartnerId = undefined;
    if (formBranchId) {
      const parts = formBranchId.split(':');
      if (parts[0] === 'BRANCH') finalBranchId = parts[1];
      else if (parts[0] === 'PARTNER') finalPartnerId = parts[1];
    } else if (userBranchId) {
      finalBranchId = userBranchId;
    } else if (userPartnerId) {
      finalPartnerId = userPartnerId;
    }
    const isLabTech = finalDesignation === 'Lab Technician' ||
      finalDesignation === 'Senior Lab Technician' ||
      finalDesignation.toLowerCase().includes('technician') ||
      finalDesignation.toLowerCase().includes('technologist');

    if (isLabTech && !formSignatureUrl?.trim()) {
      toast.error('Signature is required for Lab Technician');
      return;
    }

    const payload: any = {
      name: formName.trim(),
      email: formEmail.trim(),
      mobile: formMobile.trim() || undefined,
      userType: 'EMPLOYEE',
      department: finalDepartment || undefined,
      designation: finalDesignation || undefined,
      branchId: finalBranchId,
      partnerId: finalPartnerId,
      franchiseId: formFranchiseId || undefined,
      signatureUrl: isLabTech ? (formSignatureUrl || null) : undefined,
    };

    if (formPassword.trim()) {
      payload.password = formPassword.trim();
    } else if (!editing) {
      payload.password = 'MedsSeva@123';
    }

    console.log('[STAFF CREATE] Submitting payload to /api/staff:', payload);
    setSaving(true);
    try {
      if (editing) {
        const res = await staffService.updateStaff(editing.id, payload);
        console.log('[STAFF UPDATE] Success:', res);
        toast.success('Staff details updated');
      } else {
        const res = await staffService.createStaff(payload);
        console.log('[STAFF CREATE] Success:', res);
        toast.success('Staff member registered');
      }
      setModalOpen(false);
      loadData();
    } catch (e: any) {
      console.error('[STAFF SAVE ERROR] Response data:', e.response?.data);
      toast.error(e.response?.data?.error || e.response?.data?.message || 'Failed to save staff');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (s: StaffRecord) => {
    try {
      await staffService.updateStaff(s.id, { isActive: !s.isActive });
      toast.success(s.isActive ? 'Staff deactivated' : 'Staff activated');
      loadData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (s: StaffRecord) => {
    if (!confirm(`Are you sure you want to delete ${s.user.name}?`)) return;
    try {
      await staffService.deleteStaff(s.id);
      toast.success('Staff member deleted');
      loadData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to delete staff');
    }
  };

  const baseStaffList = useMemo(() => {
    if (!isSuperAdmin && userBranchId) {
      return staffList.filter(s => s.branchId === userBranchId || s.branch?.id === userBranchId);
    }
    if (!isSuperAdmin && userPartnerId) {
      return staffList.filter(s => s.partnerId === userPartnerId);
    }
    return staffList;
  }, [staffList, isSuperAdmin, userBranchId, userPartnerId]);

  const filteredStaff = useMemo(() => {
    return baseStaffList.filter(s => {
      if (deptFilter !== 'ALL' && s.department !== deptFilter) return false;
            if (branchFilter !== 'ALL') {
        const parts = branchFilter.split(':');
        if (parts[0] === 'BRANCH' && s.branchId !== parts[1]) return false;
        if (parts[0] === 'PARTNER' && s.partnerId !== parts[1]) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          s.user.name.toLowerCase().includes(q) ||
          s.user.email.toLowerCase().includes(q) ||
          s.user.mobile?.toLowerCase().includes(q) ||
          s.designation?.toLowerCase().includes(q) ||
          s.department?.toLowerCase().includes(q) ||
          s.branch?.name.toLowerCase().includes(q) ||
          s.pathologyPartner?.labName.toLowerCase().includes(q) ||
          (s.role as any)?.name?.toLowerCase()?.includes(q)
        );
      }
      return true;
    });
  }, [baseStaffList, search, deptFilter, branchFilter]);

  const countTechnicians = baseStaffList.filter(s => s.designation?.toLowerCase().includes('technician') || s.department?.toLowerCase().includes('lab')).length;
  const countPhlebotomists = baseStaffList.filter(s => s.designation?.toLowerCase().includes('phlebotomist') || s.designation?.toLowerCase().includes('collector')).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Staff & Employee Management</h1>
            <p className="text-xs text-muted-foreground">Manage Lab Technicians, Phlebotomists, Operations Staff & Assistants</p>
          </div>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-md shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total Staff / Employees</div>
            <div className="text-lg font-black text-foreground">{staffList.length}</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 flex items-center justify-center font-bold">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Lab Technicians</div>
            <div className="text-lg font-black text-foreground">{countTechnicians}</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Phlebotomists / Collectors</div>
            <div className="text-lg font-black text-foreground">{countPhlebotomists}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card border border-border rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 outline-none font-medium text-foreground"
          >
            <option value="ALL">All Departments</option>
            {COMMON_DEPARTMENTS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 outline-none font-medium text-foreground"
          >
            <option value="ALL">All Branches / Locations</option>
            {branches.map(b => (
              <option key={`${b.type}:${b.id}`} value={`${b.type}:${b.id}`}>{b.name} ({b.city})</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="w-full md:w-72 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, role, department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Staff Table */}
      {loading ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> Loading staff directory...
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-x-auto shadow-sm">
          <table className="w-full text-sm min-w-[850px]">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3.5 text-left">Employee Name & Role</th>
                <th className="px-5 py-3.5 text-left">Contact Info</th>
                <th className="px-5 py-3.5 text-left">Department</th>
                <th className="px-5 py-3.5 text-left">Assigned Branch</th>
                <th className="px-5 py-3.5 text-left">Access Role</th>
                <th className="px-5 py-3.5 text-left">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredStaff.map(s => (
                <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                  {/* Staff Info */}
                  <td className="px-5 py-3.5">
                    <div
                      onClick={() => setViewingStaff(s)}
                      className="flex items-center gap-3 cursor-pointer group"
                      title="Click to view employee details"
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs border border-indigo-200 group-hover:scale-105 transition-transform">
                        {s.user.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground group-hover:text-indigo-600 transition-colors">{s.user.name}</div>
                        <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                          <span>{s.designation || 'Lab Staff'}</span>
                          {s.signatureUrl && (
                            <span title="Digital Signature Uploaded">
                              <FileSignature className="w-3.5 h-3.5 text-emerald-600 inline-block shrink-0" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-5 py-3.5 text-xs">
                    <div className="flex items-center gap-1.5 text-foreground font-medium">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      {s.user.email}
                    </div>
                    {s.user.mobile && (
                      <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5">
                        <Phone className="w-3.5 h-3.5" />
                        {s.user.mobile}
                      </div>
                    )}
                  </td>

                  {/* Department */}
                  <td className="px-5 py-3.5 text-xs font-medium text-foreground">
                    <span className="bg-muted px-2.5 py-1 rounded-md text-[11px] font-semibold text-muted-foreground">
                      {s.department || 'Operations'}
                    </span>
                  </td>

                  {/* Branch */}
                  <td className="px-5 py-3.5 text-xs">
                    {s.branch?.name ? (
                      <div className="flex items-center gap-1.5 text-foreground font-medium">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{s.branch.name}</span>
                      </div>
                    ) : s.pathologyPartner?.labName ? (
                      <div className="flex items-center gap-1.5 text-foreground font-medium">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{s.pathologyPartner.labName}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">All Branches / Central</span>
                    )}
                  </td>

                  {/* Access Role */}
                  <td className="px-5 py-3.5">
                    <span className="text-xs px-2.5 py-0.5 bg-primary/10 text-primary rounded-full font-semibold">
                      {s.role?.name || 'Staff'}
                    </span>
                  </td>

                  {/* Status Toggle */}
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => handleToggleActive(s)}
                      className="flex items-center gap-1.5 text-xs font-medium"
                    >
                      {s.isActive
                        ? <><ToggleRight className="w-4 h-4 text-emerald-500" /><span className="text-emerald-600 font-semibold">Active</span></>
                        : <><ToggleLeft className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Inactive</span></>
                      }
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setViewingStaff(s)}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-muted-foreground hover:text-indigo-600 transition-colors cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEdit(s)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Edit Employee"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        title="Delete Employee"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground text-sm">
                    No employees found. Click &quot;Add Employee&quot; to register new staff.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                {editing ? 'Edit Employee Profile' : 'Add New Staff / Employee'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Employee Name */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-foreground mb-1 block">Full Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Ramesh Patil"
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Email Address *</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="e.g. ramesh@medsseva.com"
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                {/* Mobile */}
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Mobile Number</label>
                  <input
                    type="tel"
                    value={formMobile}
                    onChange={e => setFormMobile(e.target.value)}
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                {/* Login Password */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Login Password {editing ? '(Leave blank to keep unchanged)' : '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formPassword}
                      onChange={e => setFormPassword(e.target.value)}
                      placeholder={editing ? 'Enter new password or leave blank' : 'e.g. MedsSeva@123'}
                      className="w-full h-10 pl-3 pr-10 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    This password will be used by the employee / phlebotomist to login to the MedsSeva app.
                  </p>
                </div>

                {/* Designation */}
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Staff Role / Designation *</label>

                  {formDesignation === 'Others' ? (
                    <input
                      type="text"
                      value={customDesignation}
                      onChange={e => setCustomDesignation(e.target.value)}
                      placeholder="Type custom role (e.g. Office Staff)"
                      className="w-full h-10 px-3 bg-background border border-indigo-500 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/30"
                      autoFocus
                    />
                  ) : (
                    <select
                      value={formDesignation}
                      onChange={e => {
                        setFormDesignation(e.target.value);
                        if (e.target.value === 'Others') {
                          setCustomDesignation('');
                        }
                      }}
                      className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                    >
                      {COMMON_DESIGNATIONS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Department */}
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Department *</label>

                  {formDepartment === 'Others' ? (
                    <input
                      type="text"
                      value={customDepartment}
                      onChange={e => setCustomDepartment(e.target.value)}
                      placeholder="Type custom department (e.g. Accounts, HR)"
                      className="w-full h-10 px-3 bg-background border border-indigo-500 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/30"
                      autoFocus
                    />
                  ) : (
                    <select
                      value={formDepartment}
                      onChange={e => {
                        setFormDepartment(e.target.value);
                        if (e.target.value === 'Others') {
                          setCustomDepartment('');
                        }
                      }}
                      className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                    >
                      {COMMON_DEPARTMENTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Assign Branch */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-foreground mb-1 block">Assign Branch</label>
                  <select
                    value={formBranchId}
                    onChange={e => setFormBranchId(e.target.value)}
                    disabled={!isSuperAdmin && (!!userBranchId || !!userPartnerId)}
                    className={`w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${!isSuperAdmin && (!!userBranchId || !!userPartnerId) ? 'opacity-80 cursor-not-allowed bg-muted' : ''}`}
                  >
                    {isSuperAdmin && <option value="">All Branches / Central</option>}
                    {branches
                      .filter(b => isSuperAdmin || (!userBranchId && !userPartnerId) || (b.type === 'BRANCH' && b.id === userBranchId) || (b.type === 'PARTNER' && b.id === userPartnerId))
                      .map(b => (
                        <option key={`${b.type}:${b.id}`} value={`${b.type}:${b.id}`}>{b.name} ({b.city})</option>
                      ))}
                  </select>
                </div>

                {/* Lab Technician Signature Upload (Only when Role / Designation is Lab Technician) */}
                {(() => {
                  const currentDesignation = formDesignation === 'Others' ? customDesignation.trim() : formDesignation;
                  const isLabTech = currentDesignation === 'Lab Technician' ||
                    currentDesignation === 'Senior Lab Technician' ||
                    currentDesignation.toLowerCase().includes('technician') ||
                    currentDesignation.toLowerCase().includes('technologist');

                  if (!isLabTech) return null;

                  return (
                    <div className="md:col-span-2 space-y-2 pt-2 border-t border-border/60">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <FileSignature className="h-4 w-4 text-indigo-600" />
                          Lab Technician Signature <span className="text-rose-500 font-bold">*</span>
                        </label>
                        {formSignatureUrl && (
                          <button
                            type="button"
                            onClick={() => setFormSignatureUrl('')}
                            className="text-[11px] text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1 cursor-pointer"
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
                              alt="Lab Technician Signature Preview"
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
                                className="px-2.5 py-1 text-xs font-semibold bg-background border border-border hover:bg-muted rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                {signatureUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3 text-indigo-600" />}
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
                            "border-2 border-dashed border-border hover:border-indigo-500/60 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40",
                            signatureUploading && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          {signatureUploading ? (
                            <div className="flex flex-col items-center gap-2 py-2">
                              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                              <span className="text-xs font-semibold text-muted-foreground">Uploading signature image...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1 py-1">
                              <div className="h-9 w-9 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-1">
                                <Upload className="h-4 w-4" />
                              </div>
                              <span className="text-xs font-bold text-foreground">Click to upload lab technician signature</span>
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
                          className="w-full h-8 px-3 bg-background border border-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500/30 text-muted-foreground focus:text-foreground"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">Required for Lab Technicians. Will be displayed on patient test reports.</p>
                      </div>
                    </div>
                  );
                })()}
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
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-md shadow-indigo-600/20"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Save Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Staff / Employee Details Modal */}
      {viewingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-border bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-indigo-600/20">
                  {viewingStaff.user.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground">{viewingStaff.user.name}</h2>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      viewingStaff.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                    }`}>
                      {viewingStaff.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{viewingStaff.designation || 'Staff'}</span>
                    <span>•</span>
                    <span>{viewingStaff.department || 'Operations'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingStaff(null)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Contact Details Card */}
              <div className="bg-muted/30 border border-border/80 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  Contact & Profile Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Email Address</span>
                    <span className="font-semibold text-foreground break-all">{viewingStaff.user.email}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Mobile Number</span>
                    <span className="font-semibold text-foreground">{viewingStaff.user.mobile || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Access Role</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {viewingStaff.role?.name || 'Standard Staff'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">User Type</span>
                    <span className="font-semibold text-foreground">{viewingStaff.userType || 'EMPLOYEE'}</span>
                  </div>
                </div>
              </div>

              {/* Department & Branch Card */}
              <div className="bg-muted/30 border border-border/80 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  Department & Location
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Department</span>
                    <span className="font-semibold text-foreground">{viewingStaff.department || 'Operations'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Designation</span>
                    <span className="font-semibold text-foreground">{viewingStaff.designation || 'Staff'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[11px] text-muted-foreground block">Assigned Branch</span>
                    <span className="font-semibold text-foreground">
                      {viewingStaff.branch?.name ? `${viewingStaff.branch.name} (${viewingStaff.branch.city || ''})` : 'All Branches / Central Lab'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Digital Signature Card */}
              <div className="bg-muted/30 border border-border/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileSignature className="w-3.5 h-3.5 text-indigo-600" />
                    Digital Signature
                  </h3>
                  {viewingStaff.signatureUrl ? (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Attached & Verified
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Not uploaded</span>
                  )}
                </div>

                {viewingStaff.signatureUrl ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-card border border-border rounded-xl">
                    <div className="bg-white border border-slate-200 rounded-lg p-2 min-w-[140px] max-w-[200px] h-20 flex items-center justify-center shadow-xs">
                      <img
                        src={viewingStaff.signatureUrl}
                        alt="Staff Signature Preview"
                        className="max-h-16 max-w-full object-contain"
                        crossOrigin="anonymous"
                      />
                    </div>
                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <p className="text-xs font-semibold text-foreground">Official Staff Signature</p>
                      <p className="text-[11px] text-muted-foreground">Applied to patient lab reports & sample authorizations</p>
                      <a
                        href={viewingStaff.signatureUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline pt-1 font-semibold"
                      >
                        <ExternalLink className="w-3 h-3" /> View Full Signature Image
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No signature uploaded for this employee.</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-border flex items-center justify-end gap-3 flex-shrink-0 bg-card">
              <button
                onClick={() => setViewingStaff(null)}
                className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const s = viewingStaff;
                  setViewingStaff(null);
                  openEdit(s);
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Pencil className="w-4 h-4" /> Edit Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default StaffPage;
