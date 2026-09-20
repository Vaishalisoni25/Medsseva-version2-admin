import React from 'react';
import { CustomReportTemplate } from '../../types/customFormat';
import { DynamicQRCode } from '../DynamicQRCode';

export interface SampleTestData {
  testName: string;
  testCode?: string;
  category?: string;
  parameters: {
    name: string;
    value: string;
    unit: string;
    referenceRange: string;
    isAbnormal?: boolean;
    flag?: 'NORMAL' | 'HIGH' | 'LOW';
  }[];
  remarks?: string;
  interpretation?: string;
}

export interface LiveReportPreviewProps {
  template: Partial<CustomReportTemplate>;
  patientData?: any;
  tests?: SampleTestData[];
  previewPageNumber?: number; // if set, shows single page, otherwise shows all pages stacked
  scale?: number;
}

const DEFAULT_SAMPLE_TESTS: SampleTestData[] = [
  {
    testName: 'Complete Blood Count (CBC)',
    testCode: 'HAEM-001',
    category: 'HAEMATOLOGY',
    parameters: [
      { name: 'Haemoglobin (Hb)', value: '14.2', unit: 'g/dL', referenceRange: '13.0 - 17.0', isAbnormal: false, flag: 'NORMAL' },
      { name: 'Total Leucocyte Count (TLC)', value: '7,800', unit: '/cumm', referenceRange: '4,000 - 11,000', isAbnormal: false, flag: 'NORMAL' },
      { name: 'RBC Count', value: '4.85', unit: 'mill/cumm', referenceRange: '4.5 - 5.5', isAbnormal: false, flag: 'NORMAL' },
      { name: 'Packed Cell Volume (PCV)', value: '43.5', unit: '%', referenceRange: '40.0 - 50.0', isAbnormal: false, flag: 'NORMAL' },
      { name: 'Mean Corpuscular Volume (MCV)', value: '89.2', unit: 'fL', referenceRange: '83.0 - 101.0', isAbnormal: false, flag: 'NORMAL' },
      { name: 'Mean Corpuscular Haemoglobin (MCH)', value: '29.4', unit: 'pg', referenceRange: '27.0 - 32.0', isAbnormal: false, flag: 'NORMAL' },
      { name: 'Platelet Count', value: '2.45', unit: 'Lakhs/cumm', referenceRange: '1.50 - 4.50', isAbnormal: false, flag: 'NORMAL' },
      { name: 'Neutrophils', value: '62', unit: '%', referenceRange: '40 - 75', isAbnormal: false, flag: 'NORMAL' },
      { name: 'Lymphocytes', value: '28', unit: '%', referenceRange: '20 - 45', isAbnormal: false, flag: 'NORMAL' },
      { name: 'Monocytes', value: '06', unit: '%', referenceRange: '02 - 10', isAbnormal: false, flag: 'NORMAL' },
      { name: 'Eosinophils', value: '04', unit: '%', referenceRange: '01 - 06', isAbnormal: false, flag: 'NORMAL' },
      { name: 'Basophils', value: '00', unit: '%', referenceRange: '00 - 01', isAbnormal: false, flag: 'NORMAL' },
    ],
    remarks: 'Sample processed on automated 5-part hematology analyzer. Smear examined under microscope shows normocytic normochromic RBCs.',
    interpretation: 'All CBC parameters are within normal physiological biological reference intervals.',
  },
  {
    testName: 'Lipid Profile Screen',
    testCode: 'BIO-104',
    category: 'CLINICAL BIOCHEMISTRY',
    parameters: [
      { name: 'Total Cholesterol', value: '215', unit: 'mg/dL', referenceRange: '< 200 Desirable', isAbnormal: true, flag: 'HIGH' },
      { name: 'Triglycerides', value: '168', unit: 'mg/dL', referenceRange: '< 150 Normal', isAbnormal: true, flag: 'HIGH' },
      { name: 'HDL Cholesterol (Good)', value: '46', unit: 'mg/dL', referenceRange: '> 40 Normal', isAbnormal: false, flag: 'NORMAL' },
      { name: 'LDL Cholesterol (Bad)', value: '135', unit: 'mg/dL', referenceRange: '< 100 Optimal', isAbnormal: true, flag: 'HIGH' },
      { name: 'VLDL Cholesterol', value: '33.6', unit: 'mg/dL', referenceRange: '05 - 30', isAbnormal: true, flag: 'HIGH' },
      { name: 'Chol / HDL Ratio', value: '4.67', unit: 'Ratio', referenceRange: '3.3 - 4.4 Low Risk', isAbnormal: true, flag: 'HIGH' },
    ],
    remarks: '12-hour overnight fasting sample. Serum is slightly lipaemic.',
    interpretation: 'Mild hypercholesterolemia with elevated triglycerides and LDL cholesterol. Dietary counseling and lifestyle modifications recommended.',
  },
  {
    testName: 'Thyroid Function Panel (T3, T4, TSH)',
    testCode: 'IMM-301',
    category: 'ENDOCRINOLOGY / IMMUNOASSAY',
    parameters: [
      { name: 'Total Triiodothyronine (T3)', value: '1.24', unit: 'ng/mL', referenceRange: '0.80 - 2.00', isAbnormal: false, flag: 'NORMAL' },
      { name: 'Total Thyroxine (T4)', value: '8.40', unit: 'ug/dL', referenceRange: '5.10 - 14.10', isAbnormal: false, flag: 'NORMAL' },
      { name: 'Thyroid Stimulating Hormone (TSH, Ultrasensitive)', value: '2.45', unit: 'uIU/mL', referenceRange: '0.27 - 4.20', isAbnormal: false, flag: 'NORMAL' },
    ],
    remarks: 'Tested via electrochemiluminescence immunoassay (ECLIA).',
    interpretation: 'Euthyroid status. Thyroid hormone levels are within normal reference range.',
  },
  {
    testName: 'Liver Function Test (LFT)',
    testCode: 'BIO-202',
    category: 'CLINICAL BIOCHEMISTRY',
    parameters: [
      { name: 'Bilirubin Total', value: '0.80', unit: 'mg/dL', referenceRange: '0.20 - 1.20', isAbnormal: false, flag: 'NORMAL' },
      { name: 'Bilirubin Direct', value: '0.22', unit: 'mg/dL', referenceRange: '0.00 - 0.30', isAbnormal: false, flag: 'NORMAL' },
      { name: 'Bilirubin Indirect', value: '0.58', unit: 'mg/dL', referenceRange: '0.10 - 0.90', isAbnormal: false, flag: 'NORMAL' },
      { name: 'SGOT / AST', value: '26.0', unit: 'U/L', referenceRange: '05 - 40', isAbnormal: false, flag: 'NORMAL' },
      { name: 'SGPT / ALT', value: '31.0', unit: 'U/L', referenceRange: '05 - 45', isAbnormal: false, flag: 'NORMAL' },
      { name: 'Alkaline Phosphatase (ALP)', value: '88.0', unit: 'U/L', referenceRange: '30 - 120', isAbnormal: false, flag: 'NORMAL' },
      { name: 'Total Protein', value: '7.40', unit: 'g/dL', referenceRange: '6.40 - 8.30', isAbnormal: false, flag: 'NORMAL' },
      { name: 'Albumin', value: '4.50', unit: 'g/dL', referenceRange: '3.50 - 5.20', isAbnormal: false, flag: 'NORMAL' },
      { name: 'Globulin', value: '2.90', unit: 'g/dL', referenceRange: '2.00 - 3.50', isAbnormal: false, flag: 'NORMAL' },
      { name: 'A : G Ratio', value: '1.55', unit: 'Ratio', referenceRange: '1.20 - 2.20', isAbnormal: false, flag: 'NORMAL' },
    ],
    remarks: 'Enzymatic photometric determination at 37°C.',
    interpretation: 'Hepatic biochemical markers are within physiological normal limits.',
  },
];

export const LiveReportPreview: React.FC<LiveReportPreviewProps> = ({
  template,
  patientData,
  tests = DEFAULT_SAMPLE_TESTS,
  previewPageNumber,
  scale = 1,
}) => {
  const isDetailed = template.type === 'DETAILED';
  const branding = template.branding || {};
  const design = template.designSettings || {};
  const fields = template.fieldSettings || {
    showPatientId: true,
    showAgeGender: true,
    showMobile: true,
    showEmail: true,
    showAddress: true,
    showReferredBy: true,
    showSampleId: true,
    showCollectionDate: true,
    showCollectionTime: true,
    showReportDate: true,
    showReportTime: true,
    showBarcode: true,
    showTestCode: true,
    showInterpretation: true,
    showRemarks: true,
    showSignature: true,
    showStamp: true,
    showDoctorDetails: true,
    showTechnicianDetails: true,
    showAbnormalFlags: true,
  };
  const qr = template.qrSettings || {
    enabled: true,
    position: 'header_right',
    size: 48,
    alignment: 'right',
    label: 'Scan to verify',
  };
  const footer = template.footerSettings || {
    customFooterText: 'Clinical diagnostic report certified by accredited pathologist.',
    footerAlignment: 'center',
    showPageNumbers: true,
  };

  const primaryColor = design.primaryColor || (isDetailed ? '#0d5c75' : '#006d6f');
  const secondaryColor = design.secondaryColor || '#0a7c7c';
  const textColor = design.textColor || '#0f172a';
  const fontFamily = design.fontFamily || "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const borderThickness = design.borderThickness || 1;

  const getMethodology = (paramName: string, unit: string): string => {
    const p = (paramName || '').toLowerCase();
    if (p.includes('hemoglobin') || p.includes('hb')) return 'Photometry';
    if (p.includes('pcv') || p.includes('packed cell') || p.includes('mentzer') || p.includes('mch') || p.includes('mchc') || p.includes('absolute')) return 'Calculated';
    if (p.includes('rbc') || p.includes('mcv') || p.includes('rdw') || p.includes('tlc') || p.includes('platelet') || p.includes('total leukocyte')) return 'Electrical Impedance';
    if (p.includes('neutrophil') || p.includes('lymphocyte') || p.includes('monocyte') || p.includes('eosinophil') || p.includes('basophil')) return 'Optical/Impedance';
    if (p.includes('mpv') || p.includes('platelet volume')) return 'Coulter Principle';
    if (p.includes('sgot') || p.includes('sgpt') || p.includes('alt') || p.includes('ast') || p.includes('alkaline')) return 'IFCC';
    if (p.includes('crp') || p.includes('reactive protein')) return 'Immunoturbidimetry';
    if (p.includes('dengue') || p.includes('elisa') || p.includes('hiv') || p.includes('hbsag')) return 'ELISA / Immunoassay';
    if (p.includes('widal') || p.includes('typhi')) return 'ICT / Agglutination';
    if (p.includes('glucose') || p.includes('sugar')) return 'GOD-POD Method';
    if (p.includes('urea') || p.includes('bun')) return 'GLDH Urease';
    if (p.includes('creatinine')) return 'Modified Jaffe Kinetic';
    if (p.includes('colour') || p.includes('naked eye')) return 'Naked Eye Examination';
    if (p.includes('specific gravity')) return 'Pre-treated polymeric Ion Exchange resin';
    if (p.includes('ph')) return 'Double Indicator';
    if (p.includes('proteins')) return 'Tetra bromophenol';
    if (p.includes('ketones')) return 'Sodium Nitroprusside';
    if (p.includes('bilirubin')) return 'Diazonium salt';
    if (p.includes('blood') || p.includes('occult')) return 'Tetramethyl benzidine';
    if (p.includes('leucocyte esterase')) return 'Carboxylic acid ester diazonium salt';
    if (p.includes('nitrite')) return 'Sulfananic acid Tetrahydro benzol';
    if (p.includes('pus') || p.includes('epithelial') || p.includes('casts') || p.includes('crystals') || p.includes('r.b.c')) return 'Centrifuged Urine';
    if (unit === '%' || unit === 'fL' || unit === 'pg') return 'Calculated';
    return '';
  };

  const formatAddress = (addr: any): string => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    if (typeof addr === 'object') {
      const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.pincode].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : '';
    }
    return String(addr);
  };

  // Patient Info Fallback
  const patient = {
    name: typeof patientData?.patientName === 'string' ? patientData.patientName : 'Mr. Rajesh Kumar Verma',
    id: typeof (patientData?.uhid || patientData?.patientId) === 'string' ? (patientData.uhid || patientData.patientId) : 'UHID-2026-98124',
    age: typeof patientData?.patientAge === 'number' || typeof patientData?.patientAge === 'string' ? patientData.patientAge : 42,
    gender: typeof patientData?.patientGender === 'string' ? patientData.patientGender : 'Male',
    mobile: typeof patientData?.patientMobile === 'string' ? patientData.patientMobile : '+91 98765 43210',
    email: typeof patientData?.patientEmail === 'string' ? patientData.patientEmail : 'rajesh.verma@example.com',
    address: formatAddress(patientData?.address) || 'H.No 412, Sector 14, Urban Estate, Gurugram, Haryana - 122001',
    refDoctor: patientData?.referringDoctor?.name
      ? `Dr. ${patientData.referringDoctor.name.replace(/^dr\.?\s*/i, '')}`
      : (patientData?.referringDoctorName
        ? `Dr. ${patientData.referringDoctorName.replace(/^dr\.?\s*/i, '')}`
        : (typeof patientData?.refDoctor === 'string'
          ? patientData.refDoctor
          : 'Self')),
    sampleId: typeof patientData?.sampleId === 'string' ? patientData.sampleId : 'SMP-849201',
    bookingCode: typeof patientData?.bookingCode === 'string' ? patientData.bookingCode : 'MEDS-88219',
    collectionDate: typeof patientData?.collectionDate === 'string' ? patientData.collectionDate : '12/03/2026 08:30 AM',
    reportDate: typeof patientData?.reportDate === 'string' ? patientData.reportDate : '12/03/2026 04:45 PM',
  };

  const lab = {
    name: branding.labName || 'MedsSeva Diagnostic & Research Center',
    branch: branding.branchName || 'Central Reference Laboratory (Apex City)',
    tagline: branding.tagline || 'Excellence in Pathology & Advanced Molecular Diagnostics',
    address: branding.address || 'G-130 Basement Office No 01, Sector 63, Noida, Gautam Buddha Nagar, UP - 201301',
    phone: branding.phone || '+91 84480 30936 / +91 98765 43210',
    email: branding.email || 'reports@medsseva.com',
    website: branding.website || 'www.medsseva.com',
    regNo: branding.registrationNo || 'NABL / ISO-15189:2022 ACCR-8841',
    gstPan: branding.gstPan || 'GSTIN: 09AATCM6853F1ZU | PAN: AAFCO021L',
    logoUrl: template.logoUrl || '/trusted-partner.jpg',
  };

  // Critical Pagination: Filter tests or display all
  const activeTests = previewPageNumber
    ? [tests[previewPageNumber - 1] || tests[0]]
    : tests;
  const totalPages = tests.length || 1;

  const renderSingleTestPage = (test: SampleTestData, pageIndex: number) => {
    const pageNum = pageIndex + 1;

    return (
      <div
        key={pageIndex}
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
          padding: '24px 32px 20px',
          pageBreakAfter: 'always',
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
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '300px' }}>
              {lab.logoUrl ? (
                <img
                  src={lab.logoUrl}
                  alt="Lab Logo"
                  style={{ maxHeight: '60px', maxWidth: '160px', objectFit: 'contain' }}
                  crossOrigin="anonymous"
                  onError={(e) => {
                    // Fallback to placeholder badge if custom image fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div
                  style={{
                    backgroundColor: primaryColor,
                    color: '#ffffff',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontWeight: 900,
                    fontSize: '16px',
                  }}
                >
                  {lab.name.slice(0, 3).toUpperCase()}
                </div>
              )}
              {isDetailed && lab.tagline && (
                <div style={{ fontSize: '8px', color: '#64748b', fontStyle: 'italic', lineHeight: 1.3 }}>
                  {lab.tagline}
                </div>
              )}
            </div>

            {/* Lab Info */}
            <div style={{ textAlign: 'right', maxWidth: '420px' }}>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 900,
                  color: primaryColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  lineHeight: '1.2',
                }}
              >
                {lab.name}
              </div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: secondaryColor, marginTop: '2px' }}>
                {lab.branch}
              </div>
              <div style={{ fontSize: '8px', color: '#475569', lineHeight: '1.4', marginTop: '3px' }}>
                {lab.address}
              </div>
              <div style={{ fontSize: '8px', color: '#475569', marginTop: '1px' }}>
                <span>📞 {lab.phone}</span> | <span>✉️ {lab.email}</span>
              </div>
              {isDetailed && (
                <div style={{ fontSize: '7.5px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                  {lab.regNo} {lab.gstPan ? `• ${lab.gstPan}` : ''}
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* 2. PATIENT & SAMPLE INFORMATION BLOCK */}
          {/* ============================================================ */}
          <div
            style={{
              margin: '10px 0 14px',
              borderTop: `1px solid ${primaryColor}`,
              borderBottom: `1px solid #cbd5e1`,
              padding: '8px 0 10px',
              display: 'grid',
              gridTemplateColumns: qr.enabled && qr.position === 'header_right' ? '1.2fr 1fr 64px' : '1.3fr 1fr',
              gap: '14px',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
              paddingLeft: '10px',
              paddingRight: '10px',
            }}
          >
            {/* Left Column: Patient Details */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 'normal' }}>
                {patient.name}
              </div>
              <table style={{ borderCollapse: 'collapse', fontSize: '9px', lineHeight: '1.6', width: '100%', marginTop: '4px' }}>
                <tbody>
                  {fields.showPatientId && (
                    <tr>
                      <td style={{ color: '#64748b', width: '85px', fontWeight: 600, whiteSpace: 'nowrap', paddingRight: '4px' }}>Patient ID</td>
                      <td style={{ width: '8px', color: '#64748b', textAlign: 'center' }}>:</td>
                      <td style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', paddingLeft: '6px' }}>{patient.id}</td>
                    </tr>
                  )}
                  {fields.showAgeGender && (
                    <tr>
                      <td style={{ color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', paddingRight: '4px' }}>Age / Gender</td>
                      <td style={{ width: '8px', color: '#64748b', textAlign: 'center' }}>:</td>
                      <td style={{ fontWeight: 700, color: '#0f172a', paddingLeft: '6px' }}>{patient.age} Yrs / {patient.gender}</td>
                    </tr>
                  )}
                  {fields.showMobile && (
                    <tr>
                      <td style={{ color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', paddingRight: '4px' }}>Contact</td>
                      <td style={{ width: '8px', color: '#64748b', textAlign: 'center' }}>:</td>
                      <td style={{ fontWeight: 700, color: '#0f172a', paddingLeft: '6px' }}>{patient.mobile}</td>
                    </tr>
                  )}
                  {fields.showReferredBy && (
                    <tr>
                      <td style={{ color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', paddingRight: '4px' }}>Referred By</td>
                      <td style={{ width: '8px', color: '#64748b', textAlign: 'center' }}>:</td>
                      <td style={{ fontWeight: 700, color: '#0f172a', paddingLeft: '6px' }}>{patient.refDoctor}</td>
                    </tr>
                  )}
                  {isDetailed && fields.showAddress && (
                    <tr>
                      <td style={{ color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', paddingRight: '4px' }}>Address</td>
                      <td style={{ width: '8px', color: '#64748b', textAlign: 'center' }}>:</td>
                      <td style={{ fontWeight: 500, color: '#0f172a', fontSize: '8px', lineHeight: '1.2', paddingLeft: '6px' }}>{patient.address}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Middle Column: Sample / Registration Details */}
            <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '14px' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: '9px', lineHeight: '1.6', width: '100%' }}>
                <tbody>
                  {fields.showSampleId && (
                    <tr>
                      <td style={{ color: '#64748b', width: '90px', fontWeight: 600, whiteSpace: 'nowrap', paddingRight: '4px' }}>Sample ID</td>
                      <td style={{ width: '8px', color: '#64748b', textAlign: 'center' }}>:</td>
                      <td style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', paddingLeft: '6px' }}>{patient.sampleId}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', paddingRight: '4px' }}>Booking Ref</td>
                    <td style={{ width: '8px', color: '#64748b', textAlign: 'center' }}>:</td>
                    <td style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', paddingLeft: '6px' }}>{patient.bookingCode}</td>
                  </tr>
                  {fields.showCollectionDate && (
                    <tr>
                      <td style={{ color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', paddingRight: '4px' }}>Collected On</td>
                      <td style={{ width: '8px', color: '#64748b', textAlign: 'center' }}>:</td>
                      <td style={{ color: '#0f172a', fontWeight: 600, paddingLeft: '6px' }}>{patient.collectionDate}</td>
                    </tr>
                  )}
                  {fields.showReportDate && (
                    <tr>
                      <td style={{ color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', paddingRight: '4px' }}>Reported On</td>
                      <td style={{ width: '8px', color: '#64748b', textAlign: 'center' }}>:</td>
                      <td style={{ color: '#0f172a', fontWeight: 800, paddingLeft: '6px' }}>{patient.reportDate}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Right Column: Dynamic QR Code */}
            {qr.enabled && qr.position === 'header_right' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <DynamicQRCode
                  value="https://play.google.com/store/apps/details?id=com.medssevaglobal.app"
                  size={Math.max(qr.size || 58, 58)}
                  label={qr.label || 'Scan to verify'}
                />
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* 3. TEST SECTION (ONE TEST PER PAGE MANDATE) */}
          {/* ============================================================ */}
          <div style={{ marginTop: '12px' }}>
            {/* Category / Discipline */}
            <div
              style={{
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: 900,
                color: '#475569',
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              {test.category || 'DEPARTMENT OF CLINICAL PATHOLOGY'}
            </div>

            {/* Test Header Banner */}
            <div
              style={{
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 900,
                color: '#ffffff',
                backgroundColor: primaryColor,
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                padding: '6px 0',
                borderRadius: '4px',
                marginBottom: '8px',
              }}
            >
              {test.testName} {fields.showTestCode && test.testCode ? `(${test.testCode})` : ''}
            </div>

            {/* Results Table */}
            {isDetailed ? (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: `${borderThickness}px solid #cbd5e1`,
                  fontSize: '9.5px',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #0f172a' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 900, width: '32%' }}>TEST / PARAMETER</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 900, width: '16%' }}>RESULTS</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 900, width: '12%' }}>UNITS</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 900, width: '22%' }}>BIO-REFERENCE INTERVAL</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 900, width: '18%' }}>METHOD / TECH</th>
                  </tr>
                </thead>
                <tbody>
                  {test.parameters.map((p, pIdx) => {
                    const isHigh = p.flag === 'HIGH';
                    const isLow = p.flag === 'LOW';
                    const isAbnormal = p.isAbnormal || isHigh || isLow;
                    const method = getMethodology(p.name, p.unit);

                    return (
                      <tr
                        key={pIdx}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: pIdx % 2 === 0 ? '#ffffff' : '#fafafa',
                        }}
                      >
                        <td style={{ padding: '5.5px 8px', fontWeight: isAbnormal ? 800 : 600, color: '#0f172a' }}>
                          {p.name}
                        </td>
                        <td style={{ padding: '5.5px 8px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontWeight: isAbnormal ? 900 : 700,
                              color: isAbnormal ? '#dc2626' : '#0f172a',
                              fontFamily: 'monospace',
                              fontSize: '10px',
                              backgroundColor: isAbnormal ? '#fee2e2' : 'transparent',
                              padding: isAbnormal ? '1px 5px' : '0',
                              borderRadius: '3px',
                            }}
                          >
                            {p.value} {isHigh ? '↑' : isLow ? '↓' : ''}
                          </span>
                        </td>
                        <td style={{ padding: '5.5px 8px', textAlign: 'center', color: '#64748b' }}>
                          {p.unit || '-'}
                        </td>
                        <td style={{ padding: '5.5px 8px', color: '#334155', fontFamily: 'monospace', fontSize: '9px' }}>
                          {p.referenceRange || '-'}
                        </td>
                        <td style={{ padding: '5.5px 8px', color: '#64748b', fontSize: '8.5px', fontStyle: 'italic' }}>
                          {method || 'Automated Analysis'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: `${borderThickness}px solid #cbd5e1`,
                  fontSize: '9.5px',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #0f172a' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 900, width: '42%' }}>INVESTIGATION / PARAMETER</th>
                    <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 900, width: '20%' }}>OBSERVED VALUE</th>
                    <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 900, width: '16%' }}>UNIT</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 900, width: '22%' }}>REFERENCE INTERVAL</th>
                  </tr>
                </thead>
                <tbody>
                  {test.parameters.map((p, pIdx) => {
                    const isHigh = p.flag === 'HIGH';
                    const isLow = p.flag === 'LOW';
                    const isAbnormal = p.isAbnormal || isHigh || isLow;

                    return (
                      <tr
                        key={pIdx}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: pIdx % 2 === 0 ? '#ffffff' : '#fafafa',
                        }}
                      >
                        <td style={{ padding: '5.5px 10px', fontWeight: isAbnormal ? 800 : 600, color: '#0f172a' }}>
                          {p.name}
                        </td>
                        <td style={{ padding: '5.5px 10px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontWeight: isAbnormal ? 900 : 700,
                              color: isAbnormal ? '#dc2626' : '#0f172a',
                              fontFamily: 'monospace',
                              fontSize: '10px',
                              backgroundColor: isAbnormal ? '#fee2e2' : 'transparent',
                              padding: isAbnormal ? '1px 5px' : '0',
                              borderRadius: '3px',
                            }}
                          >
                            {p.value} {isHigh ? '↑' : isLow ? '↓' : ''}
                          </span>
                        </td>
                        <td style={{ padding: '5.5px 10px', textAlign: 'center', color: '#64748b' }}>
                          {p.unit || '-'}
                        </td>
                        <td style={{ padding: '5.5px 10px', color: '#334155', fontFamily: 'monospace', fontSize: '9px' }}>
                          {p.referenceRange || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Test Remarks & Interpretation */}
            {fields.showRemarks && test.remarks && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '6px 10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  fontSize: '8.5px',
                  lineHeight: '1.4',
                }}
              >
                <strong style={{ color: primaryColor, textTransform: 'uppercase' }}>Remarks / Method: </strong>
                <span style={{ color: '#475569' }}>{test.remarks}</span>
              </div>
            )}

            {isDetailed && fields.showInterpretation && test.interpretation && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '6px 10px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '4px',
                  fontSize: '8.5px',
                  lineHeight: '1.4',
                }}
              >
                <strong style={{ color: '#166534', textTransform: 'uppercase' }}>Clinical Interpretation: </strong>
                <span style={{ color: '#14532d' }}>{test.interpretation}</span>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. FOOTER & AUTHORIZED SIGNATURE SECTION */}
        {/* ============================================================ */}
        <div>
          {/* Pathologist & Tech Signature Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              paddingTop: '10px',
              borderTop: '1px solid #e2e8f0',
              marginBottom: '10px',
            }}
          >
            {/* Left: Lab Technologist */}
            {fields.showTechnicianDetails && (
              <div style={{ textAlign: 'left' }}>
                <div style={{ height: '32px', display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: '10px', fontStyle: 'italic', color: '#94a3b8' }}>[Digitally Authenticated]</div>
                </div>
                <div style={{ fontSize: '9px', fontWeight: 800, color: '#0f172a' }}>Medical Lab Technologist</div>
                <div style={{ fontSize: '7.5px', color: '#64748b' }}>BMLT, Quality Assurance Lead</div>
              </div>
            )}

            {/* Right: Pathologist Signature */}
            {fields.showDoctorDetails && (
              <div style={{ textAlign: 'right', minWidth: '180px' }}>
                <div style={{ height: '32px', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '11px', fontFamily: "'Brush Script MT', cursive, sans-serif", color: '#0f2a3f', fontWeight: 'bold' }}>
                    Dr. Aditya Tayal
                  </span>
                </div>
                <div style={{ fontSize: '9.5px', fontWeight: 900, color: '#0f172a' }}>Dr. Aditya Tayal</div>
                <div style={{ fontSize: '7.5px', color: '#64748b' }}>MD, DNB (Pathology) • Reg. 58194/DMC</div>
                <div style={{ fontSize: '7.5px', color: primaryColor, fontWeight: 700 }}>Senior Consultant Pathologist</div>
              </div>
            )}
          </div>

          {/* Footer Text & Powered by Medsseva & Dynamic Page Count */}
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
              {footer.customFooterText || 'This is an electronically validated diagnostic report.'}
            </div>

            {/* MANDATORY POWERED BY MEDSSEVA */}
            <div style={{ fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
              Powered by <span style={{ color: primaryColor }}>Medsseva</span>
            </div>

            {/* DYNAMIC PAGE NUMBER */}
            <div style={{ fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>
              Page {pageNum} of {totalPages}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const totalUnscaledHeight = activeTests.length * 1123 + Math.max(0, activeTests.length - 1) * 24;
  const currentScale = scale || 1;
  const scaledWidth = Math.round(794 * currentScale);
  const scaledHeight = Math.round(totalUnscaledHeight * currentScale);

  return (
    <div
      className="live-report-preview-wrapper inline-block mx-auto max-w-full select-none"
      style={{
        width: `${scaledWidth}px`,
        height: `${scaledHeight}px`,
        overflow: 'visible',
      }}
    >
      <div
        className="live-report-preview-container flex flex-col"
        style={{
          transform: currentScale !== 1 ? `scale(${currentScale})` : undefined,
          transformOrigin: 'top left',
          width: '794px',
          transition: 'transform 0.15s ease',
        }}
      >
        {activeTests.map((t, idx) => renderSingleTestPage(t, previewPageNumber ? previewPageNumber - 1 : idx))}
      </div>
    </div>
  );
};
