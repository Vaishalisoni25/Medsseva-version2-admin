import React, { useState, useCallback, useMemo,useEffect } from 'react';
import { useReportsQuery, useBookingsForReportQuery } from '@/hooks/useAdminQueries';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import {
  fetchBookingsForReport,
  createReportThunk,
  updateReportDraftThunk,
  verifyReportThunk,
  fetchAllReports,
} from '../redux/slices/reportSlice';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  AlertTriangle,
  ChevronRight,
  FileText,
  Search,
  X,
  Save,
  Plus,
  Trash2,
  Edit3,
  ChevronUp,
  ChevronDown,
  Building2,
  UserCheck,
  UserPlus,
  Check,
  Loader2,
  Sparkles,
  FileCheck,
  FlaskConical,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { branchService, Branch } from '../services/branch.service';
import { doctorService, testService, packageService, staffService } from '../services/api';
import { useToast } from '../components/Toast';
import { customFormatService } from '../services/customFormat.service';
import { CustomReportTemplate } from '../types/customFormat';

type Flag = 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL_HIGH' | 'CRITICAL_LOW' | 'PENDING';
type ResultType = 'NUMERIC' | 'TEXT' | 'POS_NEG' | 'YES_NO';

type RangeEntry = {
  gender: 'MALE' | 'FEMALE' | 'ANY';
  minAge: number;
  maxAge: number;
  minRange: number;
  maxRange: number;
};

type ParameterEntry = {
  parameterId: string;
  parameterName: string;
  category: string;
  value: string;
  unit: string;
  referenceRanges: RangeEntry[];
  referenceRange: string;
  resultType: ResultType;
  flag: Flag;
  isAbnormal: boolean;
  criticalLow: string;
  criticalHigh: string;
  interpretation: string;
  description: string;
  displayOrder: number;
};

type TestGroup = {
  testId: string;
  testName: string;
  parameters: ParameterEntry[];
};

type Notes = {
  clinicalNotes: string;
  technicianRemarks: string;
  doctorRemarks: string;
  internalNotes: string;
};

type VerificationDetails = {
  reportBranchId: string;
  doctorName: string;
  doctorQualification: string;
  doctorRegNo: string;
  doctorDesignation: string;
  doctorVerifiedAt: string;
  doctorSignatureUrl?: string;
  technicianName: string;
  technicianQualification: string;
  technicianSignatureUrl?: string;
};

const computeFlag = (value: string, param: ParameterEntry): Flag => {
  if (!value || value.trim() === '') return 'PENDING';

  if (param.resultType === 'TEXT') {
    if (!param.interpretation) return 'NORMAL';
    const expected = param.interpretation.trim().toLowerCase();
    const actual = value.trim().toLowerCase();
    return actual === expected ? 'NORMAL' : 'HIGH';
  }

  if (param.resultType === 'POS_NEG') {
    const v = value.trim().toLowerCase();
    return v === 'positive' || v === 'reactive' ? 'HIGH' : 'NORMAL';
  }

  const num = parseFloat(value);
  if (isNaN(num)) return 'PENDING';
  if (param.referenceRanges.length === 0) return 'NORMAL';
  const r = param.referenceRanges[0];
  const critLow = parseFloat(param.criticalLow);
  const critHigh = parseFloat(param.criticalHigh);
  if (!isNaN(critLow) && num < critLow) return 'CRITICAL_LOW';
  if (!isNaN(critHigh) && num > critHigh) return 'CRITICAL_HIGH';
  if (num < r.minRange) return 'LOW';
  if (num > r.maxRange) return 'HIGH';
  return 'NORMAL';
};
const buildRangeString = (ranges: RangeEntry[]): string => {
  if (!ranges || ranges.length === 0) return '';
  const r = ranges[0];
  return `${r.minRange} - ${r.maxRange}`;
};

const parseDbReferenceRanges = (raw: any, gender?: string, age?: number): RangeEntry[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;

  const g = (gender || '').toUpperCase();
  const resolvedGender: 'MALE' | 'FEMALE' | 'ANY' =
    g === 'MALE' ? 'MALE' : g === 'FEMALE' ? 'FEMALE' : 'ANY';

  const priorityKeys = [
    resolvedGender === 'MALE' ? 'male' : resolvedGender === 'FEMALE' ? 'female' : null,
    'general',
    'normal',
  ].filter(Boolean) as string[];

  const entries: RangeEntry[] = [];

  for (const key of Object.keys(raw)) {
    const val = raw[key];
    if (val && typeof val === 'object' && !('text' in val)) {
      const min = val.min ?? 0;
      const max = val.max ?? 0;
      const entryGender: 'MALE' | 'FEMALE' | 'ANY' =
        key === 'male' ? 'MALE' : key === 'female' ? 'FEMALE' : 'ANY';
      entries.push({ gender: entryGender, minAge: 0, maxAge: 120, minRange: min, maxRange: max });
    }
  }

  if (entries.length === 0) return [];

  const preferred = priorityKeys.find(k => raw[k] && typeof raw[k] === 'object' && !('text' in raw[k]));
  if (preferred) {
    const val = raw[preferred];
    const entryGender: 'MALE' | 'FEMALE' | 'ANY' =
      preferred === 'male' ? 'MALE' : preferred === 'female' ? 'FEMALE' : 'ANY';
    return [{ gender: entryGender, minAge: 0, maxAge: 120, minRange: val.min ?? 0, maxRange: val.max ?? 0 }, ...entries.filter(e => e.gender !== entryGender)];
  }

  return entries;
};

const getTextExpectation = (raw: any): string | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  for (const val of Object.values(raw)) {
    if (val && typeof val === 'object' && 'text' in (val as any)) {
      return (val as any).text as string;
    }
  }
  return null;
};

const buildTestGroups = (booking: any): TestGroup[] => {
  const groups: TestGroup[] = [];
  let order = 0;

const processTest = (test: any) => {
    if (!test) return;
    const parameters: ParameterEntry[] = (test.parameters || []).map((p: any) => {
      const textExpectation = getTextExpectation(p.referenceRanges);
      const ranges: RangeEntry[] = parseDbReferenceRanges(
        p.referenceRanges,
        booking.patientGender,
        booking.patientAge
      );
      const isTextType = textExpectation !== null;
      const isPosNeg = isTextType && /reactive|positive|negative/i.test(textExpectation);
      const resultType: ResultType = isPosNeg ? 'POS_NEG' : isTextType ? 'TEXT' : 'NUMERIC';
      return {
        parameterId: p.id,
        parameterName: p.name,
        category: '',
        value: '',
        unit: p.unit || '',
        referenceRanges: ranges,
        referenceRange: isTextType ? (textExpectation || '') : buildRangeString(ranges),
        resultType,
        flag: 'PENDING' as Flag,
        isAbnormal: false,
        criticalLow: '',
        criticalHigh: '',
        interpretation: textExpectation || '',
        description: '',
        displayOrder: order++,
      };
    });
    if (parameters.length > 0) {
      groups.push({ testId: test.id, testName: test.name, parameters });
    }
  };

  (booking.tests || []).forEach((bt: any) => processTest(bt.test));
  (booking.packages || []).forEach((bp: any) => {
    (bp.package?.testsIncluded || []).forEach((pt: any) => processTest(pt.test));
  });

  return groups;
};

const FLAG_CONFIG: Record<Flag, { label: string; className: string }> = {
  NORMAL: { label: 'Normal', className: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  HIGH: { label: 'High ↑', className: 'text-amber-600 bg-amber-50 border-amber-200' },
  LOW: { label: 'Low ↓', className: 'text-blue-600 bg-blue-50 border-blue-200' },
  CRITICAL_HIGH: { label: 'Critical ↑↑', className: 'text-red-600 bg-red-50 border-red-200' },
  CRITICAL_LOW: { label: 'Critical ↓↓', className: 'text-red-600 bg-red-50 border-red-200' },
  PENDING: { label: 'Pending', className: 'text-muted-foreground bg-muted border-border' },
};

const emptyParam = (order: number): ParameterEntry => ({
  parameterId: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  parameterName: '',
  category: '',
  value: '',
  unit: '',
  referenceRanges: [{ gender: 'ANY', minAge: 0, maxAge: 120, minRange: 0, maxRange: 0 }],
  referenceRange: '',
  resultType: 'NUMERIC',
  flag: 'PENDING',
  isAbnormal: false,
  criticalLow: '',
  criticalHigh: '',
  interpretation: '',
  description: '',
  displayOrder: order,
});

const toLocalDatetimeValue = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const emptyVerification = (): VerificationDetails => ({
  reportBranchId: '',
  doctorName: '',
  doctorQualification: '',
  doctorRegNo: '',
  doctorDesignation: '',
  doctorVerifiedAt: new Date().toISOString(),
  doctorSignatureUrl: '',
  technicianName: '',
  technicianQualification: 'DMLT',
  technicianSignatureUrl: '',
});

export const ReportBuilderPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(s => s.auth.user);
  const userBranchId = (currentUser as any)?.branchId || (currentUser as any)?.adminUser?.branchId;
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'SUPER_ADMIN' || (currentUser as any)?.isSuperAdmin;

  const { bookingsForReport = [], bookingsLoading, reports = [] } = useAppSelector(s => s.reports);
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const preselectedBookingId = new URLSearchParams(window.location.search).get('bookingId');

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 250);
    return () => clearTimeout(t);
  }, [searchInput]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [testGroups, setTestGroups] = useState<TestGroup[]>([]);
  const [notes, setNotes] = useState<Notes>({ clinicalNotes: '', technicianRemarks: '', doctorRemarks: '', internalNotes: '' });
  const [verification, setVerification] = useState<VerificationDetails>(emptyVerification());
  const [selectedBranchDetails, setSelectedBranchDetails] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [availableTechnicians, setAvailableTechnicians] = useState<any[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [reportTemplate, setReportTemplate] = useState<'STANDARD' | 'DETAILED'>('STANDARD');
  const [customReportTemplates, setCustomReportTemplates] = useState<CustomReportTemplate[]>([]);
  const [selectedCustomTemplateId, setSelectedCustomTemplateId] = useState<string>('');
  const [modalTab, setModalTab] = useState<'existing' | 'walkin'>('existing');
  const [walkinForm, setWalkinForm] = useState({
    patientName: '',
    mobile: '',
    address: '',
    gender: '',
    age: '',
    reference: '',
  });
  const [walkinErrors, setWalkinErrors] = useState<Record<string, string>>({});
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [testFilterQuery, setTestFilterQuery] = useState('');
  const [creatingWalkin, setCreatingWalkin] = useState(false);
  const [editingParam, setEditingParam] = useState<{ groupIdx: number; paramIdx: number } | null>(null);

  const currentReport = useMemo(() => {
    return reports.find((r: any) => r.bookingId === selectedBooking?.id) || selectedBooking?.report;
  }, [reports, selectedBooking]);

  const isReportCreated = Boolean(
    currentReport && (
      currentReport.id ||
      currentReport.status === 'GENERATED' ||
      currentReport.status === 'FINAL' ||
      currentReport.status === 'VERIFIED' ||
      currentReport.status === 'PUBLISHED' ||
      currentReport.pdfUrl ||
      selectedBooking?.status === 'COMPLETED' ||
      selectedBooking?.status === 'REPORT_GENERATED'
    )
  );

  useReportsQuery();
  useBookingsForReportQuery();

  useEffect(() => {
    branchService.getAll().then(res => {
      if (res?.data && Array.isArray(res.data)) {
        setBranches(res.data);
        if (userBranchId) {
          setVerification(v => ({ ...v, reportBranchId: v.reportBranchId || userBranchId }));
        } else if (res.data.length > 0) {
          setVerification(v => ({ ...v, reportBranchId: v.reportBranchId || res.data[0].id }));
        }
      }
    }).catch(() => {});

    customFormatService.getReportTemplates().then(templates => {
      setCustomReportTemplates(templates);
      const def = templates.find(t => t.isDefault && t.type === 'STANDARD') || templates[0];
      if (def) setSelectedCustomTemplateId(def.id);
    }).catch(() => {});

    testService.getAllTests().then(data => {
      if (Array.isArray(data)) setAvailableTests(data);
    }).catch(() => {});

    packageService.getAllPackages().then(data => {
      if (Array.isArray(data)) setAvailablePackages(data);
    }).catch(() => {});
  }, [userBranchId]);

  const validateWalkinForm = () => {
    const errors: Record<string, string> = {};
    if (!walkinForm.patientName.trim()) {
      errors.patientName = 'Patient Full Name is required.';
    }
    const cleanMobile = walkinForm.mobile.trim().replace(/\D/g, '');
    if (!cleanMobile) {
      errors.mobile = 'Mobile Number is required.';
    } else if (cleanMobile.length !== 10) {
      errors.mobile = 'Mobile Number must be 10 digits.';
    }
    if (!walkinForm.address.trim()) {
      errors.address = 'Address is required.';
    }
    if (!walkinForm.gender) {
      errors.gender = 'Gender is required.';
    }
    if (!walkinForm.age || isNaN(Number(walkinForm.age)) || Number(walkinForm.age) <= 0 || Number(walkinForm.age) > 130) {
      errors.age = 'Please enter a valid age (1-130).';
    }
    setWalkinErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGenerateWalkinReport = async () => {
    if (!validateWalkinForm()) {
      toast.error('Validation Error', 'Please complete all required fields.');
      return;
    }

    setCreatingWalkin(true);
    const effectiveBranchId =
      verification.reportBranchId ||
      userBranchId ||
      (branches.length > 0 ? branches[0].id : undefined);

    const payload = {
      patientName: walkinForm.patientName.trim(),
      mobile: walkinForm.mobile.trim().replace(/\D/g, ''),
      address: walkinForm.address.trim(),
      gender: walkinForm.gender,
      age: Number(walkinForm.age),
      reference: walkinForm.reference.trim() || undefined,
      testIds: selectedTestIds,
      packageIds: selectedPackageIds,
      branchId: effectiveBranchId,
    };

    console.log('[Walk-in Flow] Submitting Walk-in Patient Data:', payload);

    try {
      const newBooking = await testService.createWalkinBooking(payload);
      console.log('[Walk-in Flow] Successfully registered walk-in booking:', newBooking);

      toast.success('Patient Registered', 'Walk-in patient saved. Loading report builder...');

      dispatch(fetchBookingsForReport());
      dispatch(fetchAllReports());

      setWalkinForm({
        patientName: '',
        mobile: '',
        address: '',
        gender: '',
        age: '',
        reference: '',
      });
      setSelectedTestIds([]);
      setSelectedPackageIds([]);
      setWalkinErrors({});
      setModalTab('existing');
      setShowModal(false);

      handleSelectBooking(newBooking);
    } catch (err: any) {
      console.error('[Walk-in Flow] Error response:', err.response?.status, err.response?.data || err.message);
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Please check details and try again.';
      toast.error('Failed to create patient', errMsg);
    } finally {
      setCreatingWalkin(false);
    }
  };

  useEffect(() => {
    if (!preselectedBookingId || bookingsForReport.length === 0) return;
    const target = bookingsForReport.find((b: any) => b.id === preselectedBookingId);
    if (target && !selectedBooking) {
      handleSelectBooking(target);
    }
  }, [preselectedBookingId, bookingsForReport]);

  useEffect(() => {
    if (verification.reportBranchId) {
      const found = branches.find(b => b.id === verification.reportBranchId) || null;
      setSelectedBranchDetails(found);
    } else {
      setSelectedBranchDetails(null);
    }
  }, [verification.reportBranchId, branches]);

  useEffect(() => {
    const branchId = verification.reportBranchId;
    if (!branchId) {
      setAvailableDoctors([]);
      setSelectedDoctorId('');
      return;
    }

    const selectedBranch = branches.find(b => b.id === branchId);
    const isPartner = (selectedBranch as any)?.isPartnerLab;
    const query = isPartner ? { partnerId: branchId } : { branchId };

    doctorService.getDoctors(query).then(res => {
      const docs = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : []);
      const branchDocs = docs.filter((d: any) => 
        isPartner ? d.partnerId === branchId : (d.branchId === branchId || d.branch?.id === branchId)
      );
      setAvailableDoctors(branchDocs);

      if (isReportCreated) return;

      if (branchDocs.length > 0) {
        const matchedDoc = branchDocs.find((d: any) => d.id === selectedDoctorId) || branchDocs[0];
        setSelectedDoctorId(matchedDoc.id);
        setVerification(v => ({
          ...v,
          doctorName: matchedDoc.name,
          doctorQualification: matchedDoc.qualification || '',
          doctorRegNo: matchedDoc.registrationNo || '',
          doctorDesignation: matchedDoc.designation || 'Senior Pathologist',
          doctorSignatureUrl: matchedDoc.signatureUrl || '',
        }));
      } else {
        setSelectedDoctorId('');
        setVerification(v => ({
          ...v,
          doctorName: '',
          doctorQualification: '',
          doctorRegNo: '',
          doctorDesignation: '',
          doctorSignatureUrl: '',
        }));
      }
    }).catch(err => {
      console.error('Failed to load branch doctors:', err);
    });
  }, [verification.reportBranchId, isReportCreated]);

  useEffect(() => {
    const branchId = verification.reportBranchId;
    if (!branchId) {
      setAvailableTechnicians([]);
      setSelectedTechnicianId('');
      return;
    }

    const selectedBranch = branches.find(b => b.id === branchId);
    const isPartner = (selectedBranch as any)?.isPartnerLab;
    const query = isPartner ? { partnerId: branchId } : { branchId };

    staffService.getStaff(query).then(res => {
      const allStaff = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : []);
      const branchTechs = allStaff.filter((s: any) => {
        const matchesBranch = isPartner ? s.partnerId === branchId : (!s.branchId || s.branchId === branchId || s.branch?.id === branchId);
        const text = `${s.designation || ''} ${s.department || ''} ${s.role?.name || ''} ${s.role?.slug || ''}`.toLowerCase();
        return matchesBranch && /technician|technologist|lab|pathology/i.test(text);
      });
      
      // If it's a partner lab, add the partner themselves as a technician
      if (isPartner && selectedBranch) {
        branchTechs.unshift({
          id: `partner_${selectedBranch.id}`,
          name: selectedBranch.name,
          designation: 'Lab Owner / Incharge',
          qualification: 'Pathology Partner',
          user: {
            name: selectedBranch.name
          }
        });
      }
      
      setAvailableTechnicians(branchTechs);

      if (isReportCreated) return;

      if (branchTechs.length > 0) {
        const matchedTech = branchTechs.find((t: any) => t.id === selectedTechnicianId) || branchTechs[0];
        setSelectedTechnicianId(matchedTech.id);
        setVerification(v => ({
          ...v,
          technicianName: matchedTech.user?.name || matchedTech.name || '',
          technicianQualification: matchedTech.qualification || 'DMLT',
          technicianSignatureUrl: matchedTech.signatureUrl || '',
        }));
      } else {
        setSelectedTechnicianId('');
        setVerification(v => ({
          ...v,
          technicianName: '',
          technicianQualification: 'DMLT',
          technicianSignatureUrl: '',
        }));
      }
    }).catch(err => {
      console.error('Failed to load branch lab technicians:', err);
    });
  }, [verification.reportBranchId, isReportCreated]);

  const handleSelectBooking = useCallback((booking: any) => {
    setSelectedBooking(booking);
    setShowModal(false);
    setEditingParam(null);
    const existingReport = reports.find((r: any) => r.bookingId === booking.id);
    if (existingReport) {
      const isDetailed = existingReport.internalNotes?.includes('[TEMPLATE:DETAILED]') || existingReport.templateType === 'DETAILED';
      setReportTemplate(isDetailed ? 'DETAILED' : 'STANDARD');
      const groups = buildTestGroups(booking);
      groups.forEach(g => {
        g.parameters.forEach(p => {
          const match = existingReport.parameters?.find((ep: any) => ep.parameterId === p.parameterId || ep.parameterName === p.parameterName);
          if (match) {
            p.value = match.observedValue || '';
            p.flag = computeFlag(match.observedValue, p);
            p.isAbnormal = match.isAbnormal || false;
          }
        });
      });
      setTestGroups(groups);
      setNotes({
        clinicalNotes: existingReport.clinicalNotes || '',
        technicianRemarks: existingReport.technicianRemarks || '',
        doctorRemarks: existingReport.doctorRemarks || '',
        internalNotes: (existingReport.internalNotes || '').replace(/\[TEMPLATE:(STANDARD|DETAILED)\]/g, '').trim(),
      });
    const fallbackBranchId = booking.collectionMode === 'HOME'
        ? (booking.sampleDelivery?.branch?.id || '')
        : (booking.branchId || '');

      let techName = existingReport.technicianName || '';
      let techQual = existingReport.technicianQualification || 'DMLT';
      let techSig = existingReport.technicianSignatureUrl || '';
      if (!techName && existingReport.internalNotes?.includes('[TECH:')) {
        try {
          const m = existingReport.internalNotes.match(/\[TECH:(\{.*?\})\]/);
          if (m && m[1]) {
            const parsed = JSON.parse(m[1]);
            techName = parsed.name || techName;
            techQual = parsed.qualification || techQual;
            techSig = parsed.signatureUrl || techSig;
          }
        } catch (e) {}
      }

      setVerification({
        reportBranchId: existingReport.reportBranchId || fallbackBranchId,
        doctorName: existingReport.doctorName || '',
        doctorQualification: existingReport.doctorQualification || '',
        doctorRegNo: existingReport.doctorRegNo || '',
        doctorDesignation: existingReport.doctorDesignation || '',
        doctorVerifiedAt: existingReport.doctorVerifiedAt || new Date().toISOString(),
        doctorSignatureUrl: existingReport.doctorSignatureUrl || (existingReport as any).signatureUrl || '',
        technicianName: techName,
        technicianQualification: techQual,
        technicianSignatureUrl: techSig,
      });
    } else {
      setReportTemplate('STANDARD');
      setTestGroups(buildTestGroups(booking));
      setNotes({ clinicalNotes: '', technicianRemarks: '', doctorRemarks: '', internalNotes: '' });
  const defaultBranchId = booking.collectionMode === 'HOME'
        ? (booking.sampleDelivery?.branch?.id || '')
        : (booking.branchId || '');
      setVerification({ ...emptyVerification(), reportBranchId: defaultBranchId });
    }
  }, [reports]);

  const updateParam = (groupIdx: number, paramIdx: number, patch: Partial<ParameterEntry>) => {
    setTestGroups(prev => prev.map((g, gi) => gi !== groupIdx ? g : {
      ...g,
      parameters: g.parameters.map((p, pi) => {
        if (pi !== paramIdx) return p;
        const updated = { ...p, ...patch };
        if (patch.value !== undefined || patch.referenceRanges !== undefined || patch.criticalLow !== undefined || patch.criticalHigh !== undefined) {
          const val = patch.value !== undefined ? patch.value : p.value;
          const ranges = patch.referenceRanges !== undefined ? patch.referenceRanges : p.referenceRanges;
          const newParam = { ...updated, referenceRanges: ranges };
          const flag = computeFlag(val, newParam);
          updated.flag = flag;
          updated.isAbnormal = flag !== 'NORMAL' && flag !== 'PENDING';
          if (patch.referenceRanges !== undefined) updated.referenceRange = buildRangeString(ranges);
        }
        return updated;
      }),
    }));
  };

  const updateRange = (groupIdx: number, paramIdx: number, rangeIdx: number, patch: Partial<RangeEntry>) => {
    setTestGroups(prev => prev.map((g, gi) => gi !== groupIdx ? g : {
      ...g,
      parameters: g.parameters.map((p, pi) => {
        if (pi !== paramIdx) return p;
        const newRanges = p.referenceRanges.map((r, ri) => ri !== rangeIdx ? r : { ...r, ...patch });
        const flag = computeFlag(p.value, { ...p, referenceRanges: newRanges });
        return { ...p, referenceRanges: newRanges, referenceRange: buildRangeString(newRanges), flag, isAbnormal: flag !== 'NORMAL' && flag !== 'PENDING' };
      }),
    }));
  };

  const addRange = (groupIdx: number, paramIdx: number) => {
    setTestGroups(prev => prev.map((g, gi) => gi !== groupIdx ? g : {
      ...g,
      parameters: g.parameters.map((p, pi) => {
        if (pi !== paramIdx) return p;
        const newRanges = [...p.referenceRanges, { gender: 'ANY' as const, minAge: 0, maxAge: 120, minRange: 0, maxRange: 0 }];
        const flag = computeFlag(p.value, { ...p, referenceRanges: newRanges });
        return { ...p, referenceRanges: newRanges, referenceRange: buildRangeString(newRanges), flag, isAbnormal: flag !== 'NORMAL' && flag !== 'PENDING' };
      }),
    }));
  };

  const deleteRange = (groupIdx: number, paramIdx: number, rangeIdx: number) => {
    setTestGroups(prev => prev.map((g, gi) => gi !== groupIdx ? g : {
      ...g,
      parameters: g.parameters.map((p, pi) => {
        if (pi !== paramIdx) return p;
        const newRanges = p.referenceRanges.filter((_, ri) => ri !== rangeIdx);
        const flag = computeFlag(p.value, { ...p, referenceRanges: newRanges });
        return { ...p, referenceRanges: newRanges, referenceRange: buildRangeString(newRanges), flag, isAbnormal: flag !== 'NORMAL' && flag !== 'PENDING' };
      }),
    }));
  };

  const addParameter = (groupIdx: number) => {
    setTestGroups(prev => prev.map((g, gi) => gi !== groupIdx ? g : {
      ...g, parameters: [...g.parameters, emptyParam(g.parameters.length)],
    }));
    setEditingParam({ groupIdx, paramIdx: testGroups[groupIdx].parameters.length });
  };

  const deleteParameter = (groupIdx: number, paramIdx: number) => {
    setTestGroups(prev => prev.map((g, gi) => gi !== groupIdx ? g : {
      ...g, parameters: g.parameters.filter((_, pi) => pi !== paramIdx),
    }));
    setEditingParam(null);
  };

  const moveParameter = (groupIdx: number, paramIdx: number, dir: -1 | 1) => {
    const newIdx = paramIdx + dir;
    setTestGroups(prev => prev.map((g, gi) => {
      if (gi !== groupIdx) return g;
      const params = [...g.parameters];
      if (newIdx < 0 || newIdx >= params.length) return g;
      [params[paramIdx], params[newIdx]] = [params[newIdx], params[paramIdx]];
      return { ...g, parameters: params };
    }));
  };

  const buildPayload = () => {
    const parameters: any[] = [];
    testGroups.forEach(g => g.parameters.forEach(p => {
      parameters.push({
        parameterId: p.parameterId.startsWith('new-') ? undefined : p.parameterId,
        parameterName: p.parameterName,
        observedValue: p.value || '0',
        unit: p.unit,
        referenceRange: p.referenceRange,
        isAbnormal: p.isAbnormal,
      });
    }));
    const testNames = [
      ...(selectedBooking?.tests?.map((bt: any) => bt.test?.name) || []),
      ...(selectedBooking?.packages?.map((bp: any) => bp.package?.name) || []),
    ].filter(Boolean).join(', ');

    const rawInternalNotes = notes.internalNotes || '';
    const cleanInternalNotes = rawInternalNotes.replace(/\[TEMPLATE:(STANDARD|DETAILED)\]/g, '').trim();
    const finalInternalNotes = `${cleanInternalNotes} [TEMPLATE:${reportTemplate}]`.trim();

    return {
      bookingId: selectedBooking.id,
      testName: testNames || 'Diagnostic Test',
      clinicalNotes: notes.clinicalNotes,
      technicianRemarks: notes.technicianRemarks,
      doctorRemarks: notes.doctorRemarks,
      internalNotes: finalInternalNotes,
      templateType: reportTemplate,
      parameters,
      recipientType: 'USER',
      recipientId: selectedBooking.userId,
      reportBranchId: verification.reportBranchId || null,
      doctorName: verification.doctorName || null,
      doctorQualification: verification.doctorQualification || null,
      doctorRegNo: verification.doctorRegNo || null,
      doctorDesignation: verification.doctorDesignation || null,
      doctorVerifiedAt: verification.doctorVerifiedAt || null,
      doctorSignatureUrl: verification.doctorSignatureUrl || null,
      technicianName: verification.technicianName || null,
      technicianQualification: verification.technicianQualification || null,
      technicianSignatureUrl: verification.technicianSignatureUrl || null,
    };
  };

  const handleSaveDraft = async () => {
    if (!selectedBooking) return;
    setSaving(true);
    try {
      const existingReport = reports.find((r: any) => r.bookingId === selectedBooking.id);
      const payload = buildPayload();
      if (existingReport) {
        await dispatch(updateReportDraftThunk({ id: existingReport.id, payload })).unwrap();
      } else {
        await dispatch(createReportThunk(payload)).unwrap();
      }
      await dispatch(fetchAllReports());
      toast.success('Draft saved', 'Report draft has been saved successfully.');
    } catch (e: any) {
      toast.error('Save failed', typeof e === 'string' ? e : 'Failed to save draft. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedBooking) return;
    setSaving(true);
    try {
      const existingReport = reports.find((r: any) => r.bookingId === selectedBooking.id);
      const payload = buildPayload();
      let repId = existingReport?.id;
      if (existingReport) {
        await dispatch(updateReportDraftThunk({ id: existingReport.id, payload })).unwrap();
      } else {
        const created = await dispatch(createReportThunk(payload)).unwrap();
        repId = created.id;
      }
      if (repId) {
        // Submit for review / approval so it is not auto-approved
        await dispatch(verifyReportThunk(repId)).unwrap();
      }
      await dispatch(fetchAllReports());
      toast.success('Report Generated', 'Report has been generated and submitted for approval. Awaiting review by Admin.');
      setSelectedBooking(null);
    } catch (e: any) {
      toast.error('Submission failed', typeof e === 'string' ? e : 'Failed to generate report. Please try again.');
    } finally {
      setSaving(false);
    }
  };

const filteredBookings = useMemo(() => {
    const raw = searchQuery.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!raw) return bookingsForReport;
    return bookingsForReport.filter((b: any) => {
      const testNames = (b.tests || []).map((bt: any) => bt.test?.name || '').join(' ');
      const packageNames = (b.packages || []).map((bp: any) => bp.package?.name || '').join(' ');
      const testCategories = (b.tests || []).map((bt: any) => bt.test?.category?.name || '').join(' ');
      const fields = [
        b.patientName,
        b.bookingCode,
        b.id,
        b.patientMobile,
        b.user?.mobile,
        b.uhid,
        b.sampleId,
        testNames,
        packageNames,
        testCategories,
      ].map(f => (f || '').toLowerCase());
      return fields.some(f => f.includes(raw));
    });
  }, [bookingsForReport, searchQuery]);

  const bookingsWithoutReport = filteredBookings.filter((b: any) => !b.report || b.report.status === 'DRAFT');

  const getBookingTestNames = (booking: any) => {
    const tests = booking.tests?.map((bt: any) => bt.test?.name).filter(Boolean) || [];
    const pkgs = booking.packages?.map((bp: any) => bp.package?.name).filter(Boolean) || [];
    return [...tests, ...pkgs].join(', ') || 'No tests';
  };

  const isEditingThis = (gi: number, pi: number) => editingParam?.groupIdx === gi && editingParam?.paramIdx === pi;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Report Builder</h1>
          <p className="text-sm text-muted-foreground">Select a booking or register a walk-in patient, enter test values, and save as draft.</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => { setModalTab('walkin'); setShowModal(true); }}
            className="flex-1 sm:flex-initial px-3.5 py-2 bg-card border border-primary/30 text-primary hover:bg-primary/5 text-xs sm:text-sm font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <UserPlus className="h-4 w-4" /> Add New Patient
          </button>
          <button
            onClick={() => { setModalTab('existing'); setShowModal(true); }}
            className="flex-1 sm:flex-initial px-4 py-2 bg-primary text-white text-xs sm:text-sm font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm hover:bg-primary/90 transition-colors"
          >
            <FileText className="h-4 w-4" /> Create Report
          </button>
        </div>
      </div>

      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-xs" onClick={() => setShowModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] sm:max-w-2xl bg-background border border-border rounded-2xl z-[60] shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[92vh] overflow-y-auto">
            
            {/* Header & Tabs */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setModalTab('existing')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                    modalTab === 'existing'
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ClipboardList className="h-3.5 w-3.5 text-primary" /> Select Existing Booking
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('walkin')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                    modalTab === 'walkin'
                      ? "bg-primary text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <UserPlus className="h-3.5 w-3.5" /> + Add New Patient
                </button>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* TAB 1: Existing Patient Selection */}
            {modalTab === 'existing' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl p-3">
                  <div>
                    <div className="font-bold text-xs text-foreground">Direct / Walk-in Patient?</div>
                    <div className="text-[11px] text-muted-foreground">Patient did not book via the mobile app? Register them directly.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalTab('walkin')}
                    className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 flex items-center gap-1.5 shadow-xs shrink-0"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Add New Patient
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search existing bookings by name, code, mobile, test..."
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-input rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-card"
                  />
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {bookingsLoading ? (
                    <div className="text-center py-10 text-sm text-muted-foreground flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      Loading bookings...
                    </div>
                  ) : bookingsWithoutReport.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center bg-muted/20 rounded-xl border border-dashed border-border">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Search className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="text-sm font-semibold text-foreground">No matching bookings found</div>
                      <div className="text-xs text-muted-foreground max-w-xs">
                        If this is a walk-in patient, click below to register them.
                      </div>
                      <button
                        type="button"
                        onClick={() => setModalTab('walkin')}
                        className="mt-2 px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 flex items-center gap-1.5"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Register Walk-in Patient
                      </button>
                    </div>
                  ) : (
                    bookingsWithoutReport.map((b: any) => (
                      <button
                        key={b.id}
                        onClick={() => handleSelectBooking(b)}
                        className="w-full text-left p-3.5 border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                            {b.patientName}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">{b.bookingCode}</div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                            <span className="font-semibold text-foreground/80">{getBookingTestNames(b)}</span>
                            {b.collectionMode && (
                              <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-bold uppercase">
                                {b.collectionMode}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-mono font-medium text-muted-foreground">
                            {b.patientMobile || b.user?.mobile}
                          </div>
                          <span className="inline-block mt-2 text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                            Select →
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Add New Patient (Walk-in / Direct) Form */}
            {modalTab === 'walkin' && (
              <div className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-foreground">Direct / Walk-in Patient Registration</span>
                    <p className="text-muted-foreground text-[11px] mt-0.5">Fill patient details to continue into report generation.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedBranchDetails && (
                      <span className="px-2.5 py-1 rounded-lg bg-card border border-primary/30 text-foreground text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        <span>Branch: <strong className="text-primary">{selectedBranchDetails.name}</strong></span>
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase">
                      Walk-in Mode
                    </span>
                  </div>
                </div>

                {isSuperAdmin && branches.length > 1 && (
                  <div className="flex items-center gap-2 bg-muted/40 p-2.5 rounded-xl border border-border">
                    <Building2 className="h-4 w-4 text-primary shrink-0" />
                    <label className="text-xs font-bold text-foreground shrink-0">Select Branch:</label>
                    <select
                      value={verification.reportBranchId}
                      onChange={e => setVerification(v => ({ ...v, reportBranchId: e.target.value }))}
                      className="w-full text-xs border border-input rounded-lg px-2.5 py-1.5 bg-card outline-none focus:ring-1 focus:ring-primary"
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Patient Full Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground block">
                      Patient Full Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Kumar"
                      value={walkinForm.patientName}
                      onChange={e => {
                        setWalkinForm(f => ({ ...f, patientName: e.target.value }));
                        if (walkinErrors.patientName) setWalkinErrors(err => ({ ...err, patientName: '' }));
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-xs border rounded-lg bg-card outline-none focus:ring-2",
                        walkinErrors.patientName ? "border-destructive focus:ring-destructive/20" : "border-input focus:ring-primary/20"
                      )}
                    />
                    {walkinErrors.patientName && (
                      <p className="text-[10px] text-destructive font-medium">{walkinErrors.patientName}</p>
                    )}
                  </div>

                  {/* Mobile Number */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground block">
                      Mobile Number <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={walkinForm.mobile}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setWalkinForm(f => ({ ...f, mobile: val }));
                        if (walkinErrors.mobile) setWalkinErrors(err => ({ ...err, mobile: '' }));
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-xs border rounded-lg bg-card outline-none focus:ring-2 font-mono",
                        walkinErrors.mobile ? "border-destructive focus:ring-destructive/20" : "border-input focus:ring-primary/20"
                      )}
                    />
                    {walkinErrors.mobile && (
                      <p className="text-[10px] text-destructive font-medium">{walkinErrors.mobile}</p>
                    )}
                  </div>

                  {/* Gender */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground block">
                      Gender <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={walkinForm.gender}
                      onChange={e => {
                        setWalkinForm(f => ({ ...f, gender: e.target.value }));
                        if (walkinErrors.gender) setWalkinErrors(err => ({ ...err, gender: '' }));
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-xs border rounded-lg bg-card outline-none focus:ring-2",
                        walkinErrors.gender ? "border-destructive focus:ring-destructive/20" : "border-input focus:ring-primary/20"
                      )}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    {walkinErrors.gender && (
                      <p className="text-[10px] text-destructive font-medium">{walkinErrors.gender}</p>
                    )}
                  </div>

                  {/* Age */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground block">
                      Age (in years) <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      placeholder="e.g. 35"
                      value={walkinForm.age}
                      onChange={e => {
                        setWalkinForm(f => ({ ...f, age: e.target.value }));
                        if (walkinErrors.age) setWalkinErrors(err => ({ ...err, age: '' }));
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-xs border rounded-lg bg-card outline-none focus:ring-2",
                        walkinErrors.age ? "border-destructive focus:ring-destructive/20" : "border-input focus:ring-primary/20"
                      )}
                    />
                    {walkinErrors.age && (
                      <p className="text-[10px] text-destructive font-medium">{walkinErrors.age}</p>
                    )}
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-foreground block">
                      Address <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Flat 302, Green Avenue, Bhopal"
                      value={walkinForm.address}
                      onChange={e => {
                        setWalkinForm(f => ({ ...f, address: e.target.value }));
                        if (walkinErrors.address) setWalkinErrors(err => ({ ...err, address: '' }));
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-xs border rounded-lg bg-card outline-none focus:ring-2",
                        walkinErrors.address ? "border-destructive focus:ring-destructive/20" : "border-input focus:ring-primary/20"
                      )}
                    />
                    {walkinErrors.address && (
                      <p className="text-[10px] text-destructive font-medium">{walkinErrors.address}</p>
                    )}
                  </div>

                  {/* Reference */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-foreground block">
                      Reference / Referring Doctor <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Self / Dr. A. K. Sharma / City Hospital"
                      value={walkinForm.reference}
                      onChange={e => setWalkinForm(f => ({ ...f, reference: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-input rounded-lg bg-card outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  {/* Diagnostic Tests / Packages Selection */}
                  <div className="md:col-span-2 space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground block">
                        Select Diagnostic Tests / Packages
                      </label>
                      <span className="text-[10px] font-semibold text-primary">
                        {selectedTestIds.length + selectedPackageIds.length} Selected
                      </span>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search tests catalog (e.g. CBC, Lipid, Thyroid, Glucose)..."
                        value={testFilterQuery}
                        onChange={e => setTestFilterQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-input rounded-lg bg-card outline-none focus:ring-1 focus:ring-primary/20"
                      />
                    </div>

                    <div className="max-h-36 overflow-y-auto p-2 bg-muted/20 rounded-lg border border-border flex flex-wrap gap-1.5">
                      {availableTests
                        .filter(t => !testFilterQuery || t.name.toLowerCase().includes(testFilterQuery.toLowerCase()))
                        .slice(0, 30)
                        .map(t => {
                          const isSelected = selectedTestIds.includes(t.id);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setSelectedTestIds(prev =>
                                  isSelected ? prev.filter(id => id !== t.id) : [...prev, t.id]
                                );
                              }}
                              className={cn(
                                "text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all flex items-center gap-1",
                                isSelected
                                  ? "bg-primary text-white border-primary shadow-xs"
                                  : "bg-card border-border text-foreground hover:border-primary/40"
                              )}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                              {t.name}
                            </button>
                          );
                        })}

                      {availablePackages
                        .filter(p => !testFilterQuery || p.name.toLowerCase().includes(testFilterQuery.toLowerCase()))
                        .map(p => {
                          const isSelected = selectedPackageIds.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedPackageIds(prev =>
                                  isSelected ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                );
                              }}
                              className={cn(
                                "text-[11px] px-2.5 py-1 rounded-md border font-bold transition-all flex items-center gap-1",
                                isSelected
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                  : "bg-card border-border text-indigo-700 dark:text-indigo-300 hover:border-indigo-400"
                              )}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                              [Pkg] {p.name}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Form Action Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setModalTab('existing')}
                    className="px-4 py-2 border border-border hover:bg-muted rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground"
                  >
                    ← Back to Existing Bookings
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateWalkinReport}
                    disabled={creatingWalkin}
                    className="px-6 py-2 bg-primary text-white text-xs font-black rounded-lg hover:bg-primary/90 flex items-center gap-2 shadow-sm disabled:opacity-60"
                  >
                    {creatingWalkin ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Registering Patient...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" /> Generate Report
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Recent Drafts</h3>
          <div className="space-y-2">
            {reports.filter((r: any) => r.status === 'DRAFT').map((r: any) => {
              const booking = bookingsForReport.find((b: any) => b.id === r.bookingId);
              return (
                <button key={r.id} onClick={() => booking && handleSelectBooking(booking)} className={cn("w-full text-left p-3 border rounded-xl shadow-sm transition-all flex items-center justify-between", selectedBooking?.id === r.bookingId ? "bg-primary text-white border-primary" : "bg-card border-border hover:border-primary/50")}>
                  <div>
                    <div className="font-bold text-sm truncate max-w-[160px]">{booking?.patientName || r.booking?.patientName}</div>
                    <div className={cn("text-xs font-mono mt-0.5", selectedBooking?.id === r.bookingId ? "text-white/70" : "text-muted-foreground")}>{booking?.bookingCode || r.booking?.bookingCode}</div>
                    <span className={cn("inline-block text-[9px] font-black uppercase mt-1", selectedBooking?.id === r.bookingId ? "text-white" : "text-amber-600")}>Draft</span>
                  </div>
                  <ChevronRight className={cn("h-4 w-4", selectedBooking?.id === r.bookingId ? "text-white" : "text-muted-foreground")} />
                </button>
              );
            })}
            {reports.filter((r: any) => r.status === 'DRAFT').length === 0 && (
              <div className="bg-muted/50 border border-dashed border-border rounded-xl p-6 text-center text-muted-foreground text-xs">No draft reports.</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {selectedBooking ? (
              <motion.div key={selectedBooking.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                    <div><div className="text-[10px] sm:text-xs text-muted-foreground">Patient</div><div className="font-bold truncate">{selectedBooking.patientName}</div></div>
                    <div><div className="text-[10px] sm:text-xs text-muted-foreground">Booking Code</div><div className="font-mono font-bold truncate">{selectedBooking.bookingCode}</div></div>
                    <div><div className="text-[10px] sm:text-xs text-muted-foreground">Mobile</div><div className="font-bold truncate">{selectedBooking.patientMobile || selectedBooking.user?.mobile}</div></div>
                    <div><div className="text-[10px] sm:text-xs text-muted-foreground">Collection</div><div className="font-bold">{selectedBooking.collectionMode}</div></div>
                    <div><div className="text-[10px] sm:text-xs text-muted-foreground">Gender</div><div className="font-bold">{selectedBooking.patientGender || '-'}</div></div>
                    <div><div className="text-[10px] sm:text-xs text-muted-foreground">Age</div><div className="font-bold">{selectedBooking.patientAge ? `${selectedBooking.patientAge} yrs` : '-'}</div></div>
                    <div><div className="text-[10px] sm:text-xs text-muted-foreground">Branch</div><div className="font-bold truncate">{selectedBooking.collectionMode === 'HOME' ? (selectedBooking.sampleDelivery?.branch?.name || 'Not Assigned') : (selectedBooking.branch?.name || 'Not Assigned')}</div></div>
                    <div><div className="text-[10px] sm:text-xs text-muted-foreground">Scheduled</div><div className="font-bold">{new Date(selectedBooking.scheduledDate).toLocaleDateString('en-IN')}</div></div>
                  </div>
                </div>

                {testGroups.length === 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 space-y-2">
                    <div className="font-bold flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> No parameters found for:</div>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      {[...(selectedBooking?.tests?.map((bt: any) => bt.test) || []), ...(selectedBooking?.packages?.flatMap((bp: any) => bp.package?.testsIncluded?.map((pt: any) => pt.test) || []) || [])].filter(Boolean).map((t: any) => (
                        <li key={t.id}><span className="font-semibold">{t.name}</span> - go to Test Catalog and add parameters.</li>
                      ))}
                    </ul>
                  </div>
                )}

                {testGroups.map((group, groupIdx) => (
                  <div key={group.testId} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-muted/50 px-4 sm:px-5 py-3.5 border-b border-border flex items-center justify-between">
                      <div className="font-bold text-sm text-foreground">{group.testName}</div>
                      <button onClick={() => addParameter(groupIdx)} className="text-xs font-bold text-primary flex items-center gap-1 hover:bg-primary/10 px-2 py-1 rounded">
                        <Plus className="h-3.5 w-3.5" /> Add Parameter
                      </button>
                    </div>

                    <div className="divide-y divide-border">
                      {group.parameters.map((param, paramIdx) => {
                        const flagCfg = FLAG_CONFIG[param.flag];
                        const isEditing = isEditingThis(groupIdx, paramIdx);
                        return (
                          <div key={param.parameterId} className={cn("transition-all", isEditing ? "bg-primary/5 border-l-2 border-primary" : "hover:bg-muted/10")}>
                            <div className="px-3 sm:px-5 py-3 flex flex-col md:flex-row md:items-center gap-3">
                              {/* Reorder and Title on Mobile */}
                              <div className="flex items-center justify-between md:justify-start gap-2">
                                <div className="flex items-center gap-1.5">
                                  <div className="flex flex-row md:flex-col gap-0.5">
                                    <button onClick={() => moveParameter(groupIdx, paramIdx, -1)} disabled={paramIdx === 0} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => moveParameter(groupIdx, paramIdx, 1)} disabled={paramIdx === group.parameters.length - 1} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
                                  </div>

                                  <div className="md:hidden flex-1">
                                    {isEditing ? (
                                      <input value={param.parameterName} onChange={e => updateParam(groupIdx, paramIdx, { parameterName: e.target.value })} className="text-sm font-semibold border border-border rounded px-2 py-1 bg-background outline-none focus:border-primary w-full max-w-[180px]" placeholder="Param name" />
                                    ) : (
                                      <div className="font-semibold text-xs sm:text-sm text-foreground truncate max-w-[180px]">
                                        {param.parameterName || <span className="text-muted-foreground italic">Unnamed</span>}
                                        <span className="ml-1 text-[10px] text-muted-foreground font-normal">({param.unit || '-'})</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Mobile Quick Action Buttons & Flag */}
                                <div className="flex items-center gap-1.5 md:hidden">
                                  <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded border uppercase", flagCfg.className)}>{flagCfg.label}</span>
                                  <button onClick={() => setEditingParam(isEditing ? null : { groupIdx, paramIdx })} className={cn("p-1 rounded text-xs font-bold", isEditing ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground hover:text-foreground")}>
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => deleteParameter(groupIdx, paramIdx)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Parameter Input Columns (Responsive) */}
                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 sm:gap-3 items-center text-sm">
                                {/* Desktop Parameter Name */}
                                <div className="hidden md:block md:col-span-3">
                                  {isEditing ? (
                                    <input value={param.parameterName} onChange={e => updateParam(groupIdx, paramIdx, { parameterName: e.target.value })} className="w-full text-sm font-semibold border border-border rounded px-2 py-1 bg-background outline-none focus:border-primary" placeholder="Parameter name" />
                                  ) : (
                                    <div className="font-semibold text-foreground truncate">{param.parameterName || <span className="text-muted-foreground italic">Unnamed</span>}
                                      <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">{param.unit}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Bio Ref Range */}
                                <div className="md:col-span-2">
                                  <div className="text-[10px] text-muted-foreground font-bold uppercase md:hidden mb-0.5">Bio Ref Range:</div>
                                  {isEditing ? (
                                    <input value={param.unit} onChange={e => updateParam(groupIdx, paramIdx, { unit: e.target.value })} className="w-full text-xs border border-border rounded px-2 py-1 bg-background outline-none focus:border-primary" placeholder="Unit" />
                                  ) : (
                                    <span className="text-xs text-muted-foreground font-mono">{param.referenceRange || '-'}</span>
                                  )}
                                </div>

                                {/* Observed Value Input */}
                                <div className="md:col-span-2">
                                  <div className="text-[10px] text-muted-foreground font-bold uppercase md:hidden mb-0.5">Observed Value:</div>
                                  {param.resultType === 'NUMERIC' ? (
                                    <input type="number" step="0.01" value={param.value} onChange={e => updateParam(groupIdx, paramIdx, { value: e.target.value })}
                                      className={cn("w-full text-center py-1.5 px-2 text-sm font-bold rounded border outline-none focus:ring-1",
                                        param.flag === 'CRITICAL_HIGH' || param.flag === 'CRITICAL_LOW' ? "border-red-300 text-red-700 bg-red-50 focus:ring-red-200"
                                          : param.flag === 'HIGH' || param.flag === 'LOW' ? "border-amber-300 text-amber-700 bg-amber-50 focus:ring-amber-200"
                                          : param.flag === 'NORMAL' ? "border-emerald-300 text-emerald-700 bg-emerald-50 focus:ring-emerald-200"
                                          : "border-input bg-card focus:ring-primary/20"
                                      )} placeholder="Value" />
                                  ) : param.resultType === 'POS_NEG' ? (
                                    <select value={param.value} onChange={e => updateParam(groupIdx, paramIdx, { value: e.target.value, flag: e.target.value === 'Positive' ? 'HIGH' : 'NORMAL' })} className="w-full text-xs border border-border rounded px-2 py-1.5 bg-background outline-none">
                                      <option value="">Select</option>
                                      <option>Positive</option>
                                      <option>Negative</option>
                                    </select>
                                  ) : param.resultType === 'YES_NO' ? (
                                    <select value={param.value} onChange={e => updateParam(groupIdx, paramIdx, { value: e.target.value })} className="w-full text-xs border border-border rounded px-2 py-1.5 bg-background outline-none">
                                      <option value="">Select</option>
                                      <option>Yes</option>
                                      <option>No</option>
                                    </select>
                                  ) : (
                                    <input type="text" value={param.value} onChange={e => updateParam(groupIdx, paramIdx, { value: e.target.value })} className="w-full text-xs border border-border rounded px-2 py-1.5 bg-background outline-none focus:border-primary" placeholder="Result" />
                                  )}
                                </div>

                                {/* Flag badge (Desktop) */}
                                <div className="hidden md:block md:col-span-2">
                                  <span className={cn("text-[10px] font-black px-2 py-0.5 rounded border uppercase", flagCfg.className)}>{flagCfg.label}</span>
                                </div>

                                {/* Actions & Result Type (Desktop) */}
                                <div className="hidden md:flex md:col-span-3 items-center justify-end gap-1.5">
                                  {isEditing ? (
                                    <select value={param.resultType} onChange={e => updateParam(groupIdx, paramIdx, { resultType: e.target.value as ResultType })} className="text-[10px] border border-border rounded px-1.5 py-1 bg-background outline-none">
                                      <option value="NUMERIC">Numeric</option>
                                      <option value="TEXT">Text</option>
                                      <option value="POS_NEG">Pos/Neg</option>
                                      <option value="YES_NO">Yes/No</option>
                                    </select>
                                  ) : null}
                                  <button onClick={() => setEditingParam(isEditing ? null : { groupIdx, paramIdx })} className={cn("p-1.5 rounded text-xs font-bold", isEditing ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground hover:text-foreground")}>
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => deleteParameter(groupIdx, paramIdx)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {isEditing && (
                              <div className="px-3 sm:px-5 pb-4 space-y-4 border-t border-border/50 pt-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Critical Low</label>
                                    <input type="number" step="0.01" value={param.criticalLow} onChange={e => updateParam(groupIdx, paramIdx, { criticalLow: e.target.value })} className="w-full text-xs border border-border rounded px-2 py-1.5 bg-background outline-none focus:border-primary" placeholder="e.g. 2.0" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Critical High</label>
                                    <input type="number" step="0.01" value={param.criticalHigh} onChange={e => updateParam(groupIdx, paramIdx, { criticalHigh: e.target.value })} className="w-full text-xs border border-border rounded px-2 py-1.5 bg-background outline-none focus:border-primary" placeholder="e.g. 20.0" />
                                  </div>
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Reference Ranges</label>
                                    <button type="button" onClick={() => addRange(groupIdx, paramIdx)} className="text-[10px] font-bold text-primary flex items-center gap-1 hover:bg-primary/10 px-2 py-0.5 rounded">
                                      <Plus className="h-3 w-3" /> Add Range
                                    </button>
                                  </div>
                                  <div className="space-y-2">
                                    {param.referenceRanges.map((r, ri) => (
                                      <div key={ri} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-center bg-muted/30 rounded p-2">
                                        <select value={r.gender} onChange={e => updateRange(groupIdx, paramIdx, ri, { gender: e.target.value as any })} className="text-[10px] border border-border rounded px-1.5 py-1 bg-background outline-none col-span-1">
                                          <option value="ANY">ANY</option>
                                          <option value="MALE">MALE</option>
                                          <option value="FEMALE">FEMALE</option>
                                        </select>
                                        <input type="number" value={r.minAge} onChange={e => updateRange(groupIdx, paramIdx, ri, { minAge: Number(e.target.value) })} className="text-[10px] border border-border rounded px-1.5 py-1 bg-background outline-none col-span-1" placeholder="Min Age" />
                                        <input type="number" value={r.maxAge} onChange={e => updateRange(groupIdx, paramIdx, ri, { maxAge: Number(e.target.value) })} className="text-[10px] border border-border rounded px-1.5 py-1 bg-background outline-none col-span-1" placeholder="Max Age" />
                                        <input type="number" step="0.01" value={r.minRange} onChange={e => updateRange(groupIdx, paramIdx, ri, { minRange: Number(e.target.value) })} className="text-[10px] border border-border rounded px-1.5 py-1 bg-background outline-none col-span-1" placeholder="Min" />
                                        <input type="number" step="0.01" value={r.maxRange} onChange={e => updateRange(groupIdx, paramIdx, ri, { maxRange: Number(e.target.value) })} className="text-[10px] border border-border rounded px-1.5 py-1 bg-background outline-none col-span-1" placeholder="Max" />
                                        <button type="button" onClick={() => deleteRange(groupIdx, paramIdx, ri)} className="text-destructive hover:bg-destructive/10 p-1 rounded col-span-2 sm:col-span-1 flex items-center justify-center">
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Description</label>
                                  <textarea value={param.description} onChange={e => updateParam(groupIdx, paramIdx, { description: e.target.value })} className="w-full h-16 text-xs border border-border rounded px-2 py-1.5 bg-background outline-none focus:border-primary resize-none" placeholder="Parameter description..." />
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Interpretation</label>
                                  <textarea value={param.interpretation} onChange={e => updateParam(groupIdx, paramIdx, { interpretation: e.target.value })} className="w-full h-16 text-xs border border-border rounded px-2 py-1.5 bg-background outline-none focus:border-primary resize-none" placeholder="Clinical interpretation..." />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                  <h4 className="font-bold text-sm text-foreground">Notes & Remarks</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {([
                      { key: 'clinicalNotes', label: 'Clinical Notes' },
                      { key: 'technicianRemarks', label: 'Technician Remarks' },
                      { key: 'doctorRemarks', label: 'Doctor Remarks' },
                      { key: 'internalNotes', label: 'Internal Notes (Admin Only)' },
                    ] as { key: keyof Notes; label: string }[]).map(({ key, label }) => (
                      <div key={key}>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">{label}</label>
                        <textarea value={notes[key]} onChange={e => setNotes(n => ({ ...n, [key]: e.target.value }))} className="w-full h-20 p-2 bg-card border border-input rounded-lg text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none text-foreground" placeholder={`Enter ${label.toLowerCase()}...`} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-5">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" /> Verification & Report Details
                  </h4>

                  <div className="space-y-3">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="h-3 w-3" /> Branch Details
                    </div>
                    <select
                      value={verification.reportBranchId}
                      onChange={e => setVerification(v => ({ ...v, reportBranchId: e.target.value }))}
                      className="w-full text-sm border border-input rounded-lg px-3 py-2 outline-none focus:border-primary bg-card"
                    >
                      <option value="">- Select Laboratory Branch -</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name} - {b.city}</option>
                      ))}
                    </select>

                    {selectedBranchDetails && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg border border-border text-xs">
                        <div>
                          <div className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Branch Name</div>
                          <div className="font-semibold text-foreground">{selectedBranchDetails.name}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">City</div>
                          <div className="font-semibold text-foreground">{selectedBranchDetails.city}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Phone</div>
                          <div className="font-semibold text-foreground">{(selectedBranchDetails as any).contactNumber || '-'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Email</div>
                          <div className="font-semibold text-foreground">{(selectedBranchDetails as any).email || '-'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Address</div>
                          <div className="font-semibold text-foreground">{(selectedBranchDetails as any).line1}, {selectedBranchDetails.state} {(selectedBranchDetails as any).pincode}</div>
                        </div>
                        {(selectedBranchDetails as any).labRegNo && (
                          <div>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Lab Reg. No.</div>
                            <div className="font-semibold text-foreground">{(selectedBranchDetails as any).labRegNo}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Lab Technician Verification Card */}
                  <div className="space-y-3 pt-3 border-t border-border">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><FlaskConical className="h-3 w-3 text-indigo-600" /> Lab Technician / Incharge Details</span>
                      {isReportCreated ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 flex items-center gap-1">
                          🔒 Locked (Report Generated)
                        </span>
                      ) : (
                        availableTechnicians.length > 0 && (
                          <span className="text-[10px] font-normal text-indigo-600 dark:text-indigo-400">
                            {availableTechnicians.length} Lab Technician{availableTechnicians.length > 1 ? 's' : ''} available
                          </span>
                        )
                      )}
                    </div>

                    {/* Branch Technician Dropdown / Locked State */}
                    {isReportCreated ? (
                      <div className="bg-muted/50 border border-border/80 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FlaskConical className="w-4 h-4 text-indigo-600" />
                          <div className="text-xs">
                            <span className="font-bold text-foreground">
                              {verification.technicianName || 'Lab Technician Profile'}
                            </span>
                            {verification.technicianQualification && (
                              <span className="text-muted-foreground ml-1.5">({verification.technicianQualification})</span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground bg-card border border-border px-2 py-0.5 rounded-md">
                          Non-editable (Report Generated)
                        </span>
                      </div>
                    ) : (
                      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3">
                        <label className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1 block uppercase">
                          Select Lab Technician from Registered Branch Staff
                        </label>
                        <select
                          value={selectedTechnicianId}
                          onChange={e => {
                            const techId = e.target.value;
                            setSelectedTechnicianId(techId);
                            const tech = availableTechnicians.find(t => t.id === techId);
                            if (tech) {
                              setVerification(v => ({
                                ...v,
                                technicianName: tech.user?.name || tech.name || '',
                                technicianQualification: tech.qualification || 'DMLT',
                                technicianSignatureUrl: tech.signatureUrl || '',
                              }));
                            } else {
                              setVerification(v => ({
                                ...v,
                                technicianName: '',
                                technicianQualification: 'DMLT',
                                technicianSignatureUrl: '',
                              }));
                            }
                          }}
                          className="w-full text-xs font-semibold bg-background border border-indigo-500/30 rounded-lg px-2.5 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="">
                            {availableTechnicians.length === 0
                              ? (verification.reportBranchId ? '-- No Lab Technicians Found for this Branch --' : '-- Select Branch First --')
                              : '-- Choose Registered Lab Technician (Auto-fill) --'}
                          </option>
                          {availableTechnicians.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.user?.name || t.name} ({t.qualification || 'DMLT'} - {t.designation || 'Lab Technician'})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Technician Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Lokesh Sharma"
                          value={verification.technicianName}
                          disabled={isReportCreated}
                          readOnly={isReportCreated}
                          onChange={e => setVerification(v => ({ ...v, technicianName: e.target.value }))}
                          className={cn(
                            "w-full text-xs border rounded-lg px-2.5 py-2 outline-none transition-colors",
                            isReportCreated
                              ? "bg-muted/70 text-foreground cursor-not-allowed border-dashed border-border font-medium select-none"
                              : "border-input focus:border-indigo-600 bg-card"
                          )}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Qualification</label>
                        <input
                          type="text"
                          placeholder="e.g. DMLT / BMLT"
                          value={verification.technicianQualification}
                          disabled={isReportCreated}
                          readOnly={isReportCreated}
                          onChange={e => setVerification(v => ({ ...v, technicianQualification: e.target.value }))}
                          className={cn(
                            "w-full text-xs border rounded-lg px-2.5 py-2 outline-none transition-colors",
                            isReportCreated
                              ? "bg-muted/70 text-foreground cursor-not-allowed border-dashed border-border font-medium select-none"
                              : "border-input focus:border-indigo-600 bg-card"
                          )}
                        />
                      </div>

                      <div className="md:col-span-2 pt-1 border-t border-border/50">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-muted-foreground">Technician Signature</span>
                          {verification.technicianSignatureUrl ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <Check className="h-3 w-3" /> Uploaded Signature Ready
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                              Using Digital Verification Fallback
                            </span>
                          )}
                        </div>
                        {verification.technicianSignatureUrl ? (
                          <div className="flex items-center gap-3 p-2 bg-muted/40 rounded-lg border border-border">
                            <div className="h-10 px-3 py-1 bg-white rounded border border-border flex items-center justify-center shadow-xs">
                              <img
                                src={verification.technicianSignatureUrl}
                                alt="Technician Signature"
                                className="max-h-8 max-w-[120px] object-contain"
                                crossOrigin="anonymous"
                              />
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Actual uploaded technician signature will appear on the final report footer.
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg border border-dashed border-border">
                            No uploaded signature for this technician. The "TECHNICIAN VERIFIED ✓" digital stamp will be displayed. You can upload their signature anytime in Staff Management.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-border">
                    {(() => {
                      const currentReport = reports.find((r: any) => r.bookingId === selectedBooking?.id) || selectedBooking?.report;
                      const isReportCreated = Boolean(
                        currentReport && (
                          currentReport.id ||
                          currentReport.status === 'GENERATED' ||
                          currentReport.status === 'FINAL' ||
                          currentReport.status === 'VERIFIED' ||
                          currentReport.status === 'PUBLISHED' ||
                          currentReport.pdfUrl ||
                          selectedBooking?.status === 'COMPLETED' ||
                          selectedBooking?.status === 'REPORT_GENERATED'
                        )
                      );

                      return (
                        <>
                          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                            <span className="flex items-center gap-1.5"><UserCheck className="h-3 w-3 text-primary" /> Doctor / Verifier Details</span>
                            {isReportCreated ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 flex items-center gap-1">
                                🔒 Locked (Report Generated)
                              </span>
                            ) : (
                              availableDoctors.length > 0 && (
                                <span className="text-[10px] font-normal text-teal-600 dark:text-teal-400">
                                  {availableDoctors.length} Registered Doctor{availableDoctors.length > 1 ? 's' : ''} available
                                </span>
                              )
                            )}
                          </div>

                          {/* Area / Branch Doctor Dropdown / Locked State */}
                          {isReportCreated ? (
                            <div className="bg-muted/50 border border-border/80 rounded-xl p-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <UserCheck className="w-4 h-4 text-emerald-600" />
                                <div className="text-xs">
                                  <span className="font-bold text-foreground">
                                    {verification.doctorName ? `Dr. ${verification.doctorName.replace(/^Dr\.?\s*/i, '')}` : 'Verified Doctor Profile'}
                                  </span>
                                  {verification.doctorQualification && (
                                    <span className="text-muted-foreground ml-1.5">({verification.doctorQualification})</span>
                                  )}
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold text-muted-foreground bg-card border border-border px-2 py-0.5 rounded-md">
                                Non-editable (Report Generated)
                              </span>
                            </div>
                          ) : (
                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                              <label className="text-[10px] font-bold text-primary mb-1 block uppercase">
                                Select Doctor from Registered Area / Partner List
                              </label>
                              <select
                                value={selectedDoctorId}
                                onChange={e => {
                                  const docId = e.target.value;
                                  setSelectedDoctorId(docId);
                                  const doc = availableDoctors.find(d => d.id === docId);
                                  if (doc) {
                                    setVerification(v => ({
                                      ...v,
                                      doctorName: doc.name,
                                      doctorQualification: doc.qualification || '',
                                      doctorRegNo: doc.registrationNo || '',
                                      doctorDesignation: doc.designation || 'Senior Pathologist',
                                      doctorSignatureUrl: doc.signatureUrl || '',
                                    }));
                                  } else {
                                    setVerification(v => ({
                                      ...v,
                                      doctorName: '',
                                      doctorQualification: '',
                                      doctorRegNo: '',
                                      doctorDesignation: '',
                                      doctorSignatureUrl: '',
                                    }));
                                  }
                                }}
                                className="w-full text-xs font-semibold bg-background border border-primary/30 rounded-lg px-2.5 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                              >
                                <option value="">
                                  {availableDoctors.length === 0
                                    ? (verification.reportBranchId ? '-- No Doctors Found for this Branch --' : '-- Select Branch First --')
                                    : '-- Choose Registered Doctor (Auto-fill) --'}
                                </option>
                                {availableDoctors.map(d => (
                                  <option key={d.id} value={d.id}>
                                    {d.name} ({d.qualification || 'MBBS'} - Reg: {d.registrationNo})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Doctor Name</label>
                              <input
                                type="text"
                                placeholder="e.g. Dr. Anjali Mehta"
                                value={verification.doctorName}
                                disabled={isReportCreated}
                                readOnly={isReportCreated}
                                onChange={e => setVerification(v => ({ ...v, doctorName: e.target.value }))}
                                className={cn(
                                  "w-full text-xs border rounded-lg px-2.5 py-2 outline-none transition-colors",
                                  isReportCreated
                                    ? "bg-muted/70 text-foreground cursor-not-allowed border-dashed border-border font-medium select-none"
                                    : "border-input focus:border-primary bg-card"
                                )}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Qualification</label>
                              <input
                                type="text"
                                placeholder="e.g. MD Pathology"
                                value={verification.doctorQualification}
                                disabled={isReportCreated}
                                readOnly={isReportCreated}
                                onChange={e => setVerification(v => ({ ...v, doctorQualification: e.target.value }))}
                                className={cn(
                                  "w-full text-xs border rounded-lg px-2.5 py-2 outline-none transition-colors",
                                  isReportCreated
                                    ? "bg-muted/70 text-foreground cursor-not-allowed border-dashed border-border font-medium select-none"
                                    : "border-input focus:border-primary bg-card"
                                )}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Registration No.</label>
                              <input
                                type="text"
                                placeholder="e.g. MCI-44922"
                                value={verification.doctorRegNo}
                                disabled={isReportCreated}
                                readOnly={isReportCreated}
                                onChange={e => setVerification(v => ({ ...v, doctorRegNo: e.target.value }))}
                                className={cn(
                                  "w-full text-xs border rounded-lg px-2.5 py-2 outline-none transition-colors font-mono",
                                  isReportCreated
                                    ? "bg-muted/70 text-teal-700 dark:text-teal-300 cursor-not-allowed border-dashed border-border font-bold select-none"
                                    : "border-input focus:border-primary bg-card"
                                )}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Designation</label>
                              <input
                                type="text"
                                placeholder="e.g. Senior Pathologist"
                                value={verification.doctorDesignation}
                                disabled={isReportCreated}
                                readOnly={isReportCreated}
                                onChange={e => setVerification(v => ({ ...v, doctorDesignation: e.target.value }))}
                                className={cn(
                                  "w-full text-xs border rounded-lg px-2.5 py-2 outline-none transition-colors",
                                  isReportCreated
                                    ? "bg-muted/70 text-foreground cursor-not-allowed border-dashed border-border font-medium select-none"
                                    : "border-input focus:border-primary bg-card"
                                )}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Verification Date & Time</label>
                              <input
                                type="datetime-local"
                                value={verification.doctorVerifiedAt ? toLocalDatetimeValue(verification.doctorVerifiedAt) : ''}
                                disabled={isReportCreated}
                                readOnly={isReportCreated}
                                onChange={e => setVerification(v => ({ ...v, doctorVerifiedAt: new Date(e.target.value).toISOString() }))}
                                className={cn(
                                  "w-full text-xs border rounded-lg px-2.5 py-2 outline-none transition-colors",
                                  isReportCreated
                                    ? "bg-muted/70 text-foreground cursor-not-allowed border-dashed border-border font-medium select-none"
                                    : "border-input focus:border-primary bg-card"
                                )}
                              />
                            </div>

                            <div className="md:col-span-2 pt-1 border-t border-border/50">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-bold text-muted-foreground">Doctor Signature</span>
                                {verification.doctorSignatureUrl ? (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                    <Check className="h-3 w-3" /> Uploaded Signature Ready
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                    Using Digital Stamp Fallback
                                  </span>
                                )}
                              </div>
                              {verification.doctorSignatureUrl ? (
                                <div className="flex items-center gap-3 p-2 bg-muted/40 rounded-lg border border-border">
                                  <div className="h-10 px-3 py-1 bg-white rounded border border-border flex items-center justify-center shadow-xs">
                                    <img
                                      src={verification.doctorSignatureUrl}
                                      alt="Doctor Signature"
                                      className="max-h-8 max-w-[120px] object-contain"
                                      crossOrigin="anonymous"
                                    />
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    Actual uploaded signature will be displayed on the final test report.
                                  </div>
                                </div>
                              ) : (
                                <div className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg border border-dashed border-border">
                                  No signature uploaded for this doctor. The standard "DIGITALLY SIGNED" stamp will be displayed. You can upload their signature anytime in Doctor Management.
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-border">
                  <button onClick={() => setSelectedBooking(null)} className="px-4 py-2.5 border border-border hover:bg-muted rounded-lg text-xs font-bold text-center">Back</button>
                  <button onClick={handleSaveDraft} disabled={saving} className="px-4 py-2.5 border border-border hover:bg-muted rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-60">
                    <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button onClick={handleGenerateReport} disabled={saving} className="px-6 py-2.5 bg-primary text-white hover:bg-primary/90 rounded-lg text-xs font-black flex items-center justify-center gap-2 shadow-sm disabled:opacity-60">
                    <FileCheck className="h-4 w-4" /> {saving ? 'Submitting...' : 'Generate & Submit for Approval'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="bg-card border border-dashed border-border rounded-2xl h-[450px] flex flex-col items-center justify-center text-center p-8 shadow-inner space-y-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center"><ClipboardList className="h-6 w-6" /></div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">No booking selected</h3>
                  <p className="text-sm text-muted-foreground max-w-md">Select an existing booking from mobile app or register a new walk-in patient.</p>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => { setModalTab('walkin'); setShowModal(true); }}
                    className="px-4 py-2 bg-card border border-primary/30 text-primary hover:bg-primary/5 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs"
                  >
                    <UserPlus className="h-4 w-4" /> Add New Patient
                  </button>
                  <button
                    onClick={() => { setModalTab('existing'); setShowModal(true); }}
                    className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs hover:bg-primary/90"
                  >
                    <FileText className="h-4 w-4" /> Select Existing Booking
                  </button>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};