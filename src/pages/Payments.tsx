import React, { useState, useEffect } from 'react';
import { usePaymentSummaryQuery, usePaymentsQuery, useRefundsQuery, useSettlementsQuery } from '@/hooks/useAdminQueries';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import {
  fetchSummary,
  fetchPayments,
  fetchRefunds,
  fetchSettlements,
  submitRefundRequest,
  approveRefundThunk,
  executeRefundThunk,
  processSettlementThunk,
} from '../redux/slices/financeSlice';
import {
  Clock,
  Receipt,
  Briefcase,
  RefreshCcw,
  ArrowUpRight,
  X,
  Loader2,
  FileText,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Sparkles,
  Eye,
  Download,
} from 'lucide-react';
import { financeService, API_URL } from '../services/api';
import { cn } from '../utils/cn';
import { useToast } from '../components/Toast';
import { customFormatService } from '../services/customFormat.service';
import { CustomInvoiceTemplate } from '../types/customFormat';
import { LiveInvoicePreview } from '../components/customFormats/LiveInvoicePreview';
import { exportInvoiceToPdf } from '../utils/exportInvoicePdf';

export const PaymentsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { summary, payments, refunds, settlements, loading } = useAppSelector(state => state.finance);
  const [activeTab, setActiveTab] = useState<'ledger' | 'settlements' | 'refunds'>('ledger');
  const { success, error: toastError } = useToast();

  const [customInvoiceTemplates, setCustomInvoiceTemplates] = useState<CustomInvoiceTemplate[]>([]);
  const [invoicePreviewModal, setInvoicePreviewModal] = useState<{
    open: boolean;
    payment: any;
    selectedTemplateId?: string;
  } | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleDownloadInvoicePDF = async () => {
    if (!invoicePreviewModal?.payment) return;
    if (invoicePreviewModal.payment.invoiceUrl) {
      window.open(invoicePreviewModal.payment.invoiceUrl, '_blank');
      return;
    }
    setIsExportingPDF(true);
    try {
      const code = invoicePreviewModal.payment?.booking?.bookingCode || invoicePreviewModal.payment?.id || 'Payment';
      await exportInvoiceToPdf('payment-invoice-capture', `Invoice_${code}.pdf`);
      success('Invoice PDF downloaded successfully');
    } catch (err) {
      console.error('Invoice PDF export failed:', err);
      toastError('Failed to export PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const [refundModal, setRefundModal] = useState<{ open: boolean; paymentId: string; maxAmount: number; bookingCode: string } | null>(null);
  const [refundForm, setRefundForm] = useState<{ refundType: 'FULL' | 'PARTIAL'; amount: string; reason: string }>({
    refundType: 'FULL',
    amount: '',
    reason: '',
  });
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundSuccess, setRefundSuccess] = useState<{ razorpayRefundId: string; amount: number; status: string; remainingRefundable: number } | null>(null);
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);

  const [settlementSubmitting, setSettlementSubmitting] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  useEffect(() => {
    customFormatService.getInvoiceTemplates()
      .then(tpls => setCustomInvoiceTemplates(tpls))
      .catch(err => console.error('Failed to load custom invoice templates:', err));
  }, []);

  const handleRegenerateInvoice = async (bookingId: string) => {
    setRegenerating(bookingId);
    try {
      await financeService.regenerateInvoice(bookingId);
      success('Invoice regeneration queued. Refresh in a moment.');
    } catch {
      toastError('Failed to regenerate invoice.');
    }
    setRegenerating(null);
  };

 usePaymentSummaryQuery();
  usePaymentsQuery({});
  useRefundsQuery(undefined);
  useSettlementsQuery(undefined);

usePaymentSummaryQuery();
  usePaymentsQuery({});
  useRefundsQuery(undefined);
  useSettlementsQuery(undefined);

const handleOpenRefundModal = (paymentId: string, amount: number, bookingCode: string) => {
    setRefundForm({ refundType: 'FULL', amount: String(amount), reason: '' });
    setRefundSuccess(null);
    setRefundModal({ open: true, paymentId, maxAmount: amount, bookingCode });
  };

  const handleSubmitRefund = async () => {
    if (!refundModal) return;
    if (!refundForm.reason.trim()) { toastError('Refund reason is required.'); return; }
    if (refundForm.refundType === 'PARTIAL') {
      const amt = parseFloat(refundForm.amount);
      if (!amt || amt <= 0 || amt > refundModal.maxAmount) {
        toastError(`Partial refund amount must be between ₹1 and ₹${refundModal.maxAmount}.`);
        return;
      }
    }

    setRefundSubmitting(true);
    const result = await dispatch(executeRefundThunk({
      paymentId: refundModal.paymentId,
      refundType: refundForm.refundType,
      amount: refundForm.refundType === 'PARTIAL' ? parseFloat(refundForm.amount) : undefined,
      reason: refundForm.reason.trim(),
    }));

if (executeRefundThunk.fulfilled.match(result)) {
      setRefundSuccess({
        razorpayRefundId: result.payload.razorpayRefundId,
        amount: result.payload.refundAmount,
        status: result.payload.status,
        remainingRefundable: result.payload.remainingRefundable,
      });
      dispatch(fetchPayments({}));
      dispatch(fetchRefunds(undefined));
      dispatch(fetchSummary());
    } else {
      toastError(result.payload as string || 'Failed to process refund');
    }
    setRefundSubmitting(false);
  };
  const handleApproveRefund = async (id: string) => {
    const result = await dispatch(approveRefundThunk(id));
    if (approveRefundThunk.fulfilled.match(result)) {
      success('Refund approved and processed via gateway.');
      dispatch(fetchRefunds(undefined));
      dispatch(fetchSummary());
    } else {
      toastError(result.payload as string || 'Failed to approve refund');
    }
  };

  const handlePaySettlement = async (id: string) => {
    setSettlementSubmitting(id);
    const result = await dispatch(processSettlementThunk(id));
    if (processSettlementThunk.fulfilled.match(result)) {
      success('Settlement processed. Payout initiated.');
      dispatch(fetchSummary());
    } else {
      toastError(result.payload as string || 'Failed to process settlement');
    }
    setSettlementSubmitting(null);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      CAPTURED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
      REFUNDED: 'bg-rose-50 text-rose-700 border-rose-200',
      PARTIALLY_REFUNDED: 'bg-orange-50 text-orange-700 border-orange-200',
      FAILED: 'bg-red-50 text-red-700 border-red-200',
      COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
      APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
    };
    return map[status] || 'bg-muted text-foreground border-border';
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Financial Ledger & Settlements</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Enterprise payment management, franchise commissions, and audit gateway.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {loading && !summary ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card border border-border p-4 sm:p-5 rounded-2xl shadow-sm flex items-center gap-4 animate-pulse">
                <div className="h-10 sm:h-12 w-10 sm:w-12 bg-muted rounded-xl shrink-0" />
                <div className="space-y-2">
                  <div className="h-2.5 bg-muted rounded w-28" />
                  <div className="h-6 sm:h-7 bg-muted rounded w-20" />
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="bg-card border border-border p-4 sm:p-5 rounded-2xl shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="h-10 sm:h-12 w-10 sm:w-12 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                <ArrowUpRight className="h-5 sm:h-6 w-5 sm:w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">Total Invoiced Assets</div>
                <div className="text-xl sm:text-2xl font-black text-foreground mt-0.5">₹{((summary as any)?.totalCaptured || (summary as any)?.totalCollected || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="bg-card border border-border p-4 sm:p-5 rounded-2xl shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="h-10 sm:h-12 w-10 sm:w-12 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl flex items-center justify-center shrink-0">
                <Clock className="h-5 sm:h-6 w-5 sm:w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">Pending Payments</div>
                <div className="text-xl sm:text-2xl font-black text-foreground mt-0.5">₹{(summary?.totalPending || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="bg-card border border-border p-4 sm:p-5 rounded-2xl shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="h-10 sm:h-12 w-10 sm:w-12 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl flex items-center justify-center shrink-0">
                <Clock className="h-5 sm:h-6 w-5 sm:w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">Pending Commission</div>
                <div className="text-xl sm:text-2xl font-black text-foreground mt-0.5">₹{(summary?.pendingSettlements || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="bg-card border border-border p-4 sm:p-5 rounded-2xl shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="h-10 sm:h-12 w-10 sm:w-12 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center justify-center shrink-0">
                <RefreshCcw className="h-5 sm:h-6 w-5 sm:w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">Processed Reversals</div>
                <div className="text-xl sm:text-2xl font-black text-foreground mt-0.5">₹{(summary?.totalRefunded || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab('ledger')}
          className={cn("px-4 sm:px-5 py-2.5 sm:py-3 text-xs font-black border-b-2 transition-all flex items-center gap-1.5",
            activeTab === 'ledger' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
        >
          <Receipt className="h-3.5 w-3.5" /> Cash & Online Ledger
        </button>
        <button
          onClick={() => setActiveTab('settlements')}
          className={cn("px-4 sm:px-5 py-2.5 sm:py-3 text-xs font-black border-b-2 transition-all flex items-center gap-1.5",
            activeTab === 'settlements' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
        >
          <Briefcase className="h-3.5 w-3.5" /> Partner Settlements
        </button>
        <button
          onClick={() => setActiveTab('refunds')}
          className={cn("px-4 sm:px-5 py-2.5 sm:py-3 text-xs font-black border-b-2 transition-all flex items-center gap-1.5",
            activeTab === 'refunds' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
        >
          <RefreshCcw className="h-3.5 w-3.5" /> Reversal Logs
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {loading && (
          <div className="overflow-x-auto animate-pulse">
            <table className="w-full text-left text-sm min-w-[850px]">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                    <th key={i} className="px-6 py-4">
                      <div className="h-2.5 bg-muted rounded w-16" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="h-3 bg-muted rounded w-20" /></td>
                    <td className="px-6 py-4"><div className="h-3 bg-muted rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-3 bg-muted rounded w-28" /></td>
                    <td className="px-6 py-4"><div className="h-5 bg-muted rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-3 bg-muted rounded w-14" /></td>
                    <td className="px-6 py-4"><div className="h-3 bg-muted rounded w-28" /></td>
                    <td className="px-6 py-4 text-center"><div className="h-5 bg-muted rounded-full w-20 mx-auto" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-3 bg-muted rounded w-16 ml-auto" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-3 bg-muted rounded w-16 ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && activeTab === 'ledger' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[850px]">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold text-[10px] uppercase">
                <tr>
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Booking Ref</th>
                  <th className="px-6 py-4">Client Name</th>
                  <th className="px-6 py-4">Gateway</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.length === 0 && (
                  <tr><td colSpan={9} className="px-6 py-10 text-center text-xs text-muted-foreground">No payment records found.</td></tr>
                )}
              {payments.map(tx => {
                  const txRefunds = refunds.filter(r => r.paymentId === tx.id);
                  const totalRefunded = txRefunds.filter(r => r.status === 'COMPLETED').reduce((s, r) => s + r.amount, 0);
                  const remainingRefundable = Math.round((tx.amount - totalRefunded) * 100) / 100;
                  const isExpanded = expandedPayment === tx.id;
              const canRefund = ['CAPTURED', 'PARTIALLY_REFUNDED'].includes(tx.status) && remainingRefundable > 0 && tx.method !== 'CASH';

                  return (
                    <>
                      <tr key={tx.id} className="hover:bg-muted/10 cursor-pointer" onClick={() => setExpandedPayment(isExpanded ? null : tx.id)}>
                        <td className="px-6 py-4 font-mono text-xs font-bold text-foreground">{tx.invoiceNumber || '-'}</td>
                        <td className="px-6 py-4 font-medium text-foreground">{tx.booking?.bookingCode || tx.bookingId}</td>
                        <td className="px-6 py-4 text-muted-foreground">{tx.booking?.patientName || '-'}</td>
                        <td className="px-6 py-4">
                          <span className="bg-muted text-foreground text-[10px] font-extrabold px-1.5 py-0.5 border rounded uppercase">{tx.gateway}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground uppercase">{tx.method || '-'}</td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">
                          {tx.paidAt ? new Date(tx.paidAt).toLocaleString() : new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn("text-[10px] font-bold px-2.5 py-0.5 border rounded-full inline-block", statusBadge(tx.status))}>
                            {tx.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-bold text-foreground">₹{tx.amount.toLocaleString('en-IN')}</div>
                          {totalRefunded > 0 && (
                            <div className="text-[10px] text-rose-500 font-medium">-₹{totalRefunded.toLocaleString('en-IN')} refunded</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                const defTpl = customInvoiceTemplates.find(t => t.isDefault) || customInvoiceTemplates[0];
                                setInvoicePreviewModal({
                                  open: true,
                                  payment: tx,
                                  selectedTemplateId: defTpl?.id || '',
                                });
                              }}
                              className="text-teal-700 dark:text-teal-400 hover:text-teal-800 text-[11px] font-bold flex items-center gap-1.5 hover:underline bg-teal-50 dark:bg-teal-950/30 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-900"
                            >
                              <FileText className="h-3.5 w-3.5 text-teal-600" /> Invoice & PDF
                            </button>
                            {(tx.booking?.id || tx.bookingId) ? (
                              <button
                                onClick={() => handleRegenerateInvoice(tx.booking?.id || tx.bookingId)}
                                disabled={regenerating === (tx.booking?.id || tx.bookingId)}
                                className="text-amber-600 hover:text-amber-800 text-[11px] font-bold flex items-center gap-1 hover:underline disabled:opacity-50">
                                {regenerating === (tx.booking?.id || tx.bookingId)
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <RotateCcw className="h-3 w-3" />}
                                {tx.invoiceUrl ? 'Regen' : 'Generate'}
                              </button>
                            ) : null}
                            {canRefund && (
                              <button
                                onClick={() => handleOpenRefundModal(tx.id, remainingRefundable, tx.booking?.bookingCode || tx.bookingId)}
                                className="text-rose-600 hover:text-rose-800 text-[11px] font-bold hover:underline">
                                Reverse/Refund
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && txRefunds.length > 0 && (
                        <tr key={`${tx.id}-refunds`}>
                          <td colSpan={9} className="px-6 pb-3 pt-0 bg-rose-50/40">
                            <div className="border border-rose-100 rounded-lg overflow-hidden">
                              <div className="px-4 py-2 bg-rose-50 border-b border-rose-100">
                                <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider">Refund History ({txRefunds.length})</span>
                              </div>
                              {txRefunds.map(r => (
                                <div key={r.id} className="px-4 py-2.5 flex items-center justify-between border-b border-rose-50 last:border-0 bg-white">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-[10px] text-muted-foreground">{r.razorpayRefundId || r.id.slice(0, 12) + '...'}</span>
                                      <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded border uppercase", statusBadge(r.status))}>{r.status}</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Reason: {r.reason}</p>
                                    <p className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleString()}{r.processedAt ? ` → Processed: ${new Date(r.processedAt).toLocaleString()}` : ''}</p>
                                  </div>
                                  <div className="text-sm font-black text-rose-600">-₹{r.amount.toLocaleString('en-IN')}</div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && activeTab === 'settlements' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[850px]">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold text-[10px] uppercase">
                <tr>
                  <th className="px-6 py-4">Settlement Ref</th>
                  <th className="px-6 py-4">Franchise Office</th>
                  <th className="px-6 py-4">Statement Cycle</th>
                  <th className="px-6 py-4 text-right">Gross Business</th>
                  <th className="px-6 py-4 text-right">Commission</th>
                  <th className="px-6 py-4 text-right">Net Payable</th>
                  <th className="px-6 py-4 text-center">Payment Status</th>
                  <th className="px-6 py-4 text-right">Disbursement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {settlements.length === 0 && (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-xs text-muted-foreground">No settlement records found.</td></tr>
                )}
                {settlements.map(set => (
                  <tr key={set.id} className="hover:bg-muted/10">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-foreground">{set.settlementRef}</td>
                    <td className="px-6 py-4 font-bold text-foreground">{set.franchiseName}</td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">{set.period}</td>
                    <td className="px-6 py-4 text-right text-foreground font-medium">₹{set.totalBusiness.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-700">₹{set.commissionAmount.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right font-bold text-foreground">₹{set.netPayable.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 border rounded-full inline-block", statusBadge(set.status))}>
                        {set.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {set.status === 'PENDING' ? (
                        <button
                          onClick={() => handlePaySettlement(set.id)}
                          disabled={settlementSubmitting === set.id}
                          className="px-3 py-1 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ml-auto"
                        >
                          {settlementSubmitting === set.id && <Loader2 className="h-3 w-3 animate-spin" />}
                          Release Fund
                        </button>
                      ) : (
                        <div className="text-[10px] text-muted-foreground">
                          Settled {set.processedAt && new Date(set.processedAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && activeTab === 'refunds' && (
          <div className="p-6">
            {refunds.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs border border-dashed border-border rounded-lg">
                No financial reversals have been recorded yet.
              </div>
            ) : (
              <div className="space-y-4">
                {refunds.map(ref => (
                  <div key={ref.id} className="border border-border bg-card p-4 rounded-xl shadow-sm flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">
                          {ref.payment?.booking?.bookingCode || ref.bookingId}
                        </span>
                        <span className={cn("text-[9px] font-black uppercase px-1.5 rounded border", statusBadge(ref.status))}>
                          {ref.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Reason: "{ref.reason}"</p>
                      {ref.approvalNotes && (
                        <p className="text-xs text-muted-foreground">Notes: "{ref.approvalNotes}"</p>
                      )}
                      <div className="text-[10px] text-muted-foreground pt-1">
                        Requested: {new Date(ref.createdAt).toLocaleString()}
                      </div>
                      {ref.processedAt && (
                        <div className="text-[10px] text-muted-foreground">
                          Processed: {new Date(ref.processedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-lg font-black text-rose-600">-₹{ref.amount.toLocaleString('en-IN')}</div>
                      {ref.status === 'PENDING' && (
                        <button
                          onClick={() => handleApproveRefund(ref.id)}
                          className="px-3 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded text-[10px] font-black uppercase tracking-wider"
                        >
                          Approve & Process
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

  {refundModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-base font-black text-foreground">Reverse / Refund Payment</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Booking: <span className="font-bold text-foreground">{refundModal.bookingCode}</span> · Max: <span className="font-bold text-foreground">₹{refundModal.maxAmount.toLocaleString('en-IN')}</span></p>
              </div>
              <button onClick={() => { setRefundModal(null); setRefundSuccess(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {refundSuccess ? (
              <div className="p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3 py-2">
                  <div className="h-14 w-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-black text-foreground text-base">Refund {refundSuccess.status === 'COMPLETED' ? 'Processed' : 'Initiated'}</p>
                    <p className="text-xs text-muted-foreground mt-1">₹{refundSuccess.amount?.toLocaleString('en-IN')} will be credited within 5–7 business days.</p>
                    {refundSuccess.remainingRefundable > 0 && (
                      <p className="text-[11px] text-amber-600 font-medium mt-1">Remaining refundable: ₹{refundSuccess.remainingRefundable.toLocaleString('en-IN')}</p>
                    )}
                  </div>
                </div>
                {refundSuccess.razorpayRefundId && (
                  <div className="bg-muted/40 border border-border rounded-lg px-4 py-3 text-center space-y-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Razorpay Refund ID</p>
                    <p className="font-mono text-xs font-bold text-foreground">{refundSuccess.razorpayRefundId}</p>
                    <p className="text-[10px] text-muted-foreground">Keep this ID for support reference</p>
                  </div>
                )}
                <button
                  onClick={() => { setRefundModal(null); setRefundSuccess(null); }}
                  className="w-full border border-border rounded-lg py-2.5 text-sm font-bold text-foreground hover:bg-muted/30 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-2">Refund Type <span className="text-rose-500">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['FULL', 'PARTIAL'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setRefundForm(f => ({ ...f, refundType: type, amount: type === 'FULL' ? String(refundModal.maxAmount) : '' }))}
                        className={cn(
                          "py-2.5 rounded-lg border text-sm font-bold transition-all",
                          refundForm.refundType === type
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                        )}
                      >
                        {type === 'FULL' ? `Full - ₹${refundModal.maxAmount.toLocaleString('en-IN')}` : 'Partial'}
                      </button>
                    ))}
                  </div>
                </div>

                {refundForm.refundType === 'PARTIAL' && (
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5">Refund Amount (₹) <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      value={refundForm.amount}
                      onChange={e => setRefundForm(f => ({ ...f, amount: e.target.value }))}
                      max={refundModal.maxAmount}
                      min={1}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder={`Enter amount (max ₹${refundModal.maxAmount})`}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Refund Reason <span className="text-rose-500">*</span></label>
                  <textarea
                    value={refundForm.reason}
                    onChange={e => setRefundForm(f => ({ ...f, reason: e.target.value }))}
                    rows={3}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="State the reason for this refund..."
                  />
                </div>

                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    This action will initiate a <strong>real refund through Razorpay</strong> and cannot be undone. The amount will be credited to the customer's original payment method within 5–7 business days.
                  </p>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setRefundModal(null)}
                    className="flex-1 border border-border rounded-lg py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitRefund}
                    disabled={refundSubmitting}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg py-2.5 text-sm font-black disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {refundSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                    {refundSubmitting ? 'Processing...' : 'Confirm Refund'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Invoice Preview Modal */}
      {invoicePreviewModal?.open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center p-2 sm:p-6 overflow-y-auto printable-modal-overlay">
          <div className="no-print w-full max-w-5xl flex flex-col sm:flex-row sm:items-center justify-between mb-3 text-white gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
              <span className="font-bold text-xs sm:text-sm truncate">
                Invoice: {invoicePreviewModal.payment?.booking?.bookingCode || invoicePreviewModal.payment?.id}
              </span>
              {customInvoiceTemplates.length > 0 && (
                <select
                  value={invoicePreviewModal.selectedTemplateId}
                  onChange={(e) => setInvoicePreviewModal({
                    ...invoicePreviewModal,
                    selectedTemplateId: e.target.value,
                  })}
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
                disabled={isExportingPDF}
                onClick={handleDownloadInvoicePDF}
                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                {isExportingPDF ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {isExportingPDF ? 'Exporting...' : 'Download PDF'}
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button
                onClick={() => setInvoicePreviewModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div id="payment-invoice-capture" className="overflow-x-auto overflow-y-auto max-h-[85vh] pb-12 w-full flex justify-center custom-scrollbar printable-modal-scroll">
            <LiveInvoicePreview
              template={customInvoiceTemplates.find(t => t.id === invoicePreviewModal.selectedTemplateId) || {}}
              scale={typeof window !== 'undefined' && window.innerWidth < 640 ? 0.45 : 0.88}
              invoiceData={(() => {
                const p = invoicePreviewModal.payment;
                const b = p?.booking;
                const u = b?.user || p?.user;

                // Build real item list from tests
                const testItems = (b?.tests || []).map((t: any, idx: number) => {
                  const testObj = t.test || t;
                  const rate = Number(testObj?.price || t.price || (p?.amount / (b?.tests?.length || 1)));
                  const discPrice = Number(testObj?.discountedPrice || testObj?.discountPrice || t.price || rate);
                  const discount = Math.max(0, rate - discPrice);
                  return {
                    id: `test-${idx + 1}`,
                    name: testObj?.name || t.name || 'Diagnostic Investigation',
                    code: testObj?.code || '',
                    rate: rate,
                    quantity: 1,
                    discount: discount,
                    taxRate: 5,
                    total: discPrice,
                  };
                });

                // Build real item list from packages
                const packageItems = (b?.packages || []).map((pkg: any, idx: number) => {
                  const pkgObj = pkg.package || pkg;
                  const rate = Number(pkgObj?.price || pkg.price || 0);
                  const discPrice = Number(pkgObj?.discountedPrice || pkgObj?.discountPrice || pkg.price || rate);
                  const discount = Math.max(0, rate - discPrice);
                  return {
                    id: `pkg-${idx + 1}`,
                    name: `[Package] ${pkgObj?.name || pkg.name || 'Health Package'}`,
                    code: pkgObj?.code || '',
                    rate: rate,
                    quantity: 1,
                    discount: discount,
                    taxRate: 5,
                    total: discPrice,
                  };
                });

                const allItems = [...testItems, ...packageItems];
                const finalItems = allItems.length > 0 ? allItems : [
                  {
                    id: '1',
                    name: 'Diagnostic Investigation / Health Services',
                    code: b?.bookingCode || 'INVESTIGATION',
                    rate: Number(p?.subtotal || p?.amount || 0),
                    quantity: 1,
                    discount: Number(p?.discount || 0),
                    taxRate: 5,
                    total: Number(p?.amount || 0),
                  }
                ];

                const primaryAddress = u?.addresses?.find((a: any) => a.isDefault) || u?.addresses?.[0];
                const addressStr = primaryAddress
                  ? `${primaryAddress.line1}${primaryAddress.city ? ', ' + primaryAddress.city : ''}${primaryAddress.state ? ', ' + primaryAddress.state : ''}${primaryAddress.pincode ? ' - ' + primaryAddress.pincode : ''}`
                  : (b?.address || '');

                return {
                  invoiceNumber: p?.invoiceNumber || (b?.bookingCode ? `INV-${b.bookingCode}` : `INV-${p?.id?.slice(0, 8)}`),
                  receiptNumber: p?.receiptNumber || (b?.bookingCode ? `REC-${b.bookingCode}` : `REC-${p?.id?.slice(0, 8)}`),
                  date: p?.paidAt ? new Date(p.paidAt).toLocaleDateString('en-IN') : (p?.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')),
                  status: ['CAPTURED', 'SUCCESS', 'PAID', 'COMPLETED'].includes(String(p?.status).toUpperCase()) ? 'PAID' : (p?.status || 'PAID'),
                  paymentMethod: p?.method || (p?.gateway ? `${p.gateway} (Online)` : 'Online (Razorpay)'),
                  transactionId: p?.razorpayPaymentId || p?.paymentReference || p?.gatewayPaymentId || p?.id,
                  bookingCode: b?.bookingCode || 'MEDS-BOOKING',
                  patientName: b?.patientName || u?.name || 'Patient',
                  patientId: u?.uhid || b?.uhid || 'UHID-N/A',
                  patientAge: b?.patientAge || '',
                  patientGender: b?.patientGender || '',
                  patientMobile: b?.patientMobile || u?.mobile || '',
                  patientEmail: u?.email || '',
                  patientAddress: addressStr,
                  subtotal: p?.subtotal !== undefined && p?.subtotal !== null ? Number(p.subtotal) : undefined,
                  discount: p?.discount !== undefined && p?.discount !== null ? Number(p.discount) : undefined,
                  tax: p?.gst !== undefined && p?.gst !== null ? Number(p.gst) : (p?.tax !== undefined ? Number(p.tax) : undefined),
                  totalAmount: p?.amount !== undefined && p?.amount !== null ? Number(p.amount) : undefined,
                  items: finalItems,
                };
              })()}
            />
          </div>
        </div>
      )}
    </div>
  );
};