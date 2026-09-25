import { useState } from 'react';
import { useBranchesQuery } from '@/hooks/useAdminQueries';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import {
  fetchBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  toggleBranchStatus,
} from '../redux/slices/branchSlice';
import { Branch, BranchFormData } from '../services/branch.service';
import { adminUserService, doctorService } from '../services/api';
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  MapPin,
  Phone,
  Mail,
  Clock,
  X,
  Search,
  Home,
  Microscope,
  CheckCircle,
  Eye,
  Users,
  UserCheck,
  Stethoscope,
  Briefcase,
  Building2,
  Loader2,
  ShieldCheck,
  Award
} from 'lucide-react';
import { useToast } from '../components/Toast';

const DEFAULT_SLOTS = [
  '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM', '08:00 AM',
  '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM',
  '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM',
  '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM',
];

const emptyForm: BranchFormData = {
  name: '', code: '', line1: '', city: '', state: 'Maharashtra',
  pincode: '', contactNumber: '', email: '', workingHours: '',
  availableSlots: [], homeCollection: true, labVisit: true, isActive: true,
  latitude: undefined, longitude: undefined,
};

export default function Branches() {
  const dispatch = useDispatch<AppDispatch>();
  const { branches, loading } = useSelector((s: RootState) => (s as any).branches);

  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'admin' | 'partner'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<BranchFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // View Branch Details Modal State
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [branchAdmins, setBranchAdmins] = useState<any[]>([]);
  const [branchDoctors, setBranchDoctors] = useState<any[]>([]);
  const [branchStaff, setBranchStaff] = useState<any[]>([]);
  const [viewTab, setViewTab] = useState<'all' | 'admins' | 'doctors' | 'staff'>('all');
  const currentUser = useSelector((s: RootState) => (s as any).auth?.user);
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'SUPER_ADMIN' || (currentUser as any)?.isSuperAdmin;
  const userBranchId = (currentUser as any)?.branchId;

  useBranchesQuery();

  const baseBranches = (branches || []).filter((b: Branch) => {
    if (!isSuperAdmin && userBranchId) {
      return b.id === userBranchId;
    }
    return true;
  });

  const filtered = baseBranches.filter((b: Branch) => {
    const matchesSearch = !search || 
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.city.toLowerCase().includes(search.toLowerCase()) ||
      b.pincode.includes(search) ||
      b.code.toLowerCase().includes(search.toLowerCase());
    
    const matchesLoc = !locationFilter || 
      b.city.toLowerCase().includes(locationFilter.toLowerCase()) ||
      (b.state || '').toLowerCase().includes(locationFilter.toLowerCase()) ||
      b.pincode.includes(locationFilter);
      
    const isPartner = !!(b as any).isPartnerLab;
    const matchesType = typeFilter === 'all' ? true : (typeFilter === 'partner' ? isPartner : !isPartner);
    
    return matchesSearch && matchesLoc && matchesType;
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (b: Branch) => {
    setEditing(b);
    setForm({
      name: b.name, code: b.code, line1: b.line1, city: b.city,
      state: b.state, pincode: b.pincode, latitude: b.latitude,
      longitude: b.longitude, contactNumber: b.contactNumber || '',
      email: b.email || '', workingHours: b.workingHours || '',
      availableSlots: Array.isArray(b.availableSlots) && b.availableSlots.length > 0 ? b.availableSlots : [...DEFAULT_SLOTS],
      homeCollection: b.homeCollection,
      labVisit: b.labVisit, isActive: b.isActive,
    });
    setModalOpen(true);
  };

  const handleSlotToggle = (slot: string) => {
    setForm(f => {
      const current = Array.isArray(f.availableSlots) ? f.availableSlots : [];
      const updated = current.includes(slot)
        ? current.filter(s => s !== slot)
        : [...current, slot];
      return { ...f, availableSlots: updated };
    });
  };

  const handleSelectAllSlots = () => {
    setForm(f => ({ ...f, availableSlots: [...DEFAULT_SLOTS] }));
  };

  const handleClearSlots = () => {
    setForm(f => ({ ...f, availableSlots: [] }));
  };

  const openView = async (b: Branch) => {
    setSelectedBranch(b);
    setViewModalOpen(true);
    setLoadingMembers(true);
    setViewTab('all');

    try {
      const [usersRes, docsRes] = await Promise.allSettled([
        adminUserService.getAdminUsers(),
        doctorService.getDoctors({ branchId: b.id }),
      ]);

      let allUsers: any[] = [];
      if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) {
        allUsers = usersRes.value.filter((u: any) => {
          if (u.branchId === b.id) return true;
          if (u.branch && u.branch.id === b.id) return true;
          if (u.branch?.name && b.name && u.branch.name.toLowerCase() === b.name.toLowerCase()) return true;
          if (u.user?.email && b.email && u.user.email.toLowerCase() === b.email.toLowerCase()) return true;
          return false;
        });
      }

      let allDocs: any[] = [];
      if (docsRes.status === 'fulfilled' && docsRes.value?.data) {
        allDocs = docsRes.value.data;
      } else if (docsRes.status === 'fulfilled' && Array.isArray(docsRes.value)) {
        allDocs = docsRes.value;
      }

      // Filter Admins & Managers (handles user.role === 'ADMIN', userType === 'ADMIN', role.slug, and designation)
      const admins = allUsers.filter((u: any) => {
        const uType = (u.userType || '').toUpperCase();
        const uRole = (u.user?.role || '').toUpperCase();
        const rSlug = (u.role?.slug || '').toLowerCase();
        const rName = (u.role?.name || '').toLowerCase();
        const desig = (u.designation || '').toLowerCase();
        const isDoc = uType === 'DOCTOR' || (!!u.registrationNo && !u.department);
        
        if (isDoc) return false;
        return (
          uType === 'ADMIN' ||
          uRole === 'ADMIN' ||
          rSlug.includes('admin') ||
          rSlug.includes('manager') ||
          rName.includes('admin') ||
          rName.includes('manager') ||
          desig.includes('admin') ||
          desig.includes('manager')
        );
      });

      // Filter Doctors
      const docs = allDocs.length > 0 
        ? allDocs 
        : allUsers.filter((u: any) => u.userType === 'DOCTOR' || (!!u.registrationNo && !u.department));

      // Filter pure Staff / Technicians / Phlebotomists
      const staff = allUsers.filter((u: any) => {
        const isDoc = u.userType === 'DOCTOR' || (!!u.registrationNo && !u.department);
        const uType = (u.userType || '').toUpperCase();
        const uRole = (u.user?.role || '').toUpperCase();
        const rSlug = (u.role?.slug || '').toLowerCase();
        const rName = (u.role?.name || '').toLowerCase();
        const desig = (u.designation || '').toLowerCase();
        const isAdmin = (
          uType === 'ADMIN' ||
          uRole === 'ADMIN' ||
          rSlug.includes('admin') ||
          rSlug.includes('manager') ||
          rName.includes('admin') ||
          rName.includes('manager') ||
          desig.includes('admin') ||
          desig.includes('manager')
        );
        return !isDoc && !isAdmin;
      });

      setBranchAdmins(admins);
      setBranchDoctors(docs);
      setBranchStaff(staff);
    } catch (err) {
      console.error('Failed to load branch members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };


  const handleSubmit = async () => {
    if (!form.name || !form.code || !form.line1 || !form.city || !form.pincode) {
      error('Missing Fields', 'Please fill all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await dispatch(updateBranch({ id: editing.id, data: form })).unwrap();
        success('Updated', 'Branch updated successfully');
      } else {
        await dispatch(createBranch(form)).unwrap();
        success('Created', 'Branch created successfully');
      }
      setModalOpen(false);
      dispatch(fetchBranches());
    } catch (e: any) {
      error('Error', e?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (b: Branch) => {
    try {
      await dispatch(toggleBranchStatus({ id: b.id, isActive: !b.isActive })).unwrap();
      success('Status Changed', `Branch ${!b.isActive ? 'activated' : 'deactivated'}`);
      dispatch(fetchBranches());
    } catch (e: any) {
      error('Error', e?.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteBranch(id)).unwrap();
      success('Deleted', 'Branch deleted successfully');
      setDeleteConfirm(null);
      dispatch(fetchBranches());
    } catch (e: any) {
      error('Error', e?.message || 'Failed to delete branch');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branch Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all MedSeva collection branches & team rosters</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
        >
          <Plus size={16} /> Add Branch
        </button>
      </div>

      {/* Search Bar & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by name, city, pincode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        
        <input
          type="text"
          placeholder="Filter Location (City/Pincode)"
          value={locationFilter}
          onChange={e => setLocationFilter(e.target.value)}
          className="border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full sm:w-56"
        />
        
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as any)}
          className="border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full sm:w-48 cursor-pointer"
        >
          <option value="all">All Branch Types</option>
          <option value="admin">Admin Owned</option>
          <option value="partner">Lab Partner</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <div className="text-xs text-gray-500 font-medium">Total Branches</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{branches.length}</div>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <div className="text-xs text-gray-500 font-medium">Active</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {branches.filter((b: Branch) => b.isActive).length}
          </div>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <div className="text-xs text-gray-500 font-medium">Inactive</div>
          <div className="text-2xl font-bold text-red-500 mt-1">
            {branches.filter((b: Branch) => !b.isActive).length}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading branches...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No branches found</div>
      ) : (
        <div className="bg-white border rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-sm text-left min-w-[700px]">
            <thead className="bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wider border-b">
              <tr>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Services</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((b: Branch) => (
                <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-gray-900">{b.name}</div>
                      {(b as any).isPartnerLab ? (
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full uppercase">Partner Lab</span>
                      ) : (
                        <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full uppercase">Admin Owned</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{b.code}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-600 text-xs">
                      <MapPin size={12} className="shrink-0 text-gray-400" />
                      <span>{b.line1}, {b.city} - {b.pincode}</span>
                    </div>
                    {b.workingHours && (
                      <div className="flex items-center gap-1 text-gray-400 mt-1">
                        <Clock size={11} />
                        <span className="text-xs">{b.workingHours}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {b.contactNumber && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Phone size={11} /> {b.contactNumber}
                      </div>
                    )}
                    {b.email && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                        <Mail size={11} /> {b.email}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full w-fit ${b.homeCollection ? 'bg-purple-100 text-purple-700 font-medium' : 'bg-gray-100 text-gray-400'}`}>
                        <Home size={12} /> Home Collection
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full w-fit ${b.labVisit ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-400'}`}>
                        <Microscope size={12} /> Lab Visit
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${b.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-500'}`}>
                      {b.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View Members Eye Button */}
                      <button
                        onClick={() => openView(b)}
                        title="View Branch Team & Staff"
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 transition-colors"
                      >
                        <Eye size={17} />
                      </button>

                      <button onClick={() => handleToggle(b)} title="Toggle status" className="p-1">
                        {b.isActive
                          ? <ToggleRight size={22} className="text-emerald-500 hover:text-emerald-700" />
                          : <ToggleLeft size={22} className="text-gray-400 hover:text-gray-600" />}
                      </button>
                      <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors" title="Edit Branch">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setDeleteConfirm(b.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete Branch">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">Delete Branch?</h3>
            <p className="text-sm text-gray-500">This will permanently remove the branch from the system. This action cannot be undone.</p>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Branch Team & Staff Modal */}
      {viewModalOpen && selectedBranch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-border bg-gradient-to-r from-indigo-50/50 to-background dark:from-indigo-950/20 dark:to-card flex items-start justify-between flex-shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                      {selectedBranch.name}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${selectedBranch.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-600'}`}>
                        {selectedBranch.isActive ? 'Active Branch' : 'Inactive'}
                      </span>
                    </h2>
                    <p className="text-xs text-muted-foreground">Code: {selectedBranch.code} • {selectedBranch.city}, {selectedBranch.state}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-indigo-500" /> {selectedBranch.line1} - {selectedBranch.pincode}</span>
                  {selectedBranch.contactNumber && (
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-indigo-500" /> {selectedBranch.contactNumber}</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setViewModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-4 gap-3 p-4 bg-muted/30 border-b border-border text-center flex-shrink-0">
              <div className="bg-card p-2.5 rounded-xl border border-border">
                <div className="text-[11px] font-semibold text-muted-foreground">Total Team</div>
                <div className="text-base font-bold text-foreground mt-0.5">{branchAdmins.length + branchDoctors.length + branchStaff.length}</div>
              </div>
              <div className="bg-card p-2.5 rounded-xl border border-border">
                <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">Managers / Admins</div>
                <div className="text-base font-bold text-foreground mt-0.5">{branchAdmins.length}</div>
              </div>
              <div className="bg-card p-2.5 rounded-xl border border-border">
                <div className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">Doctors</div>
                <div className="text-base font-bold text-foreground mt-0.5">{branchDoctors.length}</div>
              </div>
              <div className="bg-card p-2.5 rounded-xl border border-border">
                <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Staff / Techs</div>
                <div className="text-base font-bold text-foreground mt-0.5">{branchStaff.length}</div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-border text-xs font-semibold">
              {[
                { key: 'all', label: `All Personnel (${branchAdmins.length + branchDoctors.length + branchStaff.length})` },
                { key: 'admins', label: `Branch Admins (${branchAdmins.length})` },
                { key: 'doctors', label: `Doctors (${branchDoctors.length})` },
                { key: 'staff', label: `Staff & Techs (${branchStaff.length})` },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setViewTab(t.key as any)}
                  className={`pb-2.5 px-2 border-b-2 transition-all ${viewTab === t.key ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Members Body List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {loadingMembers ? (
                <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> Loading branch personnel directory...
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Branch Managers Section */}
                  {(viewTab === 'all' || viewTab === 'admins') && branchAdmins.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" /> Branch Managers & Admins
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {branchAdmins.map(admin => (
                          <div key={admin.id} className="bg-card border border-border/80 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-200">
                                {admin.user?.name ? admin.user.name.slice(0, 2).toUpperCase() : 'AD'}
                              </div>
                              <div>
                                <div className="font-bold text-sm text-foreground">{admin.user?.name}</div>
                                <div className="text-xs text-muted-foreground">{admin.user?.email}</div>
                                <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                                  Role: {admin.role?.name || 'Branch Manager'}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                              Active
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Doctors Section */}
                  {(viewTab === 'all' || viewTab === 'doctors') && branchDoctors.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Stethoscope className="w-4 h-4 text-cyan-600" /> Doctors & Pathologists
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {branchDoctors.map((doc: any) => (
                          <div key={doc.id} className="bg-card border border-border/80 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-bold text-xs flex items-center justify-center border border-cyan-200">
                                Dr
                              </div>
                              <div>
                                <div className="font-bold text-sm text-foreground">Dr. {doc.name}</div>
                                <div className="text-xs text-muted-foreground">{doc.qualification || 'MBBS'} • Reg: {doc.registrationNo || 'Verified'}</div>
                                <div className="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold mt-0.5">
                                  {doc.designation || 'Consultant Pathologist'}
                                </div>
                              </div>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${doc.isActive !== false ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-600'}`}>
                              {doc.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Staff / Employees Section */}
                  {(viewTab === 'all' || viewTab === 'staff') && branchStaff.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-amber-600" /> Lab Technicians & Staff
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {branchStaff.map(st => (
                          <div key={st.id} className="bg-card border border-border/80 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center border border-amber-200">
                                {st.user?.name ? st.user.name.slice(0, 2).toUpperCase() : 'ST'}
                              </div>
                              <div>
                                <div className="font-bold text-sm text-foreground">{st.user?.name}</div>
                                <div className="text-xs text-muted-foreground">{st.user?.email} {st.user?.mobile ? `• ${st.user.mobile}` : ''}</div>
                                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                                  {st.designation || 'Lab Technician'} • <span className="text-muted-foreground">{st.department || 'Pathology Lab'}</span>
                                </div>
                              </div>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${st.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-600'}`}>
                              {st.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state if branch has no members */}
                  {branchAdmins.length === 0 && branchDoctors.length === 0 && branchStaff.length === 0 && (
                    <div className="py-12 text-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                        <Users className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-foreground">No Members Assigned</h4>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        There are currently no admins, doctors, or staff members linked to this branch. You can assign staff from the Staff page or Doctors page.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex justify-end flex-shrink-0 bg-muted/10">
              <button
                onClick={() => setViewModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Branch Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? 'Edit Branch' : 'Add New Branch'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Branch Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Bhopal Main Branch"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Branch Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. MSV-BHP-01"
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Address Line 1 *</label>
                <input
                  type="text"
                  placeholder="Plot/Shop No, Street, Area"
                  value={form.line1}
                  onChange={e => setForm(f => ({ ...f, line1: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">City *</label>
                  <input
                    type="text"
                    placeholder="e.g. Bhopal"
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">State</label>
                  <input
                    type="text"
                    placeholder="e.g. Madhya Pradesh"
                    value={form.state}
                    onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Pincode *</label>
                  <input
                    type="text"
                    placeholder="e.g. 462001"
                    value={form.pincode}
                    onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Contact Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={form.contactNumber}
                    onChange={e => setForm(f => ({ ...f, contactNumber: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Branch Email</label>
                  <input
                    type="email"
                    placeholder="e.g. bhopal@medseva.in"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Working Hours & Preset Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">Working Hours</label>
                  <span className="text-[11px] text-muted-foreground font-medium">Quick Select Presets:</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Mon-Sat: 07:00 AM - 08:00 PM"
                  value={form.workingHours}
                  onChange={e => setForm(f => ({ ...f, workingHours: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-2"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '07:00 AM - 08:00 PM',
                    '08:00 AM - 08:00 PM',
                    '06:00 AM - 09:00 PM',
                    'Mon-Sat: 07:00 AM - 08:00 PM',
                    'Mon-Sun: 06:00 AM - 10:00 PM',
                    '24x7 Open',
                  ].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, workingHours: preset }))}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition ${
                        form.workingHours === preset
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-muted/40 text-gray-700 border-border hover:bg-muted'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Available Time Slots Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Clock size={14} className="text-blue-600" /> Available Time Slots ({form.availableSlots?.length || 0} Selected)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllSlots}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleClearSlots}
                      className="text-[11px] text-gray-500 hover:text-gray-700 font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 p-3 bg-muted/20 border border-border rounded-xl max-h-48 overflow-y-auto">
                  {DEFAULT_SLOTS.map(slot => {
                    const isSelected = form.availableSlots?.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => handleSlotToggle(slot)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Services & Toggles */}
              <div className="flex flex-wrap gap-6 pt-2 border-t">
                {[
                  {
                    key: 'homeCollection',
                    label: (
                      <span className="inline-flex items-center gap-1">
                        <Home size={14} />
                        Home Collection
                      </span>
                    ),
                  },
                  {
                    key: 'labVisit',
                    label: (
                      <span className="inline-flex items-center gap-1">
                        <Microscope size={14} />
                        Lab Visit
                      </span>
                    ),
                  },
                  {
                    key: 'isActive',
                    label: (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle size={14} />
                        Active
                      </span>
                    ),
                  },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(form as any)[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700 flex items-center">
                      {label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalOpen(false)} className="flex-1 border rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={submitting}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                  {submitting ? 'Saving...' : editing ? 'Update Branch' : 'Create Branch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}