import React, { useState, useEffect } from 'react';
import { useAdminUsersQuery, useRolesQuery, useAllPermissionsQuery, useBranchesQuery } from '@/hooks/useAdminQueries';
import { useQueryClient } from '@tanstack/react-query';
import { adminUserService, rbacService } from '@/services/api';
import { AdminRole, Permission } from '@/types/rbac';
import {
  Plus, Pencil, Trash2, Loader2, X, UserCircle2,
  Mail, ShieldCheck, ToggleLeft, ToggleRight,
  CheckSquare, Square, Stethoscope, Briefcase, UserCheck, Building2,
  Eye, EyeOff
} from 'lucide-react';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface BranchOption {
  id: string;
  name: string;
  city: string;
  code?: string;
}

interface AdminUserRecord {
  id: string;
  isActive: boolean;
  franchiseId?: string;
  department?: string;
  designation?: string;
  qualification?: string;
  registrationNo?: string;
  signatureUrl?: string;
  branchId?: string;
  userType?: 'DOCTOR' | 'EMPLOYEE' | 'STAFF' | 'ADMIN';
  branch?: BranchOption;
  role: AdminRole;
  user: { id: string; name: string; email: string; mobile?: string; role: string; createdAt?: string };
}

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

import { useAppSelector } from '@/redux/hooks';

export const AdminUsersPage: React.FC = () => {
  const currentUser = useAppSelector(state => state.auth.user);
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'SUPER_ADMIN' || (currentUser as any)?.isSuperAdmin;
  const userBranchId = (currentUser as any)?.branchId;

  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'DOCTOR' | 'EMPLOYEE' | 'ADMIN'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUserRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [userType, setUserType] = useState<'STAFF' | 'DOCTOR' | 'EMPLOYEE' | 'ADMIN'>('DOCTOR');
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
  const [formCommissionRate, setFormCommissionRate] = useState<number>(30);
  const [formPaymentCycle, setFormPaymentCycle] = useState<string>('MONTHLY');

  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [customRoleName, setCustomRoleName] = useState('');

  const queryClient = useQueryClient();
  const { data: adminUsersData, isLoading: adminUsersLoading } = useAdminUsersQuery();
  const { data: rolesData, isLoading: rolesLoading } = useRolesQuery();
  const { data: permsData, isLoading: permsLoading } = useAllPermissionsQuery();
  const { data: branchesData } = useBranchesQuery();

  const loading = (adminUsersLoading && !adminUsers.length) || (rolesLoading && !roles.length);

  useEffect(() => {
    if (adminUsersData) {
      const filtered = adminUsersData.filter((au: any) => {
        if (!isSuperAdmin && userBranchId) {
          return au.branchId === userBranchId || au.branch?.id === userBranchId || au.user?.email === currentUser?.email;
        }
        return true;
      });
      setAdminUsers(filtered);
    }
    if (rolesData) setRoles(rolesData.filter((r: AdminRole) => r.slug !== 'super_admin'));
    if (permsData) setAllPermissions(permsData);
    if (branchesData) setBranches(branchesData);
  }, [adminUsersData, rolesData, permsData, branchesData, isSuperAdmin, userBranchId, currentUser]);

  const openCreate = (defaultType: 'DOCTOR' | 'EMPLOYEE' | 'STAFF' | 'ADMIN' = 'DOCTOR') => {
    setEditing(null);
    setUserType(defaultType);
    setFormName('');
    setFormEmail('');
    setFormMobile('');
    setFormPassword('');
    setShowPassword(false);
    setFormBranchId('');
    setFormFranchiseId('');
    setFormDepartment(defaultType === 'EMPLOYEE' ? 'Pathology Lab' : '');
    setFormDesignation(defaultType === 'DOCTOR' ? 'Consultant Pathologist' : (defaultType === 'EMPLOYEE' ? 'Lab Technician' : ''));
    setFormQualification(defaultType === 'DOCTOR' ? 'MBBS, MD (Pathology)' : '');
    setFormRegistrationNo('');
    setFormSignatureUrl('');
    setFormCommissionRate(0);
    setFormPaymentCycle('MONTHLY');
    setSelectedPerms(new Set());
    setIsCustomRole(false);
    setCustomRoleName('');

    // Preselect suitable role
    if (defaultType === 'DOCTOR') {
      const docRole = roles.find(r => r.name.toLowerCase().includes('pathologist') || r.slug.includes('pathologist'));
      setFormRoleId(docRole?.id || roles[0]?.id || '');
    } else {
      setFormRoleId(roles[0]?.id || '');
    }

    setModalOpen(true);
  };

  const openEdit = (u: AdminUserRecord) => {
    setEditing(u);
    setUserType((u.userType as any) || (u.registrationNo ? 'DOCTOR' : (u.department ? 'EMPLOYEE' : 'ADMIN')));
    setFormName(u.user.name);
    setFormEmail(u.user.email);
    setFormMobile(u.user.mobile || '');
    setFormPassword('');
    setShowPassword(false);
    setFormRoleId(u.role.id);
    setFormBranchId(u.branchId || (u as any).branch?.id || '');
    setFormFranchiseId(u.franchiseId || '');
    const docData = (u.user as any)?.doctor || (u as any).doctor;
    setFormDesignation(u.designation || docData?.designation || '');
    setFormQualification(u.qualification || docData?.qualification || '');
    setFormRegistrationNo(u.registrationNo || docData?.registrationNo || '');
    setFormSignatureUrl(u.signatureUrl || docData?.signatureUrl || '');
    const initialCommRate = docData?.commissionRate !== undefined && docData?.commissionRate !== null
      ? Number(docData.commissionRate)
      : ((u as any).commissionRate !== undefined && (u as any).commissionRate !== null
          ? Number((u as any).commissionRate)
          : 30);
    setFormCommissionRate(initialCommRate);
    setFormPaymentCycle(docData?.paymentCycle || (u as any).paymentCycle || 'MONTHLY');

    const currentRole = roles.find(r => r.id === u.role.id) || u.role;
    const rolePerms = new Set<string>(
      ((currentRole as any)?.permissions || u.role.permissions || []).map((rp: any) => String(rp.permission?.id || rp.permissionId))
    );
    setSelectedPerms(rolePerms);
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
      setSelectedPerms(new Set());
      return;
    }
    setIsCustomRole(false);
    setFormRoleId(roleId);
    const role = roles.find(r => r.id === roleId);
    if (role) {
      const perms = new Set(
        (role.permissions || []).map((rp: any) => rp.permission?.id || rp.permissionId)
      );
      setSelectedPerms(perms);
    }
  };

  const handleSave = async () => {
    if (!formName || !formEmail || (!editing && !formPassword)) {
      toast.error('Please fill all required fields (*)');
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
    if (!isCustomRole && !formRoleId) {
      toast.error('Select a role');
      return;
    }

    setSaving(true);
    try {
      let roleId = formRoleId;

      if (isCustomRole) {
        const newRole = await rbacService.createRole({
          name: customRoleName.trim(),
          description: `Custom role for ${formName}`,
          permissionIds: Array.from(selectedPerms),
        });
        roleId = newRole.id;
      } else if (selectedPerms.size > 0) {
        await rbacService.updateRole(formRoleId, {
          name: roles.find(r => r.id === formRoleId)?.name,
          permissionIds: Array.from(selectedPerms),
        });
      }

      const payload: any = {
        name: formName,
        email: formEmail,
        mobile: formMobile.trim() || undefined,
        roleId,
        userType,
        branchId: formBranchId || undefined,
        franchiseId: formFranchiseId || undefined,
        department: formDepartment || undefined,
        designation: formDesignation || undefined,
        qualification: formQualification || undefined,
        registrationNo: formRegistrationNo || undefined,
        signatureUrl: formSignatureUrl || undefined,
        commissionRate: 0,
        paymentCycle: formPaymentCycle || 'MONTHLY',
      };
      if (formPassword) payload.password = formPassword;

      if (editing) {
        await adminUserService.updateAdminUser(editing.id, payload);
        toast.success('User updated successfully');
      } else {
        await adminUserService.createAdminUser(payload);
        toast.success(userType === 'DOCTOR' ? 'Doctor added successfully' : 'User created successfully');
      }
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u: AdminUserRecord) => {
    try {
      await adminUserService.updateAdminUser(u.id, { isActive: !u.isActive });
      toast.success(u.isActive ? 'User deactivated' : 'User activated');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (u: AdminUserRecord) => {
    if (!confirm(`Delete ${u.user.name}? This cannot be undone.`)) return;
    try {
      await adminUserService.deleteAdminUser(u.id);
      toast.success('User deleted');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to delete');
    }
  };

  // Filtering users by category & search
  const filteredUsers = adminUsers.filter(u => {
    const isDoc = u.userType === 'DOCTOR' || !!u.registrationNo || u.role?.name?.toLowerCase().includes('pathologist');
    const isEmp = u.userType === 'EMPLOYEE' || u.userType === 'STAFF' || (!!u.department && !isDoc);
    const isAdm = !isDoc && !isEmp;

    if (categoryFilter === 'DOCTOR' && !isDoc) return false;
    if (categoryFilter === 'EMPLOYEE' && !isEmp) return false;
    if (categoryFilter === 'ADMIN' && !isAdm) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        u.user.name?.toLowerCase().includes(q) ||
        u.user.email?.toLowerCase().includes(q) ||
        u.registrationNo?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q) ||
        u.designation?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const countDoctors = adminUsers.filter(u => u.userType === 'DOCTOR' || !!u.registrationNo || u.role?.name?.toLowerCase().includes('pathologist')).length;
  const countEmployees = adminUsers.filter(u => u.userType === 'EMPLOYEE' || (!!u.department && !u.registrationNo)).length;

  return (
    <div className="space-y-6">
      {/* Header with Title and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">User Management</h1>
            <p className="text-xs text-muted-foreground">Manage Doctors, Lab Employees, Staff & Admin Users</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openCreate('DOCTOR')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            <Stethoscope className="w-4 h-4" /> Add Doctor
          </button>
          <button
            onClick={() => openCreate('EMPLOYEE')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            <Briefcase className="w-4 h-4" /> Add Employee
          </button>
        </div>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border rounded-xl p-2.5">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { key: 'ALL', label: `All Users (${adminUsers.length})` },
            { key: 'DOCTOR', label: `🩺 Doctors (${countDoctors})` },
            { key: 'EMPLOYEE', label: `💼 Employees & Staff (${countEmployees})` },
            { key: 'ADMIN', label: `🛡️ Admins` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setCategoryFilter(tab.key as any)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap",
                categoryFilter === tab.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search by name, email, reg no..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs px-3 py-1.5 bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden p-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" /> Loading users...
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[750px]">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3.5 text-left">User / Details</th>
                <th className="px-5 py-3.5 text-left">Contact</th>
                <th className="px-5 py-3.5 text-left">Role & Branch</th>
                <th className="px-5 py-3.5 text-left">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredUsers.map(u => {
                const isDoc = u.userType === 'DOCTOR' || !!u.registrationNo;
                const isEmp = u.userType === 'EMPLOYEE' || (!!u.department && !isDoc);

                return (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold",
                          isDoc ? "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300" :
                          isEmp ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" :
                          "bg-primary/10 text-primary"
                        )}>
                          {isDoc ? <Stethoscope className="w-4 h-4" /> :
                           isEmp ? <Briefcase className="w-4 h-4" /> :
                           <UserCircle2 className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <span>{u.user.name}</span>
                            {isDoc && (
                              <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.2 rounded font-bold">
                                Doctor
                              </span>
                            )}
                            {isEmp && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded font-bold">
                                Employee
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            {u.qualification && <span>{u.qualification}</span>}
                            {u.registrationNo && <span className="font-mono text-[11px] font-semibold text-teal-700">Reg: {u.registrationNo}</span>}
                            {u.designation && <span>• {u.designation}</span>}
                            {u.department && <span>• Dept: {u.department}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        {u.user.email}
                      </div>
                      {u.user.mobile && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Ph: {u.user.mobile}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center text-xs px-2.5 py-0.5 bg-primary/10 text-primary rounded-full font-semibold w-max">
                          {u.role.name}
                        </span>
                        {u.branch?.name && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            {u.branch.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => handleToggleActive(u)} className="flex items-center gap-1.5 text-xs font-medium">
                        {u.isActive
                          ? <><ToggleRight className="w-4 h-4 text-emerald-500" /><span className="text-emerald-600 font-semibold">Active</span></>
                          : <><ToggleLeft className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Inactive</span></>
                        }
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit User"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground text-sm">
                    No users found for this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Creating / Editing User */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                {editing ? 'Edit User Profile' : `Add New ${userType === 'DOCTOR' ? 'Doctor' : userType === 'EMPLOYEE' ? 'Employee' : 'User'}`}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* User Category Switcher */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Select User Category *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { type: 'DOCTOR', label: '🩺 Doctor / Pathologist', desc: 'Adds Doctor with Reg No & Signature' },
                    { type: 'EMPLOYEE', label: '🔬 Lab Employee / Staff', desc: 'Technician, Phlebotomist, Executive' },
                    { type: 'ADMIN', label: '🛡️ Admin / Custom', desc: 'Panel administrator' },
                  ].map(cat => (
                    <button
                      key={cat.type}
                      type="button"
                      onClick={() => handleUserTypeChange(cat.type as any)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all",
                        userType === cat.type
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                          : "border-border hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <div className="text-xs">{cat.label}</div>
                      <div className="text-[10px] opacity-75 mt-0.5 font-normal">{cat.desc}</div>
                    </button>
                  ))}
                </div>
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
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-foreground mb-1 block">Doctor Signature Image URL (Optional)</label>
                      <input
                        type="text"
                        value={formSignatureUrl}
                        onChange={e => setFormSignatureUrl(e.target.value)}
                        placeholder="e.g. https://res.cloudinary.com/.../signature.png"
                        className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/30"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">If blank, standard digital signature stamp will be used on reports.</p>
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
    </div>
  );
};