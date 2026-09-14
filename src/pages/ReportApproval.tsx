import React, { useState, useRef, useCallback } from 'react';
import { useReportsQuery, useBookingsForReportQuery } from '@/hooks/useAdminQueries';
import ReactDOM from 'react-dom';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import {
  fetchAllReports,
  fetchBookingsForReport,
  finalizeReportThunk,
  sendReportThunk,
  savePdfUrlThunk,
  uploadReportPdfThunk,
} from '../redux/slices/reportSlice';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Printer,
  CheckSquare,
  ChevronRight,
  Clock,
  FileText,
  X,
  Send,
  Users,
  FlaskConical,
  Search,
  AlertTriangle,
  Mail,
  MessageSquare,
  Phone,
  Share2,
  Check,
  ExternalLink,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { ReportPDFDocument, DoctorDetails } from '../components/ReportPDFDocument';
import { useToast } from '../components/Toast';
import { customFormatService } from '../services/customFormat.service';
import { CustomReportTemplate } from '../types/customFormat';
import { sanitizeClonedDocForPdf } from '@/utils/exportInvoicePdf';

export const ReportApprovalPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(state => state.auth.user);
  const userBranchId = (currentUser as any)?.branchId || (currentUser as any)?.adminUser?.branchId;

  const isSuperAdmin =
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.adminRoleSlug === 'super_admin' ||
    (currentUser as any)?.isSuperAdmin;

  const isBranchAdmin =
    !isSuperAdmin &&
    (currentUser?.role === 'ADMIN' ||
      currentUser?.role === 'franchise_admin' ||
      currentUser?.adminRoleSlug === 'branch_admin' ||
      currentUser?.adminRoleSlug === 'admin' ||
      currentUser?.adminRole === 'Branch Admin' ||
      !!userBranchId);

  const canApproveReport = useCallback((report: any) => {
    if (!report) return false;
    if (isSuperAdmin) return true;
    if (isBranchAdmin) {
      if (!userBranchId || userBranchId === 'all') return true;
      const rBranch = report?.reportBranchId || report?.booking?.branchId;
      return !rBranch || rBranch === userBranchId;
    }
    return false;
  }, [isSuperAdmin, isBranchAdmin, userBranchId]);

  const { reports, bookingsForReport, loading } = useAppSelector(state => state.reports);

  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [approvalTemplate, setApprovalTemplate] = useState<'STANDARD' | 'DETAILED'>('STANDARD');
  const [customReportTemplates, setCustomReportTemplates] = useState<CustomReportTemplate[]>([]);
  const [selectedCustomTemplateId, setSelectedCustomTemplateId] = useState<string>('');
  const [previewScale, setPreviewScale] = useState<number>(0.78);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [portalReport, setPortalReport] = useState<any>(null);
  const [portalBranch, setPortalBranch] = useState<any>(null);
  const [portalDoctor, setPortalDoctor] = useState<DoctorDetails | undefined>(undefined);

  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [sendRecipientType, setSendRecipientType] = useState<'USER' | 'PARTNER'>('USER');
  const [sendSearch, setSendSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [channels, setChannels] = useState<{ email: boolean; sms: boolean; whatsapp: boolean }>({
    email: true,
    sms: true,
    whatsapp: true,
  });
  const toast = useToast();

  useReportsQuery();
  useBookingsForReportQuery();

  React.useEffect(() => {
    customFormatService.getReportTemplates()
      .then(templates => {
        if (Array.isArray(templates)) {
          setCustomReportTemplates(templates);
          const defaultTpl = templates.find(t => t.isDefault && t.type === 'STANDARD') || templates[0];
          if (defaultTpl && !selectedCustomTemplateId) {
            setSelectedCustomTemplateId(defaultTpl.id);
            setApprovalTemplate(defaultTpl.type);
          }
        }
      })
      .catch(err => console.error('Failed to load custom report templates:', err));
  }, []);

  React.useEffect(() => {
    if (selectedReport && customReportTemplates.length > 0) {
      const isDetailed = selectedReport.templateType === 'DETAILED' || selectedReport.internalNotes?.includes('[TEMPLATE:DETAILED]');
      const targetType = isDetailed ? 'DETAILED' : 'STANDARD';
      const matchingTpl = customReportTemplates.find(t => t.id === selectedCustomTemplateId) ||
                          customReportTemplates.find(t => t.isDefault && t.type === targetType) ||
                          customReportTemplates.find(t => t.type === targetType) ||
                          customReportTemplates[0];
      if (matchingTpl && !selectedCustomTemplateId) {
        setSelectedCustomTemplateId(matchingTpl.id);
        setApprovalTemplate(matchingTpl.type);
      }
    }
  }, [selectedReport?.id, customReportTemplates]);

  const buildBranchAndDoctor = useCallback(() => {
    const rb = selectedReport?.reportBranch || null;
    const branch = rb ? {
      ...rb,
      name: rb.name || '',
      line1: rb.line1 || rb.address || '',
      city: rb.city || '',
      state: rb.state || '',
      pincode: rb.pincode || '',
      contactNumber: rb.contactNumber || rb.phone || '',
      email: rb.email || '',
      labRegNo: rb.labRegNo || '',
    } : null;
    const doctor: DoctorDetails | undefined = selectedReport?.doctorName
      ? {
          name: selectedReport.doctorName,
          qualification: selectedReport.doctorQualification || '',
          regNo: selectedReport.doctorRegNo || '',
          designation: selectedReport.doctorDesignation || '',
          verifiedAt: selectedReport.doctorVerifiedAt || new Date().toISOString(),
          signatureUrl: selectedReport.doctorSignatureUrl || selectedReport.signatureUrl || '',
        }
      : undefined;
    return { branch, doctor };
  }, [selectedReport]);

  const generateAndDownloadPDF = useCallback(async (reportData: any, templateType: 'STANDARD' | 'DETAILED') => {
    try {
      const [html2canvas, jsPDFModule] = await Promise.all([
        import('html2canvas').then(m => m.default),
        import('jspdf').then(m => m.default),
      ]);

      // Always prioritize the unscaled dedicated capture container to avoid transform: scale() distortion
      const el = document.getElementById('pdf-export-report-document') || document.getElementById('clinical-report-document');
      if (!el) throw new Error('Report element not found for PDF capture.');

      const pageElements = Array.from(el.querySelectorAll('.a4-page-sheet'));
      const targets = pageElements.length > 0 ? pageElements : [el];

      const pdf = new jsPDFModule({ orientation: 'portrait', unit: 'px', format: [794, 1123] });

      for (let i = 0; i < targets.length; i++) {
        const pageEl = targets[i] as HTMLElement;
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 794,
          windowHeight: 1123,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc) => {
            sanitizeClonedDocForPdf(clonedDoc);

            // Inject explicit typography, sizing, and CSS variable overrides to guarantee razor-sharp uncompressed rendering
            const overrideStyle = clonedDoc.createElement('style');
            overrideStyle.innerHTML = `
              *, *::before, *::after {
                --primary: #006d6f !important;
                --secondary: #0a7c7c !important;
                --background: #ffffff !important;
                --foreground: #0f172a !important;
                --muted: #f1f5f9 !important;
                --muted-foreground: #64748b !important;
                --border: #e2e8f0 !important;
                --card: #ffffff !important;
                --card-foreground: #0f172a !important;
                letter-spacing: normal !important;
                word-spacing: normal !important;
                font-kerning: normal !important;
                transform: none !important;
                zoom: 1 !important;
                -webkit-font-smoothing: antialiased !important;
                text-rendering: geometricPrecision !important;
              }
              .a4-page-sheet {
                width: 794px !important;
                min-height: 1123px !important;
                transform: none !important;
                margin: 0 !important;
                box-sizing: border-box !important;
              }
            `;
            clonedDoc.head.appendChild(overrideStyle);
          },
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage([794, 1123], 'portrait');
        pdf.addImage(imgData, 'JPEG', 0, 0, 794, 1123);
      }

      const patientName = reportData.booking?.patientName?.replace(/\s+/g, '_') || reportData.patientName?.replace(/\s+/g, '_') || 'Patient';
      const bookingCode = reportData.booking?.bookingCode || reportData.bookingCode || reportData.id?.slice(0, 8) || 'REPORT';
      const fileName = `MedsSeva_Report_${patientName}_${bookingCode}.pdf`;

      // 1. Direct client download
      pdf.save(fileName);

      // 2. Background async upload
      try {
        const pdfBlob = pdf.output('blob');
        const formData = new FormData();
        formData.append('pdf', pdfBlob, fileName);

        const uploadResult = await dispatch(uploadReportPdfThunk({ id: reportData.id, formData })).unwrap();
        if (uploadResult?.pdfUrl) {
          const updated = await dispatch(savePdfUrlThunk({
            id: reportData.id,
            pdfUrl: uploadResult.pdfUrl,
            pdfPublicId: uploadResult.pdfPublicId,
          })).unwrap();
          setSelectedReport(updated);
        }
      } catch (uploadErr) {
        console.warn('Background PDF upload skipped:', uploadErr);
      }

      return true;
    } catch (err: any) {
      console.error('PDF generation error:', err);
      throw err;
    } finally {
      setPortalReport(null);
      setPortalBranch(null);
      setPortalDoctor(undefined);
    }
  }, [dispatch]);

  const handlePrintPDF = useCallback(async () => {
    if (!selectedReport) return;
    setGeneratingPDF(true);
    try {
      await generateAndDownloadPDF(selectedReport, approvalTemplate);
      toast.success('PDF downloaded', `Report downloaded in ${approvalTemplate === 'DETAILED' ? 'Detailed (Dr. Lal)' : 'Standard'} format.`);
      await dispatch(fetchAllReports());
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('PDF failed', 'Could not generate the PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  }, [selectedReport, approvalTemplate, generateAndDownloadPDF, dispatch]);
  const draftReports = reports.filter((r: any) => r.status === 'DRAFT' || r.status === 'UNDER_REVIEW');
  const approvedReports = reports.filter((r: any) => r.status === 'APPROVED' || r.status === 'RELEASED');

const handleFinalize = async () => {
    if (!selectedReport) return;
    if (!canApproveReport(selectedReport)) {
      toast.error('Permission Denied', 'Only Super Admin or Branch Admin can approve reports.');
      setShowFinalizeConfirm(false);
      return;
    }
    setFinalizing(true);
    try {
      const finalized = await dispatch(finalizeReportThunk(selectedReport.id)).unwrap();
      setSelectedReport(finalized);
      setShowFinalizeConfirm(false);
      await dispatch(fetchAllReports());
      toast.success('Report finalized', 'Generating and uploading the official PDF...');

      setUploadingPDF(true);
      try {
        await generateAndDownloadPDF(finalized, approvalTemplate);
        toast.success('PDF ready', 'The official report PDF has been generated and is ready to send.');
      } catch {
        toast.error('PDF upload failed', 'Report is finalized. Try clicking Generate & Download to download.');
      } finally {
        setUploadingPDF(false);
      }
    } catch (e: any) {
      toast.error('Finalize failed', typeof e === 'string' ? e : 'Failed to finalize the report.');
    } finally {
      setFinalizing(false);
    }
  };
  const handleSend = async (recipientId: string) => {
    if (!selectedReport) return;
    setSending(true);
    try {
      let reportToSend = selectedReport;

      if (!reportToSend.pdfUrl) {
        try {
          await generateAndDownloadPDF(reportToSend, approvalTemplate);
        } catch (pdfErr) {
          console.warn('PDF generation deferred:', pdfErr);
        }
      }

      const activeChannels: string[] = [];
      if (channels.email) activeChannels.push('EMAIL');
      if (channels.sms) activeChannels.push('SMS');
      if (channels.whatsapp) activeChannels.push('WHATSAPP');

      const sendResult = await dispatch(sendReportThunk({
        id: reportToSend.id,
        recipientType: sendRecipientType,
        recipientId,
        channels: activeChannels,
      })).unwrap();

      const deliveredReport = sendResult.report || sendResult;
      setSelectedReport(deliveredReport);
      setShowSendModal(false);
      await dispatch(fetchAllReports());

      const channelSummary = activeChannels.join(', ');
      toast.success('Report Sent Successfully', `Delivered via ${channelSummary || 'portal notification'}.`);
    } catch (e: any) {
      toast.error('Send failed', typeof e === 'string' ? e : 'Failed to send the report.');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      DRAFT: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border-slate-200' },
      UNDER_REVIEW: { label: 'Under Review', className: 'bg-amber-50 text-amber-700 border-amber-100' },
      APPROVED: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
      RELEASED: { label: 'Released', className: 'bg-blue-50 text-blue-700 border-blue-100' },
    };
    const s = map[status] || { label: status, className: 'bg-muted text-muted-foreground' };
    return <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border uppercase", s.className)}>{s.label}</span>;
  };

  const selectedBooking = selectedReport
    ? (selectedReport.booking || bookingsForReport.find((b: any) => b.id === selectedReport.bookingId))
    : null;

  const users = selectedBooking
    ? [{ id: selectedBooking.userId, name: selectedBooking.patientName || selectedBooking.user?.name, mobile: selectedBooking.patientMobile || selectedBooking.user?.mobile }]
    : [];

  const partners = selectedBooking?.assignedPartnerId
    ? [{
        id: selectedBooking.assignedPartnerId,
        name: selectedBooking.assignedPartner?.user?.name,
        labName: selectedBooking.assignedPartner?.labName,
        mobile: selectedBooking.assignedPartner?.user?.mobile,
      }]
    : [];

  const sendList = (sendRecipientType === 'USER' ? users : partners).filter((item: any) => {
    const q = sendSearch.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.mobile?.includes(q) ||
      item.labName?.toLowerCase().includes(q)
    );
  });

  const uniqueSendList = Array.from(new Map(sendList.map((i: any) => [i.id, i])).values());

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Report Approval</h1>
          <p className="text-sm text-muted-foreground">Review draft reports, finalize them, and send to patients or partners.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="font-bold text-xs tracking-wider uppercase text-amber-600 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Pending ({draftReports.length})
            </h3>
           <div className="space-y-2">
              {loading ? (
                <>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-full p-4 border border-border rounded-xl bg-card animate-pulse flex justify-between items-center">
                      <div className="space-y-2 flex-1">
                        <div className="h-3.5 bg-muted rounded w-32" />
                        <div className="h-2.5 bg-muted rounded w-20" />
                        <div className="h-4 bg-muted rounded w-16 mt-2" />
                      </div>
                      <div className="h-4 w-4 bg-muted rounded" />
                    </div>
                  ))}
                </>
              ) : draftReports.map((report: any) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={cn(
                    "w-full text-left p-4 border rounded-xl shadow-sm bg-card transition-all hover:border-primary flex justify-between items-center",
                    selectedReport?.id === report.id ? "ring-2 ring-primary border-primary" : "border-border"
                  )}
                >
                  <div>
                    <div className="font-bold text-sm text-foreground">{report.booking?.patientName}</div>
                    <div className="text-xs font-mono text-muted-foreground mt-0.5">{report.booking?.bookingCode}</div>
                    <div className="mt-2">{getStatusBadge(report.status)}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
              {!loading && draftReports.length === 0 && (
                <div className="bg-muted/40 border border-dashed border-border rounded-xl p-6 text-center text-xs text-muted-foreground">
                  No pending reports.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="font-bold text-xs tracking-wider uppercase text-emerald-600 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Finalized ({approvedReports.length})
            </h3>
            <div className="space-y-2">
              {approvedReports.map((report: any) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={cn(
                    "w-full text-left p-3 border rounded-xl bg-muted/30 border-border transition-all hover:bg-card hover:border-primary/50 flex justify-between items-center",
                    selectedReport?.id === report.id ? "ring-2 ring-primary border-primary" : ""
                  )}
                >
                  <div>
                    <div className="font-bold text-xs text-foreground">{report.booking?.patientName}</div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{report.booking?.bookingCode}</div>
                  </div>
                  {getStatusBadge(report.status)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedReport ? (
              <motion.div
                key={selectedReport.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
              >
                <div className="p-4 bg-muted/50 border-b border-border flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-bold text-sm text-foreground">Report Preview</span>
                    {getStatusBadge(selectedReport.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => setPreviewScale(0.78)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold transition-all",
                          previewScale === 0.78
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Fit inside container"
                      >
                        Fit (78%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewScale(1)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold transition-all",
                          previewScale === 1
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        title="100% Full View"
                      >
                        100%
                      </button>
                    </div>

                    {/* Template Switcher */}
                    <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg border border-border">
                      {customReportTemplates.length > 0 ? (
                        <select
                          value={selectedCustomTemplateId}
                          onChange={(e) => {
                            const newId = e.target.value;
                            setSelectedCustomTemplateId(newId);
                            const tpl = customReportTemplates.find(t => t.id === newId);
                            if (tpl) setApprovalTemplate(tpl.type);
                          }}
                          className="px-2 py-1 text-[11px] font-bold bg-background border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary max-w-[200px]"
                        >
                          {customReportTemplates.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.type}){t.isDefault ? ' ★' : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <>
                          <button
                            onClick={() => setApprovalTemplate('STANDARD')}
                            className={cn(
                              "px-2.5 py-1 rounded text-[11px] font-bold transition-all",
                              approvalTemplate === 'STANDARD'
                                ? "bg-background text-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            title="Medsseva Standard Layout"
                          >
                            Standard
                          </button>
                          <button
                            onClick={() => setApprovalTemplate('DETAILED')}
                            className={cn(
                              "px-2.5 py-1 rounded text-[11px] font-bold transition-all",
                              approvalTemplate === 'DETAILED'
                                ? "bg-primary text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            title="Detailed Diagnostic Layout"
                          >
                            Detailed
                          </button>
                        </>
                      )}
                    </div>

                    <button
                      onClick={handlePrintPDF}
                      disabled={generatingPDF || uploadingPDF}
                      className="px-2.5 py-1.5 border border-border hover:bg-background rounded text-[11px] font-bold flex items-center gap-1 bg-card shadow-sm disabled:opacity-60"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      {generatingPDF ? 'Generating...' : uploadingPDF ? 'Uploading PDF...' : selectedReport?.pdfUrl ? 'Download PDF' : 'Generate & Download'}
                    </button>
                    {(selectedReport.status === 'DRAFT' || selectedReport.status === 'UNDER_REVIEW') && (
                      canApproveReport(selectedReport) ? (
                        <button
                          onClick={() => setShowFinalizeConfirm(true)}
                          className="px-3 py-1.5 bg-primary text-white hover:bg-primary/90 rounded text-[11px] font-bold flex items-center gap-1 shadow-sm"
                        >
                          <CheckSquare className="h-3.5 w-3.5" /> Finalize & Approve Report
                        </button>
                      ) : (
                        <div
                          className="px-2.5 py-1.5 bg-muted text-muted-foreground border border-border rounded text-[11px] font-semibold flex items-center gap-1"
                          title="Approval restricted: Only Super Admin or Branch Admin can approve this report"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" /> Approval Restricted (Admin Only)
                        </div>
                      )
                    )}
                    {selectedReport.status === 'APPROVED' && (
                      <button
                        onClick={() => setShowSendModal(true)}
                        disabled={sending}
                        className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded text-[11px] font-bold flex items-center gap-1 shadow-sm disabled:opacity-60"
                      >
                        <Send className="h-3.5 w-3.5" /> {sending ? 'Publishing Report...' : 'Send Report'}
                      </button>
                    )}
                    {selectedReport.status === 'RELEASED' && (
                      <button
                        onClick={() => setShowResendConfirm(true)}
                        className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 px-2 py-1 rounded transition-colors"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />Sent to Recipient
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-100 dark:bg-slate-900 flex justify-center max-h-[750px] overflow-x-auto overflow-y-auto">
                  <div
                    style={{
                      width: previewScale === 0.78 ? '580px' : '794px',
                      transition: 'width 0.2s ease',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      className="shadow-2xl rounded-xl overflow-hidden bg-white border border-slate-200"
                      style={{
                        transform: previewScale === 0.78 ? 'scale(0.73)' : 'scale(1)',
                        transformOrigin: 'top left',
                        width: '794px',
                      }}
                    >
                      <ReportPDFDocument
                        report={{
                          ...selectedReport,
                          booking: {
                            ...(bookingsForReport?.find((b: any) => b.id === selectedReport.bookingId || b.id === selectedReport.booking?.id) || {}),
                            ...(selectedReport.booking || {}),
                            address: selectedReport.booking?.address || selectedReport.booking?.user?.addresses?.[0] || null,
                            patientMobile: selectedReport.booking?.patientMobile || selectedReport.booking?.user?.mobile || '',
                          },
                        }}
                        branch={buildBranchAndDoctor().branch}
                        doctor={buildBranchAndDoctor().doctor}
                        templateType={approvalTemplate}
                        customTemplate={customReportTemplates.find(t => t.id === selectedCustomTemplateId)}
                        containerId="clinical-report-document"
                      />
                    </div>
                  </div>

                  {/* Dedicated 100% Unscaled A4 PDF Capture Container (No CSS transform, No scaling artifacts) */}
                  <div
                    style={{
                      position: 'fixed',
                      left: '-99999px',
                      top: 0,
                      width: '794px',
                      pointerEvents: 'none',
                      zIndex: -9999,
                      opacity: 0,
                    }}
                  >
                    <ReportPDFDocument
                      report={{
                        ...selectedReport,
                        booking: {
                          ...(bookingsForReport?.find((b: any) => b.id === selectedReport.bookingId || b.id === selectedReport.booking?.id) || {}),
                          ...(selectedReport.booking || {}),
                          address: selectedReport.booking?.address || selectedReport.booking?.user?.addresses?.[0] || null,
                          patientMobile: selectedReport.booking?.patientMobile || selectedReport.booking?.user?.mobile || '',
                        },
                      }}
                      branch={buildBranchAndDoctor().branch}
                      doctor={buildBranchAndDoctor().doctor}
                      templateType={approvalTemplate}
                      customTemplate={customReportTemplates.find(t => t.id === selectedCustomTemplateId)}
                      containerId="pdf-export-report-document"
                      scale={1}
                    />
                  </div>
                </div>
              </motion.div>
        ) : loading ? (
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-pulse">
                <div className="p-4 bg-muted/50 border-b border-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded w-28" />
                    <div className="h-4 bg-muted rounded-full w-16" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-7 bg-muted rounded w-28" />
                    <div className="h-7 bg-muted rounded w-28" />
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4 border border-slate-200 p-4 bg-slate-50 rounded-lg">
                    {[1, 2].map(col => (
                      <div key={col} className="space-y-3">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="flex justify-between gap-4">
                            <div className="h-3 bg-muted rounded w-16" />
                            <div className="h-3 bg-muted rounded w-24" />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div className="h-8 bg-muted rounded w-full" />
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          {[1, 2, 3, 4].map(i => (
                            <th key={i} className="py-2">
                              <div className="h-2.5 bg-muted rounded w-16 mx-auto" />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[1, 2, 3, 4, 5].map(i => (
                          <tr key={i}>
                            <td className="py-2.5"><div className="h-3 bg-muted rounded w-32" /></td>
                            <td className="py-2.5 text-center"><div className="h-3 bg-muted rounded w-12 mx-auto" /></td>
                            <td className="py-2.5 text-center"><div className="h-3 bg-muted rounded w-16 mx-auto" /></td>
                            <td className="py-2.5 text-center"><div className="h-3 bg-muted rounded w-10 mx-auto" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-dashed border-border rounded-2xl h-[450px] flex flex-col items-center justify-center text-center p-8 shadow-inner">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">Select a report to review</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Choose a report from the left panel to review parameters, finalize, and send to the patient or partner.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showFinalizeConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-50" onClick={() => setShowFinalizeConfirm(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background border border-border rounded-2xl z-[60] shadow-2xl p-6"
            >
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" /> Finalize Report
                </h3>
                <button onClick={() => setShowFinalizeConfirm(false)} className="p-1 hover:bg-muted rounded-lg"><X className="h-4 w-4" /></button>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                This will lock the report and mark it as <span className="font-bold text-foreground">Approved</span>. No further edits will be allowed. You can then send it to the patient or partner.
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowFinalizeConfirm(false)} className="px-4 py-2 rounded text-xs font-bold border border-border">Cancel</button>
                <button
                  onClick={handleFinalize}
                  disabled={finalizing}
                  className="px-6 py-2 rounded text-xs font-black bg-primary text-white hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-60"
                >
                  <CheckSquare className="h-4 w-4" /> {finalizing ? 'Finalizing...' : 'Confirm & Finalize'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSendModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-50" onClick={() => setShowSendModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-background border border-border rounded-2xl z-[60] shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <Send className="h-4 w-4 text-primary" /> Send Report via Multi-Channel
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Deliver verified lab report with letterhead and doctor signature</p>
                </div>
                <button onClick={() => setShowSendModal(false)} className="p-1 hover:bg-muted rounded-lg"><X className="h-4 w-4" /></button>
              </div>

              {/* Delivery Channels Toggle */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Select Delivery Channels:</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setChannels(c => ({ ...c, email: !c.email }))}
                    className={cn(
                      "p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold",
                      channels.email ? "bg-teal-50 border-teal-500 text-teal-800" : "bg-card border-border text-muted-foreground hover:border-slate-300"
                    )}
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email (PDF)</span>
                    <span className="text-[9px] font-normal opacity-75">{channels.email ? '✓ Enabled' : 'Disabled'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannels(c => ({ ...c, sms: !c.sms }))}
                    className={cn(
                      "p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold",
                      channels.sms ? "bg-teal-50 border-teal-500 text-teal-800" : "bg-card border-border text-muted-foreground hover:border-slate-300"
                    )}
                  >
                    <Phone className="w-4 h-4" />
                    <span>SMS Link</span>
                    <span className="text-[9px] font-normal opacity-75">{channels.sms ? '✓ Enabled' : 'Disabled'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannels(c => ({ ...c, whatsapp: !c.whatsapp }))}
                    className={cn(
                      "p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold",
                      channels.whatsapp ? "bg-emerald-50 border-emerald-500 text-emerald-800" : "bg-card border-border text-muted-foreground hover:border-slate-300"
                    )}
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span>WhatsApp</span>
                    <span className="text-[9px] font-normal opacity-75">{channels.whatsapp ? '✓ Enabled' : 'Disabled'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm text-foreground">Recipient Details</span>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search recipient..."
                  value={sendSearch}
                  onChange={e => setSendSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-input rounded-lg outline-none focus:border-primary bg-card"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2">
                {uniqueSendList.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">No recipients found</div>
                ) : uniqueSendList.map((item: any) => {
                  const patientMobile = item.mobile || selectedBooking?.patientMobile || selectedBooking?.user?.mobile || '';
                  const cleanMobile = patientMobile.replace(/[^0-9]/g, '');
                  const waNumber = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
                  const waMessage = `Hello *${item.name}*,\n\nYour official diagnostic lab report from *MedsSeva Diagnostics* (${selectedReport?.booking?.bookingCode || selectedReport?.id?.slice(0, 8)}) is ready.\n\n🔗 *Verify & View Report:* ${window.location.origin}/verify-report/${selectedReport?.id}\n\n_Thank you for choosing MedsSeva._`;
                  const waUrl = `https://api.whatsapp.com/send?phone=${waNumber}&text=${encodeURIComponent(waMessage)}`;

                  return (
                    <div
                      key={item.id}
                      className="p-3 border border-border rounded-xl bg-card hover:border-primary/50 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="font-bold text-sm text-foreground">{item.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>📱 {item.mobile || 'No Mobile'}</span>
                          {item.email && <span>• 📧 {item.email}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {patientMobile && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1 transition-colors"
                            title="Direct Share on WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                        )}

                        <button
                          onClick={() => handleSend(item.id)}
                          disabled={sending}
                          className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold flex items-center gap-1 shadow-sm disabled:opacity-60"
                        >
                          <Send className="w-3.5 h-3.5" /> {sending ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

     <AnimatePresence>
        {showResendConfirm && selectedReport && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-50" onClick={() => setShowResendConfirm(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background border border-border rounded-2xl z-[60] shadow-2xl p-6"
            >
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" /> Send Report Again?
                </h3>
                <button onClick={() => setShowResendConfirm(false)} className="p-1 hover:bg-muted rounded-lg"><X className="h-4 w-4" /></button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                This report has already been published for the patient. Do you want to publish it again?
              </p>
              <div className="bg-muted/40 border border-border rounded-lg p-4 space-y-2 text-xs mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patient Name</span>
                  <span className="font-bold text-foreground">{selectedReport.booking?.patientName || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mobile Number</span>
                  <span className="font-bold text-foreground">{selectedReport.booking?.patientMobile || selectedReport.booking?.user?.mobile || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking Code</span>
                  <span className="font-mono font-bold text-foreground">{selectedReport.booking?.bookingCode || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Report Date</span>
                  <span className="font-bold text-foreground">{new Date(selectedReport.reportedDate).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Published</span>
                  <span className="font-bold text-foreground">
                    {selectedReport.auditLogs?.slice().reverse().find((l: any) => l.action === 'REPORT_SENT')
                      ? new Date(selectedReport.auditLogs.slice().reverse().find((l: any) => l.action === 'REPORT_SENT').createdAt).toLocaleString('en-IN')
                      : '-'}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowResendConfirm(false)} className="px-4 py-2 rounded text-xs font-bold border border-border hover:bg-muted">Cancel</button>
                <button
                  onClick={async () => {
                    setShowResendConfirm(false);
                    const recipientId = selectedReport.recipientId || selectedReport.booking?.userId;
                    const recipientType = selectedReport.recipientType || 'USER';
                    if (!recipientId) { toast.error('Error', 'Recipient not found.'); return; }
                    setSending(true);
                    try {
                      const result = await dispatch(sendReportThunk({ id: selectedReport.id, recipientType, recipientId })).unwrap();
                      setSelectedReport(result);
                      await dispatch(fetchAllReports());
                      toast.success('Report published', 'The report has been published successfully.');
                    } catch (e: any) {
                      toast.error('Send failed', typeof e === 'string' ? e : 'Failed to publish the report.');
                    } finally {
                      setSending(false);
                    }
                  }}
                  disabled={sending}
                  className="px-6 py-2 rounded text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-60"
                >
                  <Send className="h-4 w-4" /> {sending ? 'Publishing...' : 'Send Again'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {portalReport && ReactDOM.createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '794px', zIndex: -1000, opacity: 0.001, pointerEvents: 'none', backgroundColor: '#ffffff' }}>
          <ReportPDFDocument
            report={portalReport}
            branch={portalBranch}
            doctor={portalDoctor}
            templateType={approvalTemplate}
            customTemplate={customReportTemplates.find(t => t.id === selectedCustomTemplateId)}
          />
        </div>,
        document.body
      )}
    </div>
  );
};