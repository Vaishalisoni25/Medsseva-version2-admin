import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { updateBookingStatus, assignPersonnel, assignPartnerLocal, updateBookingStatusAsync, fetchBookings } from '../redux/slices/bookingSlice';

import { useBookingsQuery } from '@/hooks/useAdminQueries';
import { Booking, BookingStatus } from '../types';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Calendar,
  Clock,
  MapPin,
  Phone,
  User as UserIcon,
  Activity,
  X,
  UserPlus,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Check,
  XCircle,
  Home,
  Building2,
  Star,
  FileText,
  FlaskConical,
  Receipt,
  Printer,
  Sparkles,
  Download,
  Loader2,
} from 'lucide-react';

import { cn } from '../utils/cn';
import toast from 'react-hot-toast';
import { processPayment } from '../utils/PaymentModule';
import { testService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { customFormatService } from '../services/customFormat.service';
import { LiveInvoicePreview } from '../components/customFormats/LiveInvoicePreview';
import { exportInvoiceToPdf } from '../utils/exportInvoicePdf';

const STATUS_COLORS: Record<BookingStatus, { bg: string; text: string; border: string }> = {
  'Pending': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Confirmed': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Doctor Reference': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'Assigned': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'Collected': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Received': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  'Accessioned': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  'Processing': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  'Under QC': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Approved': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  'Completed': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Cancelled': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  'Sample Rejected': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
};

const ALL_STATUSES: BookingStatus[] = ['Pending', 'Confirmed', 'Doctor Reference', 'Assigned', 'Collected', 'Processing', 'Completed'];

export const BookingsPage: React.FC = () => {
 const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const bookings = useAppSelector(state => state.bookings.bookings);
  const reports = useAppSelector(state => state.reports.reports);
  const allTests = useAppSelector(state => state.tests.tests);
  const currentUser = useAppSelector(state => state.auth.user);
const currentCityId = useAppSelector(state => state.auth.currentCityId);
  const currentBranchId = useAppSelector(state => state.auth.currentBranchId);
  const { bookings: storeBookings } = useAppSelector(state => state.bookings);
const { isLoading: bookingsQueryLoading } = useBookingsQuery();
  const [pageLoading, setPageLoading] = useState(storeBookings.length === 0 && bookingsQueryLoading);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentTab, setAssignmentTab] = useState<'PHLEBOTOMIST' | 'STAFF'>('PHLEBOTOMIST');
  const [assignType, setAssignType] = useState<'phlebotomist' | 'technician'>('phlebotomist');
const [executives, setExecutives] = useState<any[]>([]);
  const [availablePartners, setAvailablePartners] = useState<any[]>([]);
  const [isAssigningPartner, setIsAssigningPartner] = useState(false);
const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
const [isLabActioning, setIsLabActioning] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
const [isLabStatusUpdating, setIsLabStatusUpdating] = useState(false);
const [isCollectingPayment, setIsCollectingPayment] = useState(false);
const [isSendingInvoice, setIsSendingInvoice] = useState(false);
const [customInvoiceTemplates, setCustomInvoiceTemplates] = useState<any[]>([]);
const [invoiceModalBooking, setInvoiceModalBooking] = useState<Booking | null>(null);
const [selectedInvoiceTemplateId, setSelectedInvoiceTemplateId] = useState<string>('');
const [isExportingInvoicePDF, setIsExportingInvoicePDF] = useState(false);

const handleDownloadInvoicePDF = async () => {
  if (!invoiceModalBooking) return;
  setIsExportingInvoicePDF(true);
  try {
    await exportInvoiceToPdf(
      'booking-invoice-capture',
      `Invoice_${invoiceModalBooking.bookingCode || invoiceModalBooking.id}.pdf`
    );
    toast.success('Invoice PDF downloaded successfully');
  } catch (err) {
    console.error('Invoice PDF export failed:', err);
    toast.error('Failed to export PDF');
  } finally {
    setIsExportingInvoicePDF(false);
  }
};

React.useEffect(() => {
  Promise.all([
    testService.getExecutives().then(res => {
      if (Array.isArray(res)) setExecutives(res);
      else if (res?.data && Array.isArray(res.data)) setExecutives(res.data);
    }).catch(() => {}),
    testService.getAvailablePartners().then(res => {
      if (Array.isArray(res)) setAvailablePartners(res);
      else if (res?.data && Array.isArray(res.data)) setAvailablePartners(res.data);
    }).catch(() => {}),
    customFormatService.getInvoiceTemplates().then(tpls => {
      if (Array.isArray(tpls)) {
        setCustomInvoiceTemplates(tpls);
        const def = tpls.find(t => t.isDefault) || tpls[0];
        if (def) setSelectedInvoiceTemplateId(def.id);
      }
    }).catch(() => {}),
  ]);
}, []);

  React.useEffect(() => {
    if (!bookingsQueryLoading) setPageLoading(false);
  }, [bookingsQueryLoading]);


const handleQuickAction = async (id: string, status: BookingStatus, e: React.MouseEvent, amount: number = 500) => {
    e.stopPropagation();
    if (status === 'Confirmed') {
      dispatch(updateBookingStatusAsync({ id, status }));
      toast.success('Booking confirmed! Payment will be collected at visit.');
    } else {
      dispatch(updateBookingStatusAsync({ id, status }));
      toast.error('Booking rejected & moved to cancelled records.');
    }
  };

const phlebotomists: any[] = [];
  const technicians: any[] = [];
  const allExecutives = executives;

  // Filtering
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.bookingCode.toLowerCase().includes(search.toLowerCase()) ||
      b.patient.name.toLowerCase().includes(search.toLowerCase()) ||
      b.patient.phone.includes(search);
    const matchesStatus = selectedStatus === 'All' || b.status === selectedStatus;
    
    // Role based visibility filters
    let matchesRole = true;
    if (currentUser?.role === 'phlebotomist') {
      matchesRole = b.phlebotomistId === currentUser.id;
    } else if (currentUser?.role === 'franchise_admin') {
      matchesRole = b.franchiseId === currentUser.franchiseId;
    }

    // Global city / branch context filtering
    let matchesCity = true;
    if (currentCityId && currentCityId !== 'all') {
      matchesCity = b.cityId === currentCityId;
    }
    let matchesBranch = true;
    if (currentBranchId && currentBranchId !== 'all') {
      matchesBranch = b.branchId === currentBranchId;
    }

    return matchesSearch && matchesStatus && matchesRole && matchesCity && matchesBranch;
  });

const handleAssign = async (userId: string) => {
    if (!selectedBooking) return;

    try {
      // For HOME collection: use real assignExecutive API
      if ((selectedBooking as any).collectionMode === 'HOME') {
        await testService.assignExecutive(selectedBooking.id, userId);
        dispatch(updateBookingStatusAsync({ id: selectedBooking.id, status: 'Assigned' }));
        const updated = { ...selectedBooking, phlebotomistId: userId, status: 'Assigned' as any };
        setSelectedBooking(updated);
        toast.success('Lab assistant assigned successfully.');
      } else {
        // LAB visit: local assignment only (no executive dispatch needed)
        dispatch(assignPersonnel({
          id: selectedBooking.id,
          phlebotomistId: assignType === 'phlebotomist' ? userId : undefined,
          technicianId: assignType === 'technician' ? userId : undefined,
        }));
        if (assignType === 'phlebotomist') {
          dispatch(updateBookingStatus({ id: selectedBooking.id, status: 'Assigned' }));
          setSelectedBooking({ ...selectedBooking, phlebotomistId: userId, status: 'Assigned' });
        } else {
          dispatch(updateBookingStatus({ id: selectedBooking.id, status: 'Processing' }));
          setSelectedBooking({ ...selectedBooking, technicianId: userId, status: 'Processing' });
        }
        toast.success('Staff assigned.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Assignment failed.');
    }
 setIsAssigning(false);
  };

  const handleAssignPartner = async (partnerId: string, partnerName: string) => {
    if (!selectedBooking) return;
    try {
      await testService.assignPartner(selectedBooking.id, partnerId);
      dispatch(assignPartnerLocal({ id: selectedBooking.id, partnerId, partnerName }));
      setSelectedBooking({ ...selectedBooking, status: 'Assigned' } as any);
      toast.success(`Partner ${partnerName} assigned successfully.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Partner assignment failed.');
    }
    setIsAssigningPartner(false);
  };
const handleAcceptLabBooking = async () => {
    if (!selectedBooking) return;
    setIsLabActioning(true);
    try {
      await testService.acceptLabBooking(selectedBooking.id);
      dispatch(updateBookingStatusAsync({ id: selectedBooking.id, status: 'Confirmed' }));
      setSelectedBooking({ ...selectedBooking, status: 'Confirmed' });
      toast.success('Lab visit booking accepted.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to accept booking.');
    }
    setIsLabActioning(false);
  };

  const handleAcceptDispatch = async () => {
    if (!selectedBooking) return;
    setIsLabActioning(true);
    try {
      await testService.acceptDispatchBooking(selectedBooking.id);
      dispatch(updateBookingStatusAsync({ id: selectedBooking.id, status: 'Processing' }));
      setSelectedBooking({ ...selectedBooking, status: 'Processing' });
      toast.success('Doctor Dispatch accepted. Moving to Processing.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to accept dispatch.');
    }
    setIsLabActioning(false);
  };

const handleUpdateLabStatus = async (status: string) => {
    if (!selectedBooking) return;
    const LAB_TERMINAL = ['COMPLETED', 'CANCELLED', 'REJECTED'];
    if (LAB_TERMINAL.includes((selectedBooking as any).rawStatus)) {
      toast.error('This booking workflow is already complete. No further actions are allowed.');
      return;
    }
    setIsLabStatusUpdating(true);
    try {
      await testService.updateLabStatus(selectedBooking.id, status);
      const statusMap: Record<string, any> = {
        SAMPLE_COLLECTED: 'Collected',
        PROCESSING: 'Processing',
        REPORT_READY: 'Approved',
        COMPLETED: 'Completed',
      };
      const localStatus = statusMap[status] || selectedBooking.status;
      dispatch(updateBookingStatusAsync({ id: selectedBooking.id, status: localStatus }));
      setSelectedBooking((prev: any) => prev ? { ...prev, status: localStatus, rawStatus: status } : prev);
      toast.success(`Status updated to ${status.replace(/_/g, ' ')}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update status.');
    }
    setIsLabStatusUpdating(false);
  };
  const handleRejectLabBooking = async () => {
    if (!selectedBooking || !rejectReason.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }
    setIsLabActioning(true);
    try {
      await testService.rejectLabBooking(selectedBooking.id, rejectReason.trim());
      dispatch(updateBookingStatusAsync({ id: selectedBooking.id, status: 'Cancelled' }));
      setSelectedBooking({ ...selectedBooking, status: 'Cancelled' });
      setShowRejectInput(false);
      setRejectReason('');
      toast.success('Lab visit booking rejected.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to reject booking.');
    }
    setIsLabActioning(false);
  };

const handleMarkPayment = async (bookingId: string, paymentStatus: 'SUCCESS', paymentMode: string) => {
    setIsUpdatingPayment(true);
    try {
      await testService.updatePaymentStatus(bookingId, paymentStatus, paymentMode);
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, paymentStatus: 'SUCCESS' as any });
      }
      toast.success('Payment marked as received.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update payment.');
    }
    setIsUpdatingPayment(false);
  };

  const handleSendInvoice = async (bookingId?: any) => {
    let targetId: string = '';
    if (typeof bookingId === 'string' && bookingId.trim()) {
      targetId = bookingId.trim();
    } else if (bookingId && typeof bookingId === 'object' && typeof bookingId.id === 'string') {
      targetId = bookingId.id;
    } else if (selectedBooking && typeof selectedBooking.id === 'string') {
      targetId = selectedBooking.id;
    }

    if (!targetId || targetId === '[object Object]') return;

    setIsSendingInvoice(true);
    try {
      const res = await testService.sendInvoice(targetId);
      toast.success(res?.message || 'Invoice sent to patient successfully.');
      dispatch(fetchBookings() as any);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to send invoice.');
    } finally {
      setIsSendingInvoice(false);
    }
  };

  const handleCollectPayment = async () => {
    if (!selectedBooking) return;
    setIsCollectingPayment(true);
    await processPayment({
      bookingId: selectedBooking.id,
      amount: selectedBooking.totalAmount,
      bookingCode: selectedBooking.bookingCode,
      customerName: selectedBooking.patient.name,
      customerPhone: selectedBooking.patient.phone,
      description: `MedSeva Booking ${selectedBooking.bookingCode}`,
      onSuccess: async () => {
        setIsCollectingPayment(false);
        setSelectedBooking((prev: any) => prev ? { ...prev, paymentStatus: 'SUCCESS' } : prev);
        toast.success('✓ Payment confirmed! Proceed to sample collection.');
        dispatch(fetchBookings() as any);
      },
      onFailure: (error) => {
        setIsCollectingPayment(false);
        const description = error?.error?.description;
        if (description) {
          toast.error('Payment was not completed. You can retry or collect cash.');
        }
      },
    });
    setIsCollectingPayment(false);
  };
  const handleStatusChange = async (status: BookingStatus) => {
    if (!selectedBooking) return;
    
if (status === 'Confirmed') {
      dispatch(updateBookingStatusAsync({ id: selectedBooking.id, status }));
      setSelectedBooking({ ...selectedBooking, status });
      toast.success('Booking confirmed! Payment will be collected at visit.');
    } else {
      dispatch(updateBookingStatusAsync({ id: selectedBooking.id, status }));
      setSelectedBooking({ ...selectedBooking, status });
    }
  };

const getStaffName = (id?: string) => {
    if (!id) return 'Not Assigned';
    const found = executives.find((u: any) => u.id === id);
    return found?.name || 'Not Assigned';
  };

 
  const getPhlebotomistDisplay = (booking: any): string => {
    if (booking.collectionMode === 'HOME') {
      if (booking.assignedPartner?.user?.name) {
        return booking.assignedPartner.user.name;
      }
      if (booking.assignedPartnerId) {
     
        return `Partner (${booking.assignedPartnerId.slice(0, 6)}...)`;
      }
    }
    return getStaffName(booking.phlebotomistId);
  };

  return (
    <div className="space-y-6 pb-10">
     
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Diagnostic Bookings</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Track sample collections, clinical processing, and field phlebotomy.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Search booking or phone..."
              className="w-full pl-9 pr-4 py-2 rounded-md bg-card border border-input text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="py-2 pl-3 pr-8 rounded-md bg-card border border-input text-xs sm:text-sm outline-none cursor-pointer focus:ring-2 focus:ring-primary/20 flex-1 sm:flex-none"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Assigned">Assigned</option>
            <option value="Collected">Collected</option>
            <option value="Processing">Processing</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {pageLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border p-4 rounded-xl shadow-sm animate-pulse">
              <div className="h-3 bg-muted rounded w-20 mb-3" />
              <div className="h-7 bg-muted rounded w-10" />
            </div>
          ))
        ) : (
          <>
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase">Total Active</div>
              <div className="text-xl sm:text-2xl font-bold mt-1">{filteredBookings.filter(b => b.status !== 'Completed' && b.status !== 'Cancelled').length}</div>
            </div>
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase">Pending Pickup</div>
              <div className="text-xl sm:text-2xl font-bold mt-1 text-amber-600">{filteredBookings.filter(b => b.status === 'Confirmed' || b.status === 'Assigned').length}</div>
            </div>
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase">In Processing</div>
              <div className="text-xl sm:text-2xl font-bold mt-1 text-sky-600">{filteredBookings.filter(b => b.status === 'Processing').length}</div>
            </div>
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase">Completed</div>
              <div className="text-xl sm:text-2xl font-bold mt-1 text-emerald-600">{filteredBookings.filter(b => b.status === 'Completed').length}</div>
            </div>
          </>
        )}
      </div>
     
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[950px]">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-6 py-4 font-bold">Booking Code</th>
                <th className="px-6 py-4 font-bold">Patient</th>
                <th className="px-6 py-4 font-bold">Date & Slot</th>
                <th className="px-6 py-4 font-bold">Test/Package</th>
                <th className="px-6 py-4 font-bold">Status</th>
              <th className="px-6 py-4 font-bold">Mode</th>
            <th className="px-6 py-4 font-bold">Phlebotomist</th>
                <th className="px-6 py-4 font-bold">Delivery Branch</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
       <tbody className="divide-y divide-border">
              {pageLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-24" /></td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-muted rounded w-28 mb-1" />
                      <div className="h-3 bg-muted rounded w-20" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-muted rounded w-20 mb-1" />
                      <div className="h-3 bg-muted rounded w-14" />
                    </td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-32" /></td>
                    <td className="px-6 py-4"><div className="h-5 bg-muted rounded-full w-20" /></td>
                    <td className="px-6 py-4"><div className="h-5 bg-muted rounded w-14" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-20" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredBookings.map((booking) => (
                <tr 
                  key={booking.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedBooking(booking)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-semibold text-foreground block">{booking.bookingCode}</span>
                  {booking.address?.city && (
  <span className="text-[9px] font-extrabold bg-[#006D6F]/10 text-[#006D6F] px-1.5 py-0.5 rounded border border-[#006D6F]/20 mt-1 inline-block uppercase tracking-wider">
    {booking.address.city}
  </span>
)}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-foreground">{booking.patient.name}</div>
                      <div className="text-xs text-muted-foreground">{booking.patient.gender}, {booking.patient.age} yrs</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-foreground font-medium">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {booking.bookingDate}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {booking.collectionSlot}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-[200px] truncate text-foreground">
                      {booking.packages.length > 0 ? (
                        <span className="bg-primary/10 text-primary text-[11px] font-semibold px-2 py-0.5 rounded border border-primary/20">
                          {booking.packages[0].name}
                        </span>
                      ) : booking.tests.length > 0 ? (
                        <span>{booking.tests.map(t => t.name).join(', ')}</span>
                      ) : (
                        'No Items'
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 text-xs font-bold border rounded-full",
                      STATUS_COLORS[booking.status]?.bg || 'bg-gray-50',
                      STATUS_COLORS[booking.status]?.text || 'text-gray-600',
                      STATUS_COLORS[booking.status]?.border || 'border-gray-200'
                    )}>
                      {booking.status}
                    </span>
                  </td>
          <td className="px-6 py-4 whitespace-nowrap">
              <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded border",
                      (booking as any).collectionMode === 'HOME'
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-purple-50 text-purple-700 border-purple-200"
                    )}>
                      {(booking as any).collectionMode === 'HOME'
                        ? <><Home className="h-3 w-3" /> Home</>
                        : <><Building2 className="h-3 w-3" /> Lab</>
                      }
                    </span>
                  </td>
          <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                        {getPhlebotomistDisplay(booking).charAt(0)}
                      </div>
                      <span className="text-xs font-medium">{getPhlebotomistDisplay(booking)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(booking as any).sampleDelivery?.branch ? (
                      <div>
                        <div className="text-xs font-bold text-foreground">
                          {(booking as any).sampleDelivery.branch.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {(booking as any).sampleDelivery.branch.city}
                        </div>
                        <div className={`text-[10px] font-bold mt-0.5 ${
                          (booking as any).sampleDelivery.status === 'DELIVERED'
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }`}>
                          {(booking as any).sampleDelivery.status === 'DELIVERED'
                            ? 'Delivered'
                            : 'In Transit'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground font-medium">Not Selected</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    {booking.status === 'Pending' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={(e) => handleQuickAction(booking.id, 'Confirmed', e, booking.totalAmount)}
                          className="h-7 w-7 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-full flex items-center justify-center transition-colors shadow-sm border border-emerald-200"
                          title="Approve Booking"
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </button>
                        <button 
                          onClick={(e) => handleQuickAction(booking.id, 'Cancelled', e)}
                          className="h-7 w-7 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-full flex items-center justify-center transition-colors shadow-sm border border-rose-200"
                          title="Reject Booking"
                        >
                          <X className="h-3.5 w-3.5 stroke-[3]" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setSelectedBooking(booking)}
                        className="text-primary hover:text-primary/80 text-xs font-bold flex items-center gap-1 ml-auto hover:underline"
                      >
                        Details <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
        
              {!pageLoading && filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    No bookings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

     
      <AnimatePresence>
        {selectedBooking && (
          <>
            {/* Scrim */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40 cursor-pointer"
              onClick={() => setSelectedBooking(null)}
            />
            
            {/* Panel */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-full sm:max-w-md bg-background border-l border-border z-50 shadow-2xl flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-border flex items-center justify-between bg-card">
                <div>
                  <div className="text-xs font-bold text-primary tracking-widest uppercase">Booking Details</div>
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    {selectedBooking.bookingCode}
                  </h2>
                </div>
                <button 
                  onClick={() => setSelectedBooking(null)}
                  className="p-2 rounded-lg hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

             
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Workflow Actions */}
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-primary tracking-wider uppercase mb-3 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" /> Workflow Operations
                  </h3>
                  <div className="flex flex-wrap gap-2">
             {(selectedBooking.status === 'Pending' || (selectedBooking as any).status === 'WAITING_FOR_ASSIGNMENT') && (
                      (selectedBooking as any).collectionMode === 'LAB' ? (
                        <div className="w-full space-y-2">
                          <div className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                            Lab Visit booking, pending lab approval
                          </div>
                          {!showRejectInput ? (
                            <div className="flex gap-2">
                              <button
                                disabled={isLabActioning}
                                onClick={handleAcceptLabBooking}
                                className="px-3 py-1.5 bg-[#006d6f] text-white rounded text-xs font-bold hover:bg-[#00595b] flex items-center gap-1 disabled:opacity-50"
                              >
                                <Check className="h-3.5 w-3.5" /> Accept Lab Visit
                              </button>
                              <button
                                disabled={isLabActioning}
                                onClick={() => setShowRejectInput(true)}
                                className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-bold hover:bg-rose-700 flex items-center gap-1 disabled:opacity-50"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Reject
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <input
                                type="text"
                                placeholder="Rejection reason (required)"
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                className="w-full px-3 py-1.5 border border-rose-300 rounded text-xs outline-none focus:ring-2 focus:ring-rose-200"
                              />
                              <div className="flex gap-2">
                                <button
                                  disabled={isLabActioning || !rejectReason.trim()}
                                  onClick={handleRejectLabBooking}
                                  className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-bold hover:bg-rose-700 disabled:opacity-50"
                                >
                                  {isLabActioning ? 'Rejecting...' : 'Confirm Reject'}
                                </button>
                                <button
                                  onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
                                  className="px-3 py-1.5 bg-muted text-foreground rounded text-xs font-bold"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStatusChange('Confirmed')}
                            className="px-3 py-1.5 bg-[#006d6f] text-white rounded text-xs font-bold hover:bg-[#00595b] flex items-center gap-1"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve Booking
                          </button>
                          <button
                            onClick={() => handleStatusChange('Cancelled')}
                            className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-bold hover:bg-rose-700 flex items-center gap-1"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject Booking
                          </button>
                        </>
                      )
                    )}
             
            {(selectedBooking as any).rawStatus === 'DELIVERED_TO_LAB' && (selectedBooking as any).collectionMode === 'LAB' && (
              <div className="w-full space-y-2 mt-4">
                <div className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-3 py-2">
                  Sample dispatched directly by Doctor. Awaiting Lab acceptance.
                </div>
                {!showRejectInput ? (
                  <div className="flex gap-2">
                    <button
                      disabled={isLabActioning}
                      onClick={handleAcceptDispatch}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 flex items-center gap-1 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" /> Accept Dispatch & Process
                    </button>
                    <button
                      disabled={isLabActioning}
                      onClick={() => setShowRejectInput(true)}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-bold hover:bg-rose-700 flex items-center gap-1 disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Rejection reason (required)"
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      className="w-full px-3 py-1.5 border border-rose-300 rounded text-xs outline-none focus:ring-2 focus:ring-rose-200"
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={isLabActioning || !rejectReason.trim()}
                        onClick={handleRejectLabBooking}
                        className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-bold hover:bg-rose-700 disabled:opacity-50"
                      >
                        {isLabActioning ? 'Rejecting...' : 'Confirm Reject'}
                      </button>
                      <button
                        onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
                        className="px-3 py-1.5 bg-muted text-foreground rounded text-xs font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

           {(selectedBooking as any).paymentStatus !== 'SUCCESS' &&
                      (selectedBooking as any).collectionMode === 'HOME' &&
                      selectedBooking.status !== 'Cancelled' &&
                      selectedBooking.status !== 'Pending' && (
                      <div className="w-full mb-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="text-xs font-bold text-amber-700 mb-2">
                          Cash payment pending: Lab assistant must collect before sample collection.
                        </div>
                        <button
                          disabled={isUpdatingPayment}
                          onClick={() => handleMarkPayment(selectedBooking.id, 'SUCCESS', 'CASH')}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {isUpdatingPayment ? 'Processing...' : 'Mark Cash Received'}
                        </button>
                      </div>
                    )}

        {(selectedBooking.status === 'Confirmed' || selectedBooking.status === 'Assigned') && (
                      <>
                        {(selectedBooking as any).collectionMode === 'LAB' ? (
                          <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                            <div className="flex items-center gap-2 text-slate-600 font-bold text-xs">
                              <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                              Waiting for Patient
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Patient has not yet checked in at the laboratory. Waiting for the patient to tap <span className="font-bold text-slate-700">"I Reached the Lab"</span> from the mobile application.
                            </p>
                          </div>
                        ) : (
                          <button 
                            onClick={() => {
                              setAssignmentTab('PHLEBOTOMIST');
                              setIsAssigning(true);
                            }}
                            className="px-3.5 py-1.5 bg-[#006d6f] hover:bg-[#00595b] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                          >
                            <UserPlus className="h-3.5 w-3.5" /> Assign Staff / Phlebotomist
                          </button>
                        )}
                      </>
                    )}

  {(() => {
                      const rawStatus = (selectedBooking as any).rawStatus;
                      const mode = (selectedBooking as any).collectionMode;
                      if (mode !== 'LAB') return null;
                      const LAB_TERMINAL = ['COMPLETED', 'CANCELLED', 'REJECTED'];
                      if (LAB_TERMINAL.includes(rawStatus)) {
                        if (rawStatus === 'COMPLETED') {
                          return (
                            <div className="w-full flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                              <span className="text-xs font-bold text-emerald-700">Workflow Completed, No further actions available.</span>
                            </div>
                          );
                        }
                        return null;
                      }
                      return null;
                    })()}
                 {(selectedBooking as any).paymentStatus === 'SUCCESS' && (
                      <div className="w-full">
                        <button
                          disabled={isSendingInvoice}
                          onClick={() => handleSendInvoice(selectedBooking.id)}
                          className="w-full px-3 py-2 bg-teal-600 text-white rounded text-xs font-bold hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {isSendingInvoice ? 'Sending Invoice...' : 'Send Invoice'}
                        </button>
                      </div>
                    )}

                    {(selectedBooking as any).rawStatus === 'PATIENT_REACHED_LAB' && (selectedBooking as any).collectionMode === 'LAB' && (
                      <div className="w-full p-3 bg-violet-50 border border-violet-200 rounded-lg space-y-2">
                        <div className="text-xs font-bold text-violet-700 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Patient has reached the lab
                        </div>
                   {(selectedBooking as any).paymentStatus !== 'SUCCESS' ? (
                          <>
                            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                              Payment pending: Open Razorpay Checkout for the patient to pay.
                            </div>
                            <button
                              disabled={isCollectingPayment}
                              onClick={handleCollectPayment}
                              className="px-3 py-1.5 bg-[#006d6f] text-white rounded text-xs font-bold hover:bg-[#00595b] disabled:opacity-50 flex items-center gap-1.5"
                            >
                              <Activity className="h-3.5 w-3.5" />
                              {isCollectingPayment ? 'Opening Checkout...' : 'Collect Payment'}
                            </button>
                            <button
                              disabled={isUpdatingPayment}
                              onClick={() => handleMarkPayment(selectedBooking.id, 'SUCCESS', 'CASH')}
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {isUpdatingPayment ? 'Processing...' : 'Mark Cash Received'}
                            </button>
                          </>
                        ) : (
                          <button
                            disabled={isLabStatusUpdating}
                            onClick={() => handleUpdateLabStatus('SAMPLE_COLLECTED')}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {isLabStatusUpdating ? 'Updating...' : 'Mark Sample Collected'}
                          </button>
                        )}
                      </div>
                    )}
       {(selectedBooking as any).rawStatus === 'SAMPLE_COLLECTED' && (selectedBooking as any).collectionMode === 'LAB' && (
                      <button
                        disabled={isLabStatusUpdating}
                        onClick={() => handleUpdateLabStatus('PROCESSING')}
                        className="px-3 py-1.5 bg-sky-600 text-white rounded text-xs font-bold hover:bg-sky-700 disabled:opacity-50"
                      >
                        {isLabStatusUpdating ? 'Updating...' : 'Start Processing'}
                      </button>
                    )}

           {(selectedBooking as any).rawStatus === 'PROCESSING' && (selectedBooking as any).collectionMode === 'LAB' && (
                      <div className="w-full p-3 bg-teal-50 border border-teal-200 rounded-lg space-y-2">
                        <div className="text-xs font-bold text-teal-700 flex items-center gap-1.5">
                          <FlaskConical className="h-3.5 w-3.5" /> Sample is being processed
                        </div>
                        <p className="text-xs text-teal-600">
                          Open the Report Builder to enter test values and finalize. Booking automatically becomes Report Ready after finalization.
                        </p>
                        <button
                          onClick={() => navigate(`/report-builder?bookingId=${(selectedBooking as any).id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white rounded text-xs font-bold hover:bg-teal-700"
                        >
                          <FileText className="h-3.5 w-3.5" /> Make Report
                        </button>
                      </div>
                    )}

                    {(selectedBooking as any).rawStatus === 'REPORT_READY' && (selectedBooking as any).collectionMode === 'LAB' && (
                      <div className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                        <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Report is ready to send
                        </div>
                        <p className="text-xs text-emerald-600">
                          Report has been finalized. Send it to the patient — booking becomes Completed automatically.
                        </p>
                        <button
                          onClick={() => navigate(`/report-approval`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700"
                        >
                          <FileText className="h-3.5 w-3.5" /> Send Report
                        </button>
                      </div>
                    )}
          {(selectedBooking as any).collectionMode === 'HOME' &&
                      ['DELIVERED_TO_LAB', 'PROCESSING'].includes((selectedBooking as any).rawStatus) && (
                      <div className="w-full p-3 bg-teal-50 border border-teal-200 rounded-lg space-y-2">
                        <div className="text-xs font-bold text-teal-700 flex items-center gap-1.5">
                          <FlaskConical className="h-3.5 w-3.5" /> Sample received at lab
                        </div>
                        <p className="text-xs text-teal-600">
                          Open the Report Builder to enter test values, finalize, and send the report to the patient. Booking becomes Completed automatically after sending.
                        </p>
                        <button
                          onClick={() => navigate(`/report-builder?bookingId=${(selectedBooking as any).id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white rounded text-xs font-bold hover:bg-teal-700"
                        >
                          <FileText className="h-3.5 w-3.5" /> Make Report
                        </button>
                      </div>
                    )}

                    {(selectedBooking as any).collectionMode === 'HOME' &&
                      (selectedBooking as any).rawStatus === 'REPORT_READY' && (
                      <div className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                        <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Report is ready to send
                        </div>
                        <p className="text-xs text-emerald-600">
                          The report has been finalized. Open Report Approval to send it to the patient. Booking becomes Completed automatically.
                        </p>
                        <button
                          onClick={() => navigate(`/report-approval`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700"
                        >
                          <FileText className="h-3.5 w-3.5" /> Send Report
                        </button>
                      </div>
                    )}

           
  
                  </div>
                </div>

                {/* Patient Card */}
                <div className="bg-card border border-border p-4 rounded-xl">
                  <h3 className="text-sm font-bold border-b border-border pb-2 mb-3 flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-primary" /> Patient Profile
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="font-bold text-foreground text-base">{selectedBooking.patient.name}</div>
                    <div className="text-muted-foreground flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> {selectedBooking.patient.phone}
                    </div>
                    <div className="text-muted-foreground flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{selectedBooking.patient.address}</span>
                    </div>
                    <div className="text-xs bg-muted font-medium inline-block px-2 py-1 rounded mt-1">
                      {selectedBooking.patient.gender}, {selectedBooking.patient.age} Years
                    </div>
                  </div>
                </div>

              
                <div>
                  <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-foreground">
                    Diagnosed Items
                  </h3>
                  <div className="space-y-2">
                    {selectedBooking.packages.map(pkg => (
                      <div key={pkg.id} className="border border-primary/30 bg-primary/5 p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-primary text-sm">{pkg.name}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">Wellness Package</div>
                          </div>
                          <div className="font-bold text-sm text-foreground">₹{pkg.discountedPrice || pkg.price}</div>
                        </div>
                      </div>
                    ))}
                    {selectedBooking.tests.map(test => (
                      <div key={test.id} className="border border-border p-3 rounded-lg flex justify-between items-start">
                        <div>
                          <div className="font-bold text-sm text-foreground">{test.name}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">Single Test ({test.category})</div>
                        </div>
                        <div className="font-bold text-sm text-foreground">₹{test.discountedPrice || test.price}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <div className="text-sm font-bold text-foreground">Total Invoiced:</div>
                    <div className="text-lg font-extrabold text-primary">₹{selectedBooking.totalAmount}</div>
                  </div>
                  <button
                    onClick={() => {
                      setInvoiceModalBooking(selectedBooking);
                      const def = customInvoiceTemplates.find(t => t.isDefault) || customInvoiceTemplates[0];
                      if (def) setSelectedInvoiceTemplateId(def.id);
                    }}
                    className="w-full mt-2 py-2 px-3 bg-teal-50 dark:bg-teal-950/30 hover:bg-teal-100 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-teal-600" /> View / Print Custom Invoice
                  </button>
                </div>

                
          <div className="border-t border-border pt-4">
                  <h3 className="text-sm font-bold mb-4 text-foreground">Diagnostic Workflow Timeline</h3>
                  {(() => {
                    const mode = (selectedBooking as any).collectionMode;
                    const rawStatus = (selectedBooking as any).rawStatus || '';
                    const paymentDone = (selectedBooking as any).paymentStatus === 'SUCCESS';

                    if (mode === 'LAB') {
                      const LAB_STATUS_RANK: Record<string, number> = {
                        WAITING_FOR_ASSIGNMENT: 0,
                        PENDING: 0,
                        CONFIRMED: 1,
                        PATIENT_REACHED_LAB: 2,
                        SAMPLE_COLLECTED: 4,
                        PROCESSING: 5,
                        REPORT_READY: 6,
                        COMPLETED: 7,
                        CANCELLED: -1,
                        REJECTED: -1,
                      };
                      const currentRank = LAB_STATUS_RANK[rawStatus] ?? 0;
                      const LAB_STEPS: { label: string; desc: string; rank: number }[] = [
                        { label: 'Booking Requested', desc: 'Patient submitted a lab visit booking', rank: 0 },
                        { label: 'Booking Confirmed', desc: 'Admin accepted the booking', rank: 1 },
                        { label: 'Patient Reached Lab', desc: 'Patient confirmed arrival at lab counter', rank: 2 },
                        { label: 'Payment Completed', desc: paymentDone ? 'Payment received successfully' : 'Awaiting payment collection', rank: 3 },
                        { label: 'Sample Collected', desc: 'Specimen collected and accessioned', rank: 4 },
                        { label: 'Report Ready', desc: 'Report finalized via Report Builder', rank: 6 },
                        { label: 'Report Sent', desc: 'Report delivered to patient', rank: 7 },
                        { label: 'Completed', desc: 'Booking closed after report delivery', rank: 7 },
                      ];
                      return (
                        <div className="relative pl-6 border-l border-dashed border-border space-y-6">
                          {LAB_STEPS.map((step, idx) => {
                            let isDone = false;
                            let isCurrent = false;
                            if (idx === 0) {
                              isDone = true;
                            } else if (idx === 3) {
                              isDone = currentRank >= 2 && paymentDone;
                              isCurrent = currentRank >= 2 && !paymentDone;
                            } else {
                              isDone = currentRank >= step.rank;
                              isCurrent = !isDone && currentRank === step.rank - 1;
                            }
                            return (
                              <div key={idx} className="relative">
                                <span className={cn(
                                  "absolute -left-[31px] top-0.5 h-4 w-4 rounded-full border-2 border-background flex items-center justify-center shadow-sm transition-colors",
                                  isDone ? "bg-primary border-primary" : "bg-card border-muted-foreground/40",
                                  isCurrent && "ring-4 ring-primary/20"
                                )}>
                                  {isDone && <CheckCircle2 className="h-3 w-3 text-white" />}
                                </span>
                                <div className="text-sm font-bold flex items-center gap-2">
                                  <span className={isDone || isCurrent ? "text-foreground" : "text-muted-foreground"}>{step.label}</span>
                                  {isCurrent && <span className="bg-primary/10 text-primary text-[10px] uppercase px-1.5 py-0.5 rounded font-black">Live</span>}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">{step.desc}</div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                const HOME_STATUS_RANK: Record<string, number> = {
                      PENDING: 0,
                      WAITING_FOR_PARTNER: 0,
                      ASSIGNED: 1,
                      ACCEPTED: 1,
                      ON_THE_WAY: 2,
                      REACHED_LOCATION: 3,
                      SAMPLE_COLLECTED: 4,
                      DELIVERING_TO_BRANCH: 5,
                      DELIVERED_TO_LAB: 6,
                      PROCESSING: 6,
                      REPORT_READY: 7,
                      COMPLETED: 8,
                    };
                    const homeRank = HOME_STATUS_RANK[rawStatus] ?? 0;
                    const HOME_STEPS: { label: string; desc: string; rank: number }[] = [
                      { label: 'Booking Requested',     desc: 'Patient submitted a home collection booking',           rank: 0 },
                      { label: 'Partner Assigned',      desc: 'Sample collection executive assigned and accepted',     rank: 1 },
                      { label: 'Partner On The Way',    desc: 'Executive heading to patient location',                 rank: 2 },
                      { label: 'Partner Arrived',       desc: 'Executive reached patient location',                   rank: 3 },
                      { label: 'Sample Collected',      desc: 'Sample collected from patient',                        rank: 4 },
                      { label: 'Partner Selected Branch', desc: 'Partner chose delivery branch, heading to lab',      rank: 5 },
                      { label: 'Sample Reached Lab',    desc: 'Sample delivered to lab branch by partner',            rank: 6 },
                      { label: 'Report Ready',          desc: 'Report finalized by admin via Report Builder',         rank: 7 },
                      { label: 'Completed',             desc: 'Report sent to patient, booking closed',               rank: 8 },
                    ];
                    return (
                      <div className="relative pl-6 border-l border-dashed border-border space-y-6">
                        {HOME_STEPS.map((step, idx) => {
                          const isDone = idx === 0 ? true : homeRank >= step.rank;
                          const isCurrent = !isDone && homeRank === step.rank - 1;
                          return (
                            <div key={idx} className="relative">
                              <span className={cn(
                                "absolute -left-[31px] top-0.5 h-4 w-4 rounded-full border-2 border-background flex items-center justify-center shadow-sm transition-colors",
                                isDone ? "bg-primary border-primary" : "bg-card border-muted-foreground/40",
                                isCurrent && "ring-4 ring-primary/20"
                              )}>
                                {isDone && <CheckCircle2 className="h-3 w-3 text-white" />}
                              </span>
                              <div className="text-sm font-bold flex items-center gap-2">
                                <span className={isDone || isCurrent ? "text-foreground" : "text-muted-foreground"}>{step.label}</span>
                                {isCurrent && <span className="bg-primary/10 text-primary text-[10px] uppercase px-1.5 py-0.5 rounded font-black">Live</span>}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">{step.desc}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
           {(selectedBooking as any).collectionMode === 'HOME' && (
                  <div className="border-t border-border pt-4">
                    <h3 className="text-sm font-bold mb-3 text-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" /> Sample Delivery
                    </h3>
                    {(selectedBooking as any).sampleDelivery ? (() => {
                      const sd = (selectedBooking as any).sampleDelivery;
                      return (
                        <div className="bg-card border border-border rounded-xl p-4 space-y-3 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground font-medium">Status</span>
                            <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${
                              sd.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : sd.status === 'IN_TRANSIT'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {sd.status === 'DELIVERED' ? 'Delivered' : sd.status === 'IN_TRANSIT' ? 'In Transit' : 'Branch Selected'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground font-medium">Branch</span>
                            <div className="text-right">
                              <div className="font-bold text-foreground">{sd.branch?.name}</div>
                              <div className="text-xs text-muted-foreground">{sd.branch?.city}</div>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground font-medium">Branch Address</span>
                            <span className="text-foreground font-medium text-right max-w-[55%]">
                              {sd.branch?.line1}, {sd.branch?.pincode}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground font-medium">Delivered By</span>
                            <span className="font-bold text-foreground">
                              {sd.partner?.user?.name || 'Partner'}
                            </span>
                          </div>
                          {sd.selectedAt && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground font-medium">Branch Selected</span>
                              <span className="text-foreground font-medium">
                                {new Date(sd.selectedAt).toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}
                          {sd.deliveredAt && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground font-medium">Delivered At</span>
                              <span className="font-bold text-emerald-700">
                                {new Date(sd.deliveredAt).toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })() : (
                      <div className="bg-muted/30 border border-border rounded-xl p-4 text-center text-sm text-muted-foreground">
                        No delivery branch selected yet
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

         
            {/* Unified Assignment Modal */}
            <AnimatePresence>
              {isAssigning && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black z-55 cursor-pointer backdrop-blur-xs"
                    onClick={() => setIsAssigning(false)}
                  />
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed inset-x-0 bottom-0 max-w-lg mx-auto bg-background rounded-t-2xl border-t border-border p-6 z-[60] shadow-3xl"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div>
                        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                          <UserPlus className="h-4 w-4 text-primary" /> Assign Booking
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {selectedBooking?.bookingCode} • {selectedBooking?.patient?.name}
                        </p>
                      </div>
                      <button onClick={() => setIsAssigning(false)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Segmented Tab Switcher */}
                    <div className="flex bg-muted/60 p-1 rounded-xl my-4 border border-border">
                      <button
                        onClick={() => setAssignmentTab('PHLEBOTOMIST')}
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                          assignmentTab === 'PHLEBOTOMIST'
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Freelance Phlebotomist (30%)
                      </button>
                      <button
                        onClick={() => setAssignmentTab('STAFF')}
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                          assignmentTab === 'STAFF'
                            ? "bg-slate-800 text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Building2 className="h-3.5 w-3.5" />
                        In-House Staff
                      </button>
                    </div>

                    {/* Phlebotomist List */}
                    {assignmentTab === 'PHLEBOTOMIST' && (
                      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                        <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 mb-2">
                          💡 Freelance Phlebotomist gets <span className="font-bold">30% commission</span> (₹{Math.round(((selectedBooking as any)?.totalPaid || selectedBooking?.totalAmount || 0) * 0.30)}) upon successful sample collection and lab delivery.
                        </div>

                        {(() => {
                          const phlebos = availablePartners.filter((p: any) => {
                            if (!selectedBooking?.branchId) return true;
                            return !p.branchId || p.branchId === selectedBooking.branchId;
                          });

                          if (phlebos.length === 0) {
                            return (
                              <div className="text-center py-8 text-muted-foreground text-xs">
                                No active freelance phlebotomists found for this branch.
                              </div>
                            );
                          }

                          return phlebos.map((partner: any) => {
                            const partnerName = partner.user?.name || partner.labName || 'Phlebotomist';
                            const estCommission = Math.round(((selectedBooking as any)?.totalPaid || selectedBooking?.totalAmount || 0) * 0.30);

                            return (
                              <button
                                key={partner.id}
                                onClick={() => handleAssignPartner(partner.id, partnerName)}
                                className="w-full flex items-center justify-between p-3 border border-border hover:border-emerald-500 bg-card rounded-xl text-left group transition-all hover:bg-emerald-50/20"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold uppercase shrink-0">
                                    {partnerName.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-bold text-foreground text-xs sm:text-sm flex items-center gap-2">
                                      {partnerName}
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                        30% Comm
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                      <span>{partner.partnerCode || 'PHLEBO'}</span>
                                      <span>•</span>
                                      <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                        {partner.rating?.toFixed(1) || '5.0'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs font-bold text-emerald-700">₹{estCommission}</div>
                                  <div className="text-[10px] text-muted-foreground">Payout</div>
                                </div>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    )}

                    {/* In-House Staff List */}
                    {assignmentTab === 'STAFF' && (
                      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                        <div className="text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg p-2.5 mb-2">
                          🏢 In-House Staff member assignment (Salary-based internal team).
                        </div>

                        {(() => {
                          const staffList = allExecutives;
                          if (staffList.length === 0) {
                            return (
                              <div className="text-center py-8 text-muted-foreground text-xs">
                                No active in-house staff found for this branch.
                              </div>
                            );
                          }

                          return staffList.map((user: any) => (
                            <button
                              key={user.id}
                              onClick={() => handleAssign(user.id)}
                              className="w-full flex items-center justify-between p-3 border border-border hover:border-slate-800 bg-card rounded-xl text-left group transition-all hover:bg-slate-50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-sm font-bold uppercase shrink-0">
                                  {user.name?.charAt(0) || 'S'}
                                </div>
                                <div>
                                  <div className="font-bold text-foreground text-xs sm:text-sm">{user.name}</div>
                                  <div className="text-[11px] text-muted-foreground">{user.phone || user.mobile || 'In-House Staff'}</div>
                                </div>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </>
        )}
      </AnimatePresence>

      {/* Custom Invoice Preview Modal */}
      {invoiceModalBooking && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex flex-col items-center p-2 sm:p-6 overflow-y-auto printable-modal-overlay">
          <div className="no-print w-full max-w-5xl flex flex-col sm:flex-row sm:items-center justify-between mb-3 text-white gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
              <span className="font-bold text-xs sm:text-sm truncate">
                Invoice & Bill: {invoiceModalBooking.bookingCode} ({invoiceModalBooking.patient?.name})
              </span>
              {customInvoiceTemplates.length > 0 && (
                <select
                  value={selectedInvoiceTemplateId}
                  onChange={(e) => setSelectedInvoiceTemplateId(e.target.value)}
                  className="px-2 py-1 text-[11px] sm:text-xs font-bold bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none"
                >
                  {customInvoiceTemplates.map(t => (
                    <option key={t.id} value={t.id} className="text-slate-900 bg-white">
                      {t.name} ({t.type}){t.isDefault ? ' ★ Default' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                disabled={isSendingInvoice}
                onClick={() => handleSendInvoice(invoiceModalBooking.id)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isSendingInvoice ? 'Sending...' : 'Send Invoice'}
              </button>
              <button
                disabled={isExportingInvoicePDF}
                onClick={handleDownloadInvoicePDF}
                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                {isExportingInvoicePDF ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {isExportingInvoicePDF ? 'Exporting...' : 'Download PDF'}
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print Bill
              </button>
              <button
                onClick={() => setInvoiceModalBooking(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div id="booking-invoice-capture" className="overflow-x-auto overflow-y-auto max-h-[85vh] pb-12 w-full flex justify-center custom-scrollbar printable-modal-scroll">
            <LiveInvoicePreview
              template={customInvoiceTemplates.find(t => t.id === selectedInvoiceTemplateId) || {}}
              scale={typeof window !== 'undefined' && window.innerWidth < 640 ? 0.45 : 0.88}
              invoiceData={{
                invoiceNumber: `INV-${invoiceModalBooking.bookingCode}`,
                receiptNumber: `REC-${invoiceModalBooking.bookingCode}`,
                date: new Date().toLocaleDateString('en-IN'),
                status: (invoiceModalBooking as any).paymentStatus === 'SUCCESS' ? 'PAID' : 'PENDING',
                paymentMethod: (invoiceModalBooking as any).paymentMethod || 'Pay on Collection',
                transactionId: invoiceModalBooking.id,
                bookingCode: invoiceModalBooking.bookingCode,
                patientName: invoiceModalBooking.patient?.name || (invoiceModalBooking as any).patientName || 'Patient',
                patientId: (invoiceModalBooking as any).uhid || (invoiceModalBooking as any).user?.uhid || (invoiceModalBooking as any).patient?.uhid || 'UHID-N/A',
                patientAge: invoiceModalBooking.patient?.age || (invoiceModalBooking as any).patientAge || '',
                patientGender: invoiceModalBooking.patient?.gender || (invoiceModalBooking as any).patientGender || '',
                patientMobile: invoiceModalBooking.patient?.phone || (invoiceModalBooking as any).patientMobile || '',
                patientAddress: invoiceModalBooking.patient?.address || (invoiceModalBooking as any).address || '',
                totalAmount: (invoiceModalBooking as any).totalPaid !== undefined && (invoiceModalBooking as any).totalPaid !== null ? Number((invoiceModalBooking as any).totalPaid) : undefined,
                items: [
                  ...(invoiceModalBooking.packages || []).map((pkg: any, idx: number) => ({
                    id: `pkg-${idx + 1}`,
                    name: `[Package] ${pkg.name}`,
                    code: pkg.id?.slice(0, 6) || '',
                    rate: pkg.price || pkg.discountedPrice || 0,
                    quantity: 1,
                    discount: (pkg.price && pkg.discountedPrice) ? (pkg.price - pkg.discountedPrice) : 0,
                    taxRate: 5,
                    total: pkg.discountedPrice || pkg.price || 0,
                  })),
                  ...(invoiceModalBooking.tests || []).map((test: any, idx: number) => ({
                    id: `test-${idx + 1}`,
                    name: `${test.name} (${test.category || 'Diagnostic'})`,
                    code: test.id?.slice(0, 6) || '',
                    rate: test.price || test.discountedPrice || 0,
                    quantity: 1,
                    discount: (test.price && test.discountedPrice) ? (test.price - test.discountedPrice) : 0,
                    taxRate: 5,
                    total: test.discountedPrice || test.price || 0,
                  })),
                ],
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
