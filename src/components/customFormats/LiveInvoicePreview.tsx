import React from 'react';
import { CustomInvoiceTemplate } from '../../types/customFormat';
import { DynamicQRCode } from '../DynamicQRCode';

export interface SampleInvoiceItem {
  id: string;
  name: string;
  code?: string;
  hsnSac?: string;
  category?: string;
  rate: number;
  quantity: number;
  discount: number;
  taxRate: number; // e.g. 5 for 5%
  total: number;
}

export interface LiveInvoicePreviewProps {
  template: Partial<CustomInvoiceTemplate>;
  invoiceData?: any;
  scale?: number;
}

const DEFAULT_SAMPLE_ITEMS: SampleInvoiceItem[] = [
  {
    id: '1',
    name: 'Complete Blood Count (CBC) Automated',
    code: 'HAEM-001',
    hsnSac: '999312',
    category: 'Diagnostic Lab Test',
    rate: 450,
    quantity: 1,
    discount: 50,
    taxRate: 5,
    total: 400,
  },
  {
    id: '2',
    name: 'Comprehensive Lipid Profile Screen',
    code: 'BIO-104',
    hsnSac: '999312',
    category: 'Diagnostic Lab Test',
    rate: 850,
    quantity: 1,
    discount: 150,
    taxRate: 5,
    total: 700,
  },
  {
    id: '3',
    name: 'Thyroid Stimulating Hormone (TSH Ultrasensitive)',
    code: 'IMM-301',
    hsnSac: '999312',
    category: 'Immunoassay',
    rate: 400,
    quantity: 1,
    discount: 50,
    taxRate: 5,
    total: 350,
  },
  {
    id: '4',
    name: 'Liver Function Test (LFT) 10 Parameters',
    code: 'BIO-202',
    hsnSac: '999312',
    category: 'Clinical Biochemistry',
    rate: 800,
    quantity: 1,
    discount: 100,
    taxRate: 5,
    total: 700,
  },
];

function convertNumberToWords(amount: number): string {
  if (!amount || isNaN(amount) || amount <= 0) return 'Rupees Zero Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function numToWords(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + ' ' + ones[n % 10] + ' ';
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + numToWords(n % 100);
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand ' + numToWords(n % 1000);
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh ' + numToWords(n % 100000);
    return numToWords(Math.floor(n / 10000000)) + ' Crore ' + numToWords(n % 10000000);
  }

  const whole = Math.floor(amount);
  const paise = Math.round((amount - whole) * 100);
  let words = 'Rupees ' + numToWords(whole).trim();
  if (paise > 0) {
    words += ' and ' + numToWords(paise).trim() + ' Paise';
  }
  return words + ' Only';
}

export const LiveInvoicePreview: React.FC<LiveInvoicePreviewProps> = ({
  template,
  invoiceData,
  scale = 1,
}) => {
  const isDetailed = template.type === 'DETAILED';
  const branding = template.branding || {};
  const design = template.designSettings || {};
  const fields = template.fieldSettings || {
    showPatientDetails: true,
    showBillingDetails: true,
    showPaymentMethod: true,
    showTransactionId: true,
    showTaxBreakdown: true,
    showDiscountBreakdown: true,
    showCouponDetails: true,
    showAmountInWords: true,
    showBankDetails: true,
    showTerms: true,
    showSignature: true,
    showStamp: true,
  };
  const qr = template.qrSettings || {
    enabled: true,
    position: 'header_right',
    size: 48,
    alignment: 'right',
    label: 'Scan to verify invoice',
  };
  const footer = template.footerSettings || {
    customFooterText: 'Thank you for choosing MedsSeva Diagnostics for your healthcare needs.',
    termsAndConditions: '1. This is a computer-generated tax invoice and does not require a physical signature.\n2. Lab reports will be delivered within standard turnaround time (24-48 hours).\n3. Any discrepancy must be reported within 48 hours of billing.',
    bankName: 'HDFC Bank Ltd.',
    accountNumber: '50200088192341',
    ifscCode: 'HDFC0001234',
    accountHolder: 'MEDSSEVA GLOBAL HEALTHCARE PVT LTD',
    upiId: 'medsseva@hdfcbank',
    registeredOffice: 'G-130 Basement Office No 01, Sector 63, Noida, Uttar Pradesh - 201301',
  };

  const primaryColor = design.primaryColor || (isDetailed ? '#005C55' : '#0F766E');
  const secondaryColor = design.secondaryColor || '#0D9488';
  const textColor = design.textColor || '#0f172a';
  const fontFamily = design.fontFamily || "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  const lab = {
    name: branding.labName || 'MEDSSEVA GLOBAL HEALTHCARE PVT LTD',
    branch: branding.branchName || 'Central Processing Diagnostic Laboratory',
    tagline: branding.tagline || 'Smart Diagnostics. Better Care.',
    address: branding.address || 'G-130 Basement Office No 01, Sector 63, Noida, Uttar Pradesh - 201301',
    phone: branding.phone || '+91 84480 30936',
    email: branding.email || 'billing@medsseva.com',
    website: branding.website || 'www.medsseva.com',
    gstin: branding.gstin || '09AATCM6853F1ZU',
    pan: branding.pan || 'AAFCO021L',
    cin: branding.cin || 'U85110MH2021PTC362145',
    logoUrl: template.logoUrl || '/trusted-partner.jpg',
  };

  const rawStatus = String(invoiceData?.status || 'PAID').toUpperCase();
  const displayStatus = ['CAPTURED', 'SUCCESS', 'COMPLETED', 'PAID'].includes(rawStatus)
    ? 'PAID'
    : rawStatus === 'PARTIALLY_REFUNDED'
    ? 'PARTIAL REFUND'
    : rawStatus;

  const statusStyle = displayStatus === 'PAID'
    ? { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' }
    : ['REFUNDED', 'PARTIAL REFUND'].includes(displayStatus)
    ? { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' }
    : displayStatus === 'PENDING'
    ? { bg: '#fef3c7', text: '#b45309', border: '#fde68a' }
    : { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };

  const invoice = {
    number: invoiceData?.invoiceNumber || (invoiceData ? 'INV-N/A' : 'INV-2026-004812'),
    receiptNumber: invoiceData?.receiptNumber || (invoiceData ? 'REC-N/A' : 'REC-2026-004812'),
    date: invoiceData?.date || (invoiceData ? new Date().toLocaleDateString('en-IN') : '12/03/2026'),
    dueDate: invoiceData?.dueDate || 'Immediate',
    status: displayStatus,
    paymentMethod: invoiceData?.paymentMethod || (invoiceData ? 'Online' : 'Online (Razorpay / UPI)'),
    transactionId: invoiceData?.transactionId || (invoiceData ? 'N/A' : 'pay_P92kL109zM821a'),
    bookingCode: invoiceData?.bookingCode || (invoiceData ? 'N/A' : 'MEDS-88219'),
    patientName: invoiceData?.patientName || (invoiceData ? 'Patient' : 'Mr. Rajesh Kumar Verma'),
    patientId: invoiceData?.patientId || (invoiceData ? 'N/A' : 'UHID-2026-98124'),
    patientAge: invoiceData?.patientAge ?? (invoiceData ? '' : 42),
    patientGender: invoiceData?.patientGender ?? (invoiceData ? '' : 'Male'),
    patientMobile: invoiceData?.patientMobile || (invoiceData ? 'N/A' : '+91 98765 43210'),
    patientEmail: invoiceData?.patientEmail || (invoiceData ? '' : 'rajesh.verma@example.com'),
    patientAddress: invoiceData?.patientAddress || invoiceData?.address || (invoiceData ? '' : 'H.No 412, Sector 14, Urban Estate, Gurugram, Haryana - 122001'),
    billTo: invoiceData?.billTo || 'Self / Patient',
  };

  const isTemplatePreview = !invoiceData;
  const items = (invoiceData?.items && invoiceData.items.length > 0)
    ? (invoiceData.items as SampleInvoiceItem[])
    : isTemplatePreview
    ? DEFAULT_SAMPLE_ITEMS
    : [];

  const calculatedSubtotal = items.reduce((acc, item) => acc + item.rate * item.quantity, 0);
  const calculatedDiscount = items.reduce((acc, item) => acc + item.discount, 0);

  const subtotal = invoiceData?.subtotal !== undefined && invoiceData?.subtotal !== null
    ? Number(invoiceData.subtotal)
    : calculatedSubtotal;

  const totalDiscount = invoiceData?.discount !== undefined && invoiceData?.discount !== null
    ? Number(invoiceData.discount)
    : calculatedDiscount;

  const taxableAmount = Math.max(0, subtotal - totalDiscount);

  const totalTax = invoiceData?.tax !== undefined && invoiceData?.tax !== null
    ? Number(invoiceData.tax)
    : Math.round((taxableAmount * 0.05) * 100) / 100;

  const cgst = Math.round((totalTax / 2) * 100) / 100;
  const sgst = Math.round((totalTax / 2) * 100) / 100;

  const grandTotal = invoiceData?.totalAmount !== undefined && invoiceData?.totalAmount !== null
    ? Number(invoiceData.totalAmount)
    : taxableAmount + totalTax;

  const currentScale = scale || 1;
  const scaledWidth = Math.round(794 * currentScale);
  const scaledHeight = Math.round(1123 * currentScale);

  return (
    <div
      className="live-invoice-preview-wrapper inline-block mx-auto max-w-full select-none"
      style={{
        width: `${scaledWidth}px`,
        height: `${scaledHeight}px`,
        overflow: 'visible',
      }}
    >
      <div
        className="live-invoice-preview-container flex flex-col"
        style={{
          transform: currentScale !== 1 ? `scale(${currentScale})` : undefined,
          transformOrigin: 'top left',
          width: '794px',
          transition: 'transform 0.15s ease',
        }}
      >
        <div
          className="a4-page-sheet shadow-2xl relative bg-white border border-slate-300 print:border-0"
        style={{
          width: '794px',
          minHeight: '1123px',
          height: '1123px',
          boxSizing: 'border-box',
          margin: '0 auto 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontFamily,
          color: textColor,
          padding: '28px 36px 20px',
        }}
      >
        {/* ============================================================ */}
        {/* 1. HEADER SECTION */}
        {/* ============================================================ */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              paddingBottom: '12px',
              borderBottom: `2.5px solid ${primaryColor}`,
            }}
          >
            {/* Lab Branding & Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '340px' }}>
              {lab.logoUrl ? (
                <img
                  src={lab.logoUrl}
                  alt="Lab Logo"
                  style={{ maxHeight: '55px', maxWidth: '160px', objectFit: 'contain' }}
                  crossOrigin="anonymous"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '8px',
                    backgroundColor: primaryColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '18px',
                  }}
                >
                  {branding.labName?.[0] || 'M'}
                </div>
              )}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px', textTransform: 'uppercase' }}>
                  {lab.name}
                </div>
                {(branding as any).showTagline && (
                  <div style={{ fontSize: '8px', color: '#64748b', fontStyle: 'italic', marginTop: '1px' }}>
                    {lab.tagline}
                  </div>
                )}
                <div style={{ fontSize: '7.5px', color: '#64748b', marginTop: '2px', lineHeight: '1.3' }}>
                  {lab.address}
                </div>
              </div>
            </div>

            {/* Invoice Meta & QR */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontWeight: 900, color: primaryColor, letterSpacing: '0.5px' }}>
                  TAX INVOICE
                </div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  Invoice No: <span style={{ fontFamily: 'monospace' }}>{invoice.number}</span>
                </div>
                <div style={{ fontSize: '8.5px', color: '#64748b', marginTop: '1px' }}>
                  Date: {invoice.date}
                </div>
                <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'flex-end' }}>
                  <svg
                    width={Math.max(56, displayStatus.length * 7 + 24)}
                    height="18"
                    viewBox={`0 0 ${Math.max(56, displayStatus.length * 7 + 24)} 18`}
                    style={{ display: 'block' }}
                  >
                    <rect
                      x="0.5"
                      y="0.5"
                      width={Math.max(56, displayStatus.length * 7 + 24) - 1}
                      height="17"
                      rx="8.5"
                      fill={statusStyle.bg}
                      stroke={statusStyle.border}
                      strokeWidth="1"
                    />
                    <circle cx="11" cy="9" r="2.5" fill={statusStyle.text} />
                    <text
                      x="18"
                      y="11.8"
                      fill={statusStyle.text}
                      fontSize="8"
                      fontWeight="800"
                      fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                      letterSpacing="0.4"
                    >
                      {displayStatus}
                    </text>
                  </svg>
                </div>
              </div>

              {qr.enabled && qr.position === 'header_right' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <DynamicQRCode
                    value="https://play.google.com/store/apps/details?id=com.medssevaglobal.app"
                    size={Math.max(qr.size || 58, 58)}
                    label={qr.label || 'Scan to verify'}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Company Meta Sub-Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 0',
              borderBottom: '1px solid #e2e8f0',
              fontSize: '8px',
              color: '#64748b',
            }}
          >
            <span><strong>GSTIN:</strong> {lab.gstin}</span>
            <span><strong>PAN:</strong> {lab.pan}</span>
            {isDetailed && <span><strong>CIN:</strong> {lab.cin}</span>}
            <span><strong>Phone:</strong> {lab.phone}</span>
            <span><strong>Email:</strong> {lab.email}</span>
          </div>

          {/* ============================================================ */}
          {/* 2. PATIENT & BILLING DETAILS */}
          {/* ============================================================ */}
          <div
            style={{
              margin: '12px 0 16px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '10px 14px',
            }}
          >
            {/* Left: Patient Details */}
            {fields.showPatientDetails && (
              <div>
                <div style={{ fontSize: '9.5px', fontWeight: 900, color: primaryColor, textTransform: 'uppercase', marginBottom: '4px', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px' }}>
                  Patient Information
                </div>
                <table style={{ borderCollapse: 'collapse', fontSize: '9px', lineHeight: '1.6', width: '100%' }}>
                  <tbody>
                    <tr>
                      <td style={{ color: '#64748b', width: '70px', fontWeight: 600 }}>Name</td>
                      <td style={{ width: '8px', color: '#64748b' }}>:</td>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>{invoice.patientName}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#64748b', fontWeight: 600 }}>Patient ID</td>
                      <td style={{ color: '#64748b' }}>:</td>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>{invoice.patientId}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#64748b', fontWeight: 600 }}>Age / Gender</td>
                      <td style={{ color: '#64748b' }}>:</td>
                      <td style={{ color: '#0f172a' }}>
                        {invoice.patientAge ? `${invoice.patientAge} Yrs` : ''}
                        {invoice.patientAge && invoice.patientGender ? ' / ' : ''}
                        {invoice.patientGender || (!invoice.patientAge ? 'N/A' : '')}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: '#64748b', fontWeight: 600 }}>Mobile</td>
                      <td style={{ color: '#64748b' }}>:</td>
                      <td style={{ color: '#0f172a' }}>{invoice.patientMobile}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Right: Booking & Billing Details */}
            {fields.showBillingDetails && (
              <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '14px' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 900, color: primaryColor, textTransform: 'uppercase', marginBottom: '4px', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px' }}>
                  Billing & Payment Details
                </div>
                <table style={{ borderCollapse: 'collapse', fontSize: '9px', lineHeight: '1.6', width: '100%' }}>
                  <tbody>
                    <tr>
                      <td style={{ color: '#64748b', width: '90px', fontWeight: 600 }}>Booking Code</td>
                      <td style={{ width: '8px', color: '#64748b' }}>:</td>
                      <td style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>{invoice.bookingCode}</td>
                    </tr>
                    {fields.showPaymentMethod && (
                      <tr>
                        <td style={{ color: '#64748b', fontWeight: 600 }}>Payment Method</td>
                        <td style={{ color: '#64748b' }}>:</td>
                        <td style={{ color: '#0f172a', fontWeight: 700 }}>{invoice.paymentMethod}</td>
                      </tr>
                    )}
                    {fields.showTransactionId && (
                      <tr>
                        <td style={{ color: '#64748b', fontWeight: 600 }}>Transaction ID</td>
                        <td style={{ color: '#64748b' }}>:</td>
                        <td style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: '8px' }}>{invoice.transactionId}</td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ color: '#64748b', fontWeight: 600 }}>Receipt Number</td>
                      <td style={{ color: '#64748b' }}>:</td>
                      <td style={{ color: '#0f172a', fontFamily: 'monospace' }}>{invoice.receiptNumber}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* 3. ITEMIZED TESTS / SERVICES TABLE */}
          {/* ============================================================ */}
          <div>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #cbd5e1',
                fontSize: '9px',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: primaryColor, color: '#ffffff' }}>
                  <th style={{ padding: '7px 8px', textAlign: 'center', width: '32px' }}>#</th>
                  <th style={{ padding: '7px 10px', textAlign: 'left', width: isDetailed ? '35%' : '45%' }}>INVESTIGATION / ITEM DESCRIPTION</th>
                  {isDetailed && <th style={{ padding: '7px 8px', textAlign: 'center', width: '12%' }}>HSN / SAC</th>}
                  <th style={{ padding: '7px 8px', textAlign: 'right', width: '15%' }}>RATE (₹)</th>
                  <th style={{ padding: '7px 8px', textAlign: 'center', width: '8%' }}>QTY</th>
                  <th style={{ padding: '7px 8px', textAlign: 'right', width: '15%' }}>DISC (₹)</th>
                  <th style={{ padding: '7px 10px', textAlign: 'right', width: '15%' }}>AMOUNT (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                    }}
                  >
                    <td style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '6px 10px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{item.name}</div>
                      {isDetailed && item.code && (
                        <div style={{ fontSize: '7.5px', color: '#64748b' }}>Code: {item.code}</div>
                      )}
                    </td>
                    {isDetailed && (
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontFamily: 'monospace', color: '#64748b' }}>
                        {item.hsnSac || '999312'}
                      </td>
                    )}
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                      {item.rate.toFixed(2)}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#dc2626', fontFamily: 'monospace' }}>
                      {item.discount > 0 ? `- ₹${item.discount.toFixed(2)}` : '0.00'}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                      ₹{item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ============================================================ */}
          {/* 4. TOTALS & BREAKDOWN */}
          {/* ============================================================ */}
          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', alignItems: 'flex-start' }}>
            {/* Left: Bank Details & Amount in Words */}
            <div>
              {fields.showAmountInWords && (
                <div style={{ padding: '6px 10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', fontSize: '8px' }}>
                  <strong style={{ color: '#166534' }}>Amount in Words: </strong>
                  <span style={{ color: '#14532d', textTransform: 'capitalize' }}>
                    {convertNumberToWords(grandTotal)}
                  </span>
                </div>
              )}

              {fields.showBankDetails && footer.bankName && (
                <div style={{ marginTop: '8px', padding: '8px 10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '8px' }}>
                  <div style={{ fontWeight: 800, color: primaryColor, textTransform: 'uppercase', marginBottom: '4px' }}>
                    Bank & UPI Transfer Details
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', color: '#475569' }}>
                    <div><strong>Bank:</strong> {footer.bankName}</div>
                    <div><strong>A/C No:</strong> {footer.accountNumber}</div>
                    <div><strong>IFSC:</strong> {footer.ifscCode}</div>
                    <div><strong>UPI ID:</strong> {footer.upiId}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Calculations Box */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px 14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5px', lineHeight: '1.6' }}>
                <tbody>
                  <tr>
                    <td style={{ color: '#64748b', paddingBottom: '4px', verticalAlign: 'middle' }}>Item Gross Subtotal</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, paddingBottom: '4px', verticalAlign: 'middle' }}>₹{subtotal.toFixed(2)}</td>
                  </tr>
                  {fields.showDiscountBreakdown && totalDiscount > 0 && (
                    <tr>
                      <td style={{ color: '#dc2626', paddingBottom: '4px', verticalAlign: 'middle' }}>Special Discount</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#dc2626', fontWeight: 600, paddingBottom: '4px', verticalAlign: 'middle' }}>- ₹{totalDiscount.toFixed(2)}</td>
                    </tr>
                  )}
                  {fields.showTaxBreakdown && (
                    <>
                      <tr>
                        <td style={{ color: '#64748b', paddingBottom: '4px', verticalAlign: 'middle' }}>
                          CGST {taxableAmount > 0 && totalTax > 0 ? `(${((totalTax / taxableAmount / 2) * 100).toFixed(1).replace('.0', '')}%)` : '(2.5%)'}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', paddingBottom: '4px', verticalAlign: 'middle' }}>₹{cgst.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style={{ color: '#64748b', paddingBottom: '6px', verticalAlign: 'middle' }}>
                          SGST {taxableAmount > 0 && totalTax > 0 ? `(${((totalTax / taxableAmount / 2) * 100).toFixed(1).replace('.0', '')}%)` : '(2.5%)'}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', paddingBottom: '6px', verticalAlign: 'middle' }}>₹{sgst.toFixed(2)}</td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td
                      style={{
                        borderTop: `2px solid ${primaryColor}`,
                        paddingTop: '8px',
                        paddingBottom: '2px',
                        fontSize: '11px',
                        fontWeight: 900,
                        color: '#0f172a',
                        verticalAlign: 'middle',
                      }}
                    >
                      TOTAL PAID
                    </td>
                    <td
                      style={{
                        borderTop: `2px solid ${primaryColor}`,
                        paddingTop: '8px',
                        paddingBottom: '2px',
                        textAlign: 'right',
                        fontSize: '13px',
                        fontWeight: 900,
                        color: primaryColor,
                        fontFamily: 'monospace',
                        verticalAlign: 'middle',
                      }}
                    >
                      ₹{grandTotal.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 5. TERMS & CONDITIONS */}
          {/* ============================================================ */}
          {fields.showTerms && footer.termsAndConditions && (
            <div style={{ marginTop: '12px', padding: '6px 10px', border: '1px dashed #cbd5e1', borderRadius: '4px', fontSize: '7.5px', color: '#64748b', lineHeight: '1.4' }}>
              <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '2px', textTransform: 'uppercase' }}>Terms & Conditions</div>
              <div style={{ whiteSpace: 'pre-line' }}>{footer.termsAndConditions}</div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* 6. FOOTER & MANDATORY BRANDING */}
        {/* ============================================================ */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              paddingTop: '8px',
              borderTop: '1px solid #e2e8f0',
              marginBottom: '8px',
            }}
          >
            {/* Left: Registered Office */}
            <div style={{ fontSize: '7.5px', color: '#64748b', maxWidth: '380px' }}>
              <div><strong>Registered Office:</strong> {footer.registeredOffice || lab.address}</div>
              <div>CIN: {lab.cin} • ISO 9001:2015 & NABL Compliant Facility</div>
            </div>

            {/* Right: Signature */}
            {fields.showSignature && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '9px', fontStyle: 'italic', color: '#94a3b8', height: '24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                  [Digitally Generated Document]
                </div>
                <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#0f172a' }}>Authorized Billing Signatory</div>
                <div style={{ fontSize: '7px', color: '#64748b' }}>MedsSeva Global Healthcare Accounts</div>
              </div>
            )}
          </div>

          {/* Bottom Bar: Mandatory Powered by Medsseva */}
          <div
            style={{
              borderTop: `1.5px solid ${primaryColor}`,
              paddingTop: '6px',
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              fontSize: '8px',
              color: '#64748b',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              {footer.customFooterText || 'Thank you for your business.'}
            </div>

            {/* MANDATORY POWERED BY MEDSSEVA */}
            <div style={{ fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
              Powered by <span style={{ color: primaryColor }}>Medsseva</span>
            </div>

            <div style={{ fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>
              Page 1 of 1
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};
