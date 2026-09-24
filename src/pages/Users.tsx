import React, { useState, useEffect, useMemo } from 'react';
import { useUsersQuery, usePartnersQuery, useAdminUsersQuery, useBookingsQuery } from '@/hooks/useAdminQueries';
import { User, UserRole } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  Search, 
  Phone, 
  Mail, 
  UserCircle2, 
  Lock, 
  Unlock,
  Briefcase,
  HeartPulse,
  Plus,
  X,
  Check
} from 'lucide-react';
import { cn } from '../utils/cn';
import { testService, adminUserService } from '../services/api';


const ROLE_LABELS: Record<UserRole, string> = {
  'super_admin': 'Super Admin',
  'franchise_admin': 'Franchise Owner',
  'doctor': 'Authorized Doctor',
  'lab_staff': 'Laboratory Staff',
  'phlebotomist': 'Field Collector',
  'technician': 'Lab Scientist',
  'SUPER_ADMIN': 'Super Admin',
  'ADMIN': 'Admin',
  'FRANCHISE': 'Franchise',
  'LAB_DEPARTMENT': 'Lab Department',
  'EXECUTIVE': 'Executive',
  'PATHOLOGIST': 'Pathologist',
  'PATHOLOGY_PARTNER': 'Pathology Partner',
};

const ROLE_THEMES: Record<string, { bg: string; text: string; border: string }> = {
  'super_admin': { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' },
  'franchise_admin': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  'doctor': { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  'lab_staff': { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' },
  'phlebotomist': { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  'technician': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  'SUPER_ADMIN': { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' },
  'ADMIN': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  'FRANCHISE': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  'LAB_DEPARTMENT': { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' },
  'EXECUTIVE': { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  'PATHOLOGIST': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  'Patient': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  'PATHOLOGY_PARTNER': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  'executive': { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  'admin': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  'pathologist': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  'super-admin': { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' },
};

import { useAppSelector } from '@/redux/hooks';

export const UsersPage: React.FC = () => {
  const currentUser = useAppSelector(state => state.auth.user);
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'SUPER_ADMIN' || (currentUser as any)?.isSuperAdmin;
  const userBranchId = (currentUser as any)?.branchId;

  const { data: adminUsersData } = useAdminUsersQuery();
  const { data: usersData } = useUsersQuery();
  const { data: partnersData } = usePartnersQuery();

  const [pageLoading, setPageLoading] = useState(!adminUsersData && !usersData && !partnersData);
  const [search, setSearch] = useState('');
  const [activeRole, setActiveRole] = useState<string>('All');
  const [backendPatients, setBackendPatients] = useState<User[]>([]);
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [partners, setPartners] = useState<User[]>([]);
  const [roleLabels, setRoleLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    if (adminUsersData) {
      const labels: Record<string, string> = {};
      const filtered = adminUsersData.filter((au: any) => {
        if (!isSuperAdmin && userBranchId) {
          return au.branchId === userBranchId || au.branch?.id === userBranchId || au.user?.email === currentUser?.email;
        }
        return true;
      });
      const mapped = filtered.map((au: any) => {
        labels[au.role.slug] = au.role.name;
        return { 
          id: au.user.id, 
          name: au.user.name, 
          email: au.user.email, 
          phone: au.user.mobile && !au.user.mobile.startsWith('adm_') ? au.user.mobile : '', 
          role: au.role.slug as any, 
          status: (au.isActive ? 'active' : 'inactive') as 'active' | 'inactive' 
        };
      });
      setAdminUsers(mapped);
      setRoleLabels(labels);
    }
  }, [adminUsersData, isSuperAdmin, userBranchId, currentUser]);

  useEffect(() => {
    if (usersData && Array.isArray(usersData)) {
      const mappedPatients: User[] = usersData
        .filter((u: any) => u.role === 'USER')
        .map((u: any) => ({
          id: u.id || `pat-${Math.floor(1000 + Math.random() * 9000)}`,
          name: u.name,
          email: u.email || (u.mobile ? `${u.mobile}@medsseva.com` : ''),
          phone: u.mobile || '',
          role: 'Patient' as any,
          status: (u.isActive !== false ? 'active' : 'inactive') as 'active' | 'inactive',
          avatarUrl: u.avatarUrl || undefined,
          uhid: u.uhid,
          dob: u.dob || undefined,
          gender: u.gender || undefined,
          bloodGroup: u.bloodGroup || undefined,
          familyMembers: u.familyMembers,
          branchId: u.branchId,
        }));
      setBackendPatients(mappedPatients);
    }
  }, [usersData]);

  useEffect(() => {
    if (partnersData && Array.isArray(partnersData)) {
      const mappedPartners: User[] = partnersData.map((p: any) => ({
        id: p.user?.id || p.id,
        name: p.user?.name || p.labName || 'Pathology Partner',
        email: p.user?.email || (p.user?.mobile ? `${p.user.mobile}@medsseva.com` : ''),
        phone: p.user?.mobile || '',
        role: 'PATHOLOGY_PARTNER' as any,
        status: (p.approvalStatus === 'APPROVED' ? 'active' : 'inactive') as 'active' | 'inactive',
        labName: p.labName,
        partnerRole: p.role,
        approvalStatus: p.approvalStatus,
        branchId: p.branchId,
      }));
      setPartners(mappedPartners);
    }
  }, [partnersData]);

  useEffect(() => {
    const loadAdminUsers = async () => {
      try {
        const data = await adminUserService.getAdminUsers();
        if (data && Array.isArray(data)) {
          const labels: Record<string, string> = {};
          const filtered = data.filter((au: any) => {
            if (!isSuperAdmin && userBranchId) {
              return au.branchId === userBranchId || au.branch?.id === userBranchId || au.user?.email === currentUser?.email;
            }
            return true;
          });
          const mapped = filtered.map((au: any) => {
            labels[au.role.slug] = au.role.name;
            return {
              id: au.user.id,
              name: au.user.name,
              email: au.user.email,
              phone: au.user.mobile && !au.user.mobile.startsWith('adm_') ? au.user.mobile : '',
              role: au.role.slug as any,
              status: (au.isActive ? 'active' : 'inactive') as 'active' | 'inactive',
            };
          });
          setAdminUsers(mapped);
          setRoleLabels(labels);
        }
      } catch (error) {
        console.error('Error fetching admin users:', error);
      }
    };

    const loadPartners = async () => {
      try {
        const data = await testService.getPartners();
        if (data && Array.isArray(data)) {
          const mapped = data.map((p: any) => ({
            id: p.user?.id || p.id,
            name: p.user?.name || p.labName || 'Pathology Partner',
            email: p.user?.email || (p.user?.mobile ? `${p.user.mobile}@medsseva.com` : ''),
            phone: p.user?.mobile || '',
            role: 'PATHOLOGY_PARTNER' as any,
            status: (p.approvalStatus === 'APPROVED' ? 'active' : 'inactive') as 'active' | 'inactive',
            labName: p.labName,
            partnerRole: p.role,
            approvalStatus: p.approvalStatus,
            branchId: p.branchId,
          }));
          setPartners(mapped);
        }
      } catch (error) {
        console.error('Error fetching partners:', error);
      }
    };

    const loadBackendUsers = async () => {
      try {
        const data = await testService.getRegisteredUsers();
        if (data && Array.isArray(data)) {
          const mapped = data
            .filter((u: any) => u.role === 'USER')
        .map((u: any) => ({
              id: u.id || `pat-${Math.floor(1000 + Math.random() * 9000)}`,
              name: u.name,
              email: u.email || `${u.mobile}@medsseva.com`,
              phone: u.mobile,
              role: 'Patient' as any,
              status: 'active' as const,
              avatarUrl: u.avatarUrl || undefined,
              uhid: u.uhid,
              dob: u.dob || undefined,
              gender: u.gender || undefined,
              bloodGroup: u.bloodGroup || undefined,
              familyMembers: u.familyMembers,
            }));
          setBackendPatients(mapped);
        }
      } catch (error) {
        console.error('Error fetching patients from backend:', error);
      }
    };

    Promise.all([loadAdminUsers(), loadPartners(), loadBackendUsers()]).finally(() =>
      setPageLoading(false)
    );
  }, []);
  // Drawer States for Registering Operators
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('technician');
  const [formFranchiseId, setFormFranchiseId] = useState('');

 const openRegisterDrawer = () => {
    window.location.href = '/admin-users';
  };

const handleRegisterUser = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = '/admin-users';
  };

  const { bookings } = useAppSelector(state => state.bookings);
  useBookingsQuery();

  const branchPatientIds = useMemo(() => {
    if (isSuperAdmin || !userBranchId) return null;
    return new Set(
      (bookings || [])
        .filter(b => b.branchId === userBranchId)
        .map(b => (b.patient as any)?.id || (b as any).userId)
        .filter(Boolean)
    );
  }, [bookings, isSuperAdmin, userBranchId]);

  const filteredPatients = useMemo(() => {
    if (isSuperAdmin || !userBranchId) return backendPatients;
    return backendPatients.filter(p => branchPatientIds?.has(p.id) || (p as any).branchId === userBranchId);
  }, [backendPatients, branchPatientIds, isSuperAdmin, userBranchId]);

  const filteredPartners = useMemo(() => {
    if (isSuperAdmin || !userBranchId) return partners;
    return partners.filter((p: any) => p.branchId === userBranchId);
  }, [partners, isSuperAdmin, userBranchId]);

  const displayList = useMemo(() => {
    const combined = [...adminUsers, ...filteredPatients, ...filteredPartners];
    const seen = new Set<string>();
    const unique = combined.filter(u => {
      if (!u || !u.id || seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });

    return unique.filter(user => {
      if (!user || !user.name) return false;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        user.name.toLowerCase().includes(q) ||
        (user.email && user.email.toLowerCase().includes(q)) ||
        (user.phone && user.phone.includes(q)) ||
        (Boolean((user as any).uhid) && String((user as any).uhid).toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (activeRole === 'All') return true;

      if (activeRole === 'Patient') {
        return (user.role as string) === 'Patient' || (user as any).role === 'USER';
      }

      if (activeRole === 'PATHOLOGY_PARTNER') {
        return (user.role as string) === 'PATHOLOGY_PARTNER';
      }

      const uRole = String(user.role || '').toLowerCase();
      const aRole = String(activeRole || '').toLowerCase();
      return uRole === aRole;
    });
  }, [adminUsers, filteredPatients, filteredPartners, search, activeRole]);

  const distinctRoles = useMemo(() => {
    return ['All', ...Object.keys(roleLabels), 'Patient', 'PATHOLOGY_PARTNER'];
  }, [roleLabels]);

  // Confirmation modal state for suspending credentials
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    action: 'suspend' | 'reactivate';
  }>({ isOpen: false, userId: '', userName: '', action: 'suspend' });
  const [isUpdatingLock, setIsUpdatingLock] = useState(false);

  const toggleUserLock = (userId: string) => {
    const target = adminUsers.find(u => u.id === userId);
    if (!target) return;
    setConfirmModal({
      isOpen: true,
      userId,
      userName: target.name,
      action: target.status === 'active' ? 'suspend' : 'reactivate',
    });
  };

  const confirmToggleLock = async () => {
    const { userId, action } = confirmModal;
    const target = adminUsers.find(u => u.id === userId);
    if (!target) return;
    setIsUpdatingLock(true);
    try {
      const adminData = await adminUserService.getAdminUsers();
      const adminRecord = adminData.find((au: any) => au.user.id === userId);
      if (!adminRecord) return;
      await adminUserService.updateAdminUser(adminRecord.id, { isActive: action === 'reactivate' });
      setAdminUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, status: action === 'suspend' ? 'inactive' : 'active' } : u
      ));
      toast.success(action === 'suspend' ? 'Credentials suspended successfully' : 'User reactivated successfully');
      setConfirmModal({ isOpen: false, userId: '', userName: '', action: 'suspend' });
    } catch {
      toast.error('Failed to update user status');
    } finally {
      setIsUpdatingLock(false);
    }
  };

if (pageLoading) {
    return (
      <div className="space-y-6 pb-10 animate-pulse">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 bg-muted rounded w-64" />
            <div className="h-4 bg-muted rounded w-96" />
          </div>
          <div className="h-10 bg-muted rounded-xl w-36" />
        </div>

        <div className="flex items-center gap-1.5 border-b border-border pb-1">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 bg-muted rounded-lg w-24" />
          ))}
        </div>

        <div className="h-9 bg-muted rounded-lg w-80" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 bg-muted rounded w-28" />
                      <div className="h-2.5 bg-muted rounded w-20" />
                    </div>
                  </div>
                  <div className="h-5 bg-muted rounded w-16" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              </div>
              <div className="flex justify-end pt-3 border-t border-border">
                <div className="h-7 bg-muted rounded-lg w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">User Matrix & Operators</h1>
          <p className="text-sm text-muted-foreground">Manage corporate administration, franchise handlers, internal doctors, phlebotomists, and patients.</p>
        </div>
        
        <button
          onClick={openRegisterDrawer}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-98 transition-all text-sm self-start md:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Register Operator</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 border-b border-border">
     {distinctRoles.map(role => (
          <button
            key={role}
            onClick={() => setActiveRole(role)}
            className={cn(
              "px-4 py-2 text-xs font-bold whitespace-nowrap rounded-t-lg border-b-2 transition-all",
              activeRole === role 
                ? "border-primary text-primary bg-primary/5" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            {role === 'All' 
              ? 'All Directory' 
              : role === 'PATHOLOGY_PARTNER' 
                ? 'Pathology Partners' 
                : role === 'Patient'
                  ? 'Patient'
                  : roleLabels[role] || ROLE_LABELS[role as UserRole] || role}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input 
          type="text"
          placeholder="Search directory by name, ID, phone..."
          className="w-full pl-9 pr-4 py-2 bg-card border border-input rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Grid / Table of Users */}
      {displayList.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          <UserCircle2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="font-semibold text-sm text-foreground">No users found</p>
          <p className="text-xs text-muted-foreground mt-1">There are no users registered under this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayList.map(user => {
            const isLocked = user.status === 'inactive';
            const theme = ROLE_THEMES[user.role as string] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
            const isRealPatient = (user.role as string) === 'Patient' || (user as any).role === 'USER';
            const isPartner = (user.role as string) === 'PATHOLOGY_PARTNER';

            return (
              <div
                key={`${user.role}-${user.id}`}
                className={cn(
                  "bg-card border rounded-xl p-5 shadow-sm flex flex-col justify-between relative group transition-all",
                  isLocked ? "opacity-60 grayscale border-dashed" : "border-border hover:border-primary/30 hover:shadow-md"
                )}
              >
                <div className="space-y-4">
                  {/* Head */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                          {isRealPatient ? <HeartPulse className="h-5 w-5 text-emerald-600" /> : <UserCircle2 className="h-6 w-6" />}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                          {user.name}
                        </div>
                        <div className="text-xs font-mono text-muted-foreground">
                          {user.uhid ? `UHID: ${user.uhid}` : user.id}
                        </div>
                      </div>
                    </div>
                    
                    <span className={cn(
                      "text-[9px] font-black px-2 py-0.5 border rounded uppercase tracking-wide",
                      theme.bg, theme.text, theme.border
                    )}>
                      {isRealPatient 
                        ? 'Patient' 
                        : isPartner 
                          ? 'Pathology Partner' 
                          : roleLabels[user.role] || ROLE_LABELS[user.role as UserRole] || user.role}
                    </span>
                  </div>

             <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{user.phone}</span>
                  </div>
                  {isRealPatient && (user as any).gender && (
                    <div className="flex items-center gap-2">
                      <UserCircle2 className="h-3.5 w-3.5" />
                      <span>{(user as any).gender}</span>
                    </div>
                  )}
                  {isRealPatient && (user as any).dob && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground">DOB:</span>
                      <span>{(user as any).dob}</span>
                    </div>
                  )}
                  {isRealPatient && (user as any).bloodGroup && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-rose-500">●</span>
                      <span className="font-bold text-rose-600">{(user as any).bloodGroup}</span>
                    </div>
                  )}
              {user.franchiseId && (
                    <div className="flex items-center gap-2 text-amber-700 font-medium">
                      <Briefcase className="h-3.5 w-3.5" />
                      <span>Linked Franchise: {user.franchiseId}</span>
                    </div>
                  )}
                  {(user as any).labName && (
                    <div className="flex items-center gap-2 text-indigo-700 font-medium">
                      <Briefcase className="h-3.5 w-3.5" />
                      <span>Lab: {(user as any).labName} · {(user as any).partnerRole}</span>
                    </div>
                  )}
                  {(user as any).approvalStatus && (
                    <div className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded border w-fit mt-1",
                      (user as any).approvalStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      (user as any).approvalStatus === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-rose-50 text-rose-700 border-rose-200'
                    )}>
                      {(user as any).approvalStatus}
                    </div>
                  )}
                  {user.familyMembers && user.familyMembers.length > 0 && (
                    <div className="flex items-start gap-2 mt-2 pt-2 border-t border-border">
                      <HeartPulse className="h-3.5 w-3.5 mt-0.5 text-primary" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">Family Profiles ({user.familyMembers.length})</span>
                        <span className="text-[10px]">{user.familyMembers.map(f => `${f.name} (${f.relation})`).join(', ')}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Operator Controls */}
              {!isRealPatient && (
                <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-border">
                  <button
                    onClick={() => toggleUserLock(user.id)}
                    className={cn(
                      "p-1.5 rounded-lg border flex items-center gap-1 text-[10px] font-bold transition-colors bg-background",
                      isLocked 
                        ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50" 
                        : "border-rose-200 text-rose-600 hover:bg-rose-50"
                    )}
                  >
                    {isLocked ? (
                      <>
                        <Unlock className="h-3 w-3" /> Reactivate Login
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3" /> Suspend Credentials
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}


      <AnimatePresence>
        {confirmModal.isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => !isUpdatingLock && setConfirmModal(m => ({ ...m, isOpen: false }))}
              className="fixed inset-0 z-40 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                {/* Modal Header */}
                <div className={cn(
                  "px-6 pt-6 pb-4 flex flex-col items-center text-center gap-3",
                )}>
                  <div className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center",
                    confirmModal.action === 'suspend' ? "bg-rose-100" : "bg-emerald-100"
                  )}>
                    {confirmModal.action === 'suspend'
                      ? <Lock className={cn("w-7 h-7", "text-rose-600")} />
                      : <Unlock className={cn("w-7 h-7", "text-emerald-600")} />
                    }
                  </div>
                  <div>
                    <h3 className="text-base font-black text-foreground tracking-tight">
                      {confirmModal.action === 'suspend' ? 'Suspend Credentials?' : 'Reactivate User?'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-snug">
                      {confirmModal.action === 'suspend'
                        ? <>This will immediately revoke login access for <span className="font-bold text-foreground">{confirmModal.userName}</span>. They won't be able to sign in until reactivated.</>
                        : <>This will restore full login access for <span className="font-bold text-foreground">{confirmModal.userName}</span>.</>
                      }
                    </p>
                  </div>
                </div>

                {/* Warning note */}
                {confirmModal.action === 'suspend' && (
                  <div className="mx-6 mb-4 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
                    <span className="text-rose-500 mt-0.5 text-xs"></span>
                    <p className="text-[11px] text-rose-700 font-medium leading-snug">
                      Any active sessions for this user will be terminated immediately.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="px-6 pb-6 flex gap-3">
                  <button
                    onClick={() => !isUpdatingLock && setConfirmModal(m => ({ ...m, isOpen: false }))}
                    disabled={isUpdatingLock}
                    className="flex-1 h-10 border border-border rounded-xl text-sm font-bold hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmToggleLock}
                    disabled={isUpdatingLock}
                    className={cn(
                      "flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-70",
                      confirmModal.action === 'suspend'
                        ? "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200"
                        : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200"
                    )}
                  >
                    {isUpdatingLock ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : confirmModal.action === 'suspend' ? (
                      <><Lock className="w-3.5 h-3.5" /> Suspend Now</>
                    ) : (
                      <><Unlock className="w-3.5 h-3.5" /> Reactivate</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

   
      <AnimatePresence>
        {isDrawerOpen && (
          <>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-black"
            />
            
   
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col h-full"
            >
            
              <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                    <UserCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground leading-none tracking-tight">Register New Operator</h3>
                    <span className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase mt-1 block leading-none">DIRECTORY ACCESS</span>
                  </div>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

             
              <form id="registerUserForm" onSubmit={handleRegisterUser} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                
             
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Operator Full Name <span className="text-destructive">*</span></label>
                  <input 
                    type="text" 
                    value={formName} 
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Dr. Siddharth Roy"
                    required
                    className={cn(
                      "w-full h-10 border rounded-lg px-3 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/20 font-medium transition-all",
                      hasAttemptedSubmit && !formName ? "border-destructive" : "border-input"
                    )}
                  />
                </div>

         
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Registered Email <span className="text-destructive">*</span></label>
                    <input 
                      type="email" 
                      value={formEmail} 
                      onChange={e => setFormEmail(e.target.value)}
                      placeholder="e.g. siddharth@medsseva.com"
                      required
                      className={cn(
                        "w-full h-10 border rounded-lg px-3 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/20 font-medium transition-all",
                        hasAttemptedSubmit && !formEmail ? "border-destructive" : "border-input"
                      )}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Mobile Number <span className="text-destructive">*</span></label>
                    <input 
                      type="tel" 
                      value={formPhone} 
                      onChange={e => setFormPhone(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      required
                      className={cn(
                        "w-full h-10 border rounded-lg px-3 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/20 font-medium transition-all",
                        hasAttemptedSubmit && !formPhone ? "border-destructive" : "border-input"
                      )}
                    />
                  </div>
                </div>

     
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Corporate Access Role</label>
                  <select
                    value={formRole}
                    onChange={e => setFormRole(e.target.value as UserRole)}
                    className="w-full h-10 border border-input rounded-lg px-3 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                  >
                    <option value="technician">Lab Scientist (Technician)</option>
                    <option value="phlebotomist">Field Collector (Phlebotomist)</option>
                    <option value="lab_staff">Laboratory Staff</option>
                    <option value="doctor">Authorized Doctor</option>
                    <option value="franchise_admin">Franchise Owner</option>
                    <option value="super_admin">Super Administrator</option>
                  </select>
                </div>

            
                {(formRole === 'franchise_admin' || formRole === 'phlebotomist') && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-1.5"
                  >
                    <label className="text-xs font-bold text-foreground">Linked Franchise Branch ID</label>
                    <input 
                      type="text" 
                      value={formFranchiseId} 
                      onChange={e => setFormFranchiseId(e.target.value)}
                      placeholder="e.g. MUM-CENT-02"
                      className="w-full h-10 border border-input rounded-lg px-3 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/20 font-medium transition-all"
                    />
                    <p className="text-[10px] text-muted-foreground">Optional: Maps this collector or owner strictly to franchise commissions.</p>
                  </motion.div>
                )}

              </form>

         
              <div className="h-16 px-6 border-t border-border bg-card flex items-center justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 h-10 border border-border rounded-xl text-sm font-bold hover:bg-muted hover:text-foreground transition-colors active:scale-98"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="registerUserForm"
                  className="px-5 h-10 bg-primary text-primary-foreground font-bold rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 flex items-center gap-2 transition-all active:scale-98 text-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Create Credentials</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
