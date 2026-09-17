import React from 'react';
import { StandardReportTemplate, DummyQRCode, DummyBarcode, TemplateProps } from './reportTemplates/StandardReportTemplate';
import { DetailedReportTemplate } from './reportTemplates/DetailedReportTemplate';
import { CustomReportTemplate } from '../types/customFormat';
import { LiveReportPreview } from './customFormats/LiveReportPreview';

export { DummyQRCode, DummyBarcode };

// Evaluate Flag and Range based on patient observed value and reference range logic
function getFlag(p: any): { flag: string; isAbnormal: boolean; color: string } {
  if (!p.observedValue || !p.referenceRange) {
    return { flag: 'NORMAL', isAbnormal: false, color: '#1d4ed8' };
  }
  const strVal = String(p.observedValue).trim().toLowerCase();
  if (['negative', 'nil', 'clear', 'pale yellow', 'yellow', 'normal', 'not seen', 'absent', '0', '0.0', '-'].includes(strVal)) {
    return { flag: 'NORMAL', isAbnormal: false, color: '#1d4ed8' };
  }
  const val = parseFloat(p.observedValue);
  if (isNaN(val)) {
    return { flag: 'NORMAL', isAbnormal: false, color: '#1d4ed8' };
  }

  const parts = p.referenceRange.split('-').map((s: string) => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    const [lo, hi] = parts;
    if (val < lo) {
      return { flag: '↓ LOW', isAbnormal: true, color: '#dc2626' };
    }
    if (val > hi) {
      return { flag: '↑ HIGH', isAbnormal: true, color: '#dc2626' };
    }
  }
  return { flag: 'NORMAL', isAbnormal: false, color: '#1d4ed8' };
}

export interface DoctorDetails {
  name: string;
  qualification: string;
  regNo: string;
  designation: string;
  verifiedAt: string;
  signatureUrl?: string;
}

export type ReportTemplateType = 'STANDARD' | 'DETAILED';

export interface ReportPDFDocumentProps {
  report?: any;
  branch?: any;
  doctor?: DoctorDetails;
  technician?: any;
  containerId?: string;
  templateType?: ReportTemplateType;
  customTemplate?: Partial<CustomReportTemplate>;
  scale?: number;
}

export const ReportPDFDocument: React.FC<ReportPDFDocumentProps> = ({
  report: rawReport,
  branch: rawBranch,
  doctor: rawDoctor,
  technician: rawTechnician,
  containerId = 'clinical-report-document',
  templateType,
  customTemplate,
  scale = 1,
}) => {
  const report = rawReport || {};
  const rawBooking = report.booking || {};
  const formatAddress = (addr: any): string => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    if (typeof addr === 'object') {
      const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.pincode].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : '';
    }
    return String(addr);
  };

  const booking = {
    ...rawBooking,
    patientName: rawBooking.patientName || report.patientName || rawBooking.user?.name || '',
    bookingCode: rawBooking.bookingCode || report.bookingCode || report.id?.slice(0, 8) || '',
    patientAge: rawBooking.patientAge !== undefined ? rawBooking.patientAge : report.patientAge,
    patientGender: rawBooking.patientGender || report.patientGender || '',
    patientMobile: rawBooking.patientMobile || report.patientMobile || rawBooking.user?.mobile || '',
    patientEmail: rawBooking.patientEmail || report.patientEmail || rawBooking.user?.email || '',
    address: formatAddress(rawBooking.address || report.address || rawBooking.user?.address || rawBooking.user?.addresses?.[0] || rawBooking.branch?.address),
    collectionMode: rawBooking.collectionMode || report.collectionMode || 'LAB',
    sampleCollectedAt: rawBooking.sampleCollectedAt || report.sampleCollectedAt || report.reportedDate || null,
    sampleReceivedAt: rawBooking.sampleReceivedAt || report.sampleReceivedAt || report.reportedDate || null,
    branch: rawBranch || rawBooking.branch || report.reportBranch || null,
  };

  const doctor = rawDoctor
    ? {
        ...rawDoctor,
        signatureUrl: rawDoctor.signatureUrl || report.doctorSignatureUrl || report.signatureUrl || '',
      }
    : (report.doctorName ? {
        name: report.doctorName,
        qualification: report.doctorQualification || '',
        regNo: report.doctorRegNo || '',
        designation: report.doctorDesignation || '',
        verifiedAt: report.doctorVerifiedAt || report.reportedDate || null,
        signatureUrl: report.doctorSignatureUrl || report.signatureUrl || '',
      } : undefined);

  const technician = rawTechnician
    ? {
        ...rawTechnician,
        signatureUrl: rawTechnician.signatureUrl || report.technicianSignatureUrl || '',
      }
    : (report.technicianName ? {
        name: report.technicianName,
        qualification: report.technicianQualification || 'DMLT',
        signatureUrl: report.technicianSignatureUrl || '',
      } : (report.internalNotes?.includes('[TECH:') ? (() => {
        try {
          const m = report.internalNotes.match(/\[TECH:(\{.*?\})\]/);
          if (m && m[1]) {
            const p = JSON.parse(m[1]);
            return {
              name: p.name || 'Lab Technician',
              qualification: p.qualification || 'DMLT',
              signatureUrl: p.signatureUrl || '',
            };
          }
        } catch (e) {}
        return undefined;
      })() : undefined));

  const fmt = (dt: string | null | undefined) =>
    dt ? new Date(dt).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }) : '-';

  const formatDateTime = (dateStr: string | null | undefined, includeTime: boolean = true) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    if (!includeTime) return `${dd}/${mm}/${yyyy}`;
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hh = String(hours).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${minutes} ${ampm}`;
  };

  const generatedOn = fmt(report.reportedDate || report.createdAt || new Date().toISOString());

  const rawParameters = (report.parameters && report.parameters.length > 0) ? report.parameters : [];

  // 1. Determine distinct list of individual diagnostic tests
  const rawTestNames = [
    ...(booking.tests || []).map((bt: any) => bt.test?.name || bt.name),
    ...(booking.packages || []).map((bp: any) => bp.package?.name || bp.name),
  ].filter(Boolean);

  let distinctTests: string[] = [];
  if (rawTestNames.length > 0) {
    distinctTests = Array.from(new Set(rawTestNames));
  } else if (report.testName) {
    distinctTests = report.testName.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  if (distinctTests.length === 0) distinctTests = ['Diagnostic Test'];

  // Helper to intelligently classify parameters into their respective diagnostic tests
  const classifyParameterToTest = (paramName: string, availableTests: string[]): string => {
    const p = (paramName || '').toLowerCase();
    
    for (const t of availableTests) {
      const tl = t.toLowerCase();
      if (tl.includes('cbc') || tl.includes('complete blood') || tl.includes('hemogram')) {
        if (p.includes('hemoglobin') || p.includes('hb') || p.includes('rbc') || p.includes('wbc') || p.includes('platelet') || p.includes('tlc') || p.includes('dlc') || p.includes('neutrophil') || p.includes('lymphocyte') || p.includes('monocyte') || p.includes('eosinophil') || p.includes('basophil') || p.includes('hematocrit') || p.includes('pcv') || p.includes('mcv') || p.includes('mch') || p.includes('mchc') || p.includes('rdw') || p.includes('mpv') || p.includes('esr')) {
          return t;
        }
      }
      if (tl.includes('urine') || tl.includes('urinalysis') || tl.includes('microscopy')) {
        if (p.includes('urine') || p.includes('colour') || p.includes('color') || p.includes('transparency') || p.includes('gravity') || p.includes('ph') || p.includes('pus') || p.includes('epithelial') || p.includes('casts') || p.includes('crystals') || p.includes('ketone') || p.includes('nitrite') || p.includes('leucocyte esterase') || p.includes('urobilinogen') || p.includes('bacteria') || p.includes('r.b.c')) {
          return t;
        }
      }
      if (tl.includes('fasting') || tl.includes('fbs')) {
        if (p.includes('fasting') || (p.includes('sugar') && !p.includes('pp')) || (p.includes('glucose') && !p.includes('pp'))) {
          return t;
        }
      }
      if (tl.includes('pp') || tl.includes('post prandial') || tl.includes('ppbs')) {
        if (p.includes('pp') || p.includes('post prandial') || p.includes('post-prandial')) {
          return t;
        }
      }
      if (tl.includes('typhoid') || tl.includes('widal')) {
        if (p.includes('typhi') || p.includes('widal') || p.includes('typhoid') || p.includes('paratyphi')) {
          return t;
        }
      }
      if (tl.includes('lft') || tl.includes('liver')) {
        if (p.includes('bilirubin') || p.includes('sgot') || p.includes('sgpt') || p.includes('alt') || p.includes('ast') || p.includes('alkaline phosphatase') || p.includes('alp') || p.includes('protein') || p.includes('albumin') || p.includes('globulin') || p.includes('ratio')) {
          return t;
        }
      }
      if (tl.includes('kft') || tl.includes('rft') || tl.includes('kidney') || tl.includes('renal')) {
        if (p.includes('urea') || p.includes('bun') || p.includes('creatinine') || p.includes('uric') || p.includes('calcium') || p.includes('phosphorus') || p.includes('sodium') || p.includes('potassium') || p.includes('chloride')) {
          return t;
        }
      }
      if (tl.includes('thyroid') || tl.includes('tft')) {
        if (p.includes('t3') || p.includes('t4') || p.includes('tsh') || p.includes('triiodothyronine') || p.includes('thyroxine')) {
          return t;
        }
      }
      if (tl.includes('lipid')) {
        if (p.includes('cholesterol') || p.includes('triglyceride') || p.includes('hdl') || p.includes('ldl') || p.includes('vldl')) {
          return t;
        }
      }
    }
    return availableTests[0] || 'Diagnostic Test';
  };

  // 2. Group parameters into their specific tests
  const groupedParams: Record<string, any[]> = {};
  if (distinctTests.length > 1) {
    distinctTests.forEach(tName => {
      groupedParams[tName] = [];
    });
    rawParameters.forEach((p: any) => {
      const explicitGroup = p.testGroupName || p.category || (p.test && p.test.name) || p.testName;
      if (explicitGroup && distinctTests.includes(explicitGroup)) {
        groupedParams[explicitGroup].push(p);
      } else {
        const assignedTest = classifyParameterToTest(p.parameterName || p.name || '', distinctTests);
        if (!groupedParams[assignedTest]) groupedParams[assignedTest] = [];
        groupedParams[assignedTest].push(p);
      }
    });

    // Remove empty groups if any test had no parameters
    Object.keys(groupedParams).forEach(k => {
      if (groupedParams[k].length === 0) delete groupedParams[k];
    });
  }

  if (Object.keys(groupedParams).length === 0) {
    rawParameters.forEach((p: any) => {
      const key = p.testGroupName || p.category || (p.test && p.test.name) || p.testName || report.testName || 'Diagnostic Test';
      if (!groupedParams[key]) groupedParams[key] = [];
      groupedParams[key].push(p);
    });
  }

  if (Object.keys(groupedParams).length === 0 && rawParameters.length > 0) {
    groupedParams[report.testName || 'Diagnostic Test'] = rawParameters;
  }

  // Resolve template type from explicit prop, customTemplate, report data, or internal tag
  const resolvedTemplate: ReportTemplateType =
    customTemplate?.type ||
    templateType ||
    report.templateType ||
    (report.internalNotes?.includes('[TEMPLATE:DETAILED]') ? 'DETAILED' : 'STANDARD');

  // If a custom template is provided, map grouped parameters to tests and render via LiveReportPreview
  if (customTemplate) {
    const getCategoryForTest = (testTitle: string): string => {
      const t = (testTitle || '').toLowerCase();
      if (t.includes('cbc') || t.includes('blood count') || t.includes('hemogram') || t.includes('esr')) return 'DEPARTMENT OF HAEMATOLOGY';
      if (t.includes('urine') || t.includes('urinalysis') || t.includes('stool')) return 'CLINICAL PATHOLOGY & URINALYSIS';
      if (t.includes('sugar') || t.includes('glucose') || t.includes('lft') || t.includes('kft') || t.includes('rft') || t.includes('lipid') || t.includes('liver') || t.includes('kidney')) return 'CLINICAL BIOCHEMISTRY';
      if (t.includes('thyroid') || t.includes('tft') || t.includes('hormone') || t.includes('vitamin') || t.includes('ferritin')) return 'ENDOCRINOLOGY & IMMUNOASSAY';
      if (t.includes('typhoid') || t.includes('widal') || t.includes('dengue') || t.includes('hiv') || t.includes('serology')) return 'SEROLOGY & IMMUNOLOGY';
      return resolvedTemplate === 'DETAILED' ? 'DEPARTMENT OF CLINICAL PATHOLOGY & BIOCHEMISTRY' : 'CLINICAL PATHOLOGY';
    };

    const tests = Object.entries(groupedParams).map(([testName, params]) => ({
      testName,
      testCode: params[0]?.testCode || '',
      category: params[0]?.category || getCategoryForTest(testName),
      parameters: params.map((p: any) => {
        const flagInfo = getFlag(p);
        return {
          name: p.parameterName || p.name || 'Parameter',
          value: String(p.observedValue || p.value || '-'),
          unit: p.unit || '',
          referenceRange: p.referenceRange || '',
          isAbnormal: flagInfo.isAbnormal,
          flag: flagInfo.flag.includes('HIGH') ? 'HIGH' : flagInfo.flag.includes('LOW') ? 'LOW' : 'NORMAL',
        };
      }),
      remarks: report.technicianRemarks || report.clinicalNotes || (resolvedTemplate === 'DETAILED' ? 'Sample processed on fully automated dry chemistry & immunoassay analyzer.' : ''),
      interpretation: report.doctorRemarks || (resolvedTemplate === 'DETAILED' ? 'Values correlate with physiological profile. Recommend clinical review.' : ''),
    }));

    return (
      <div id={containerId}>
        <LiveReportPreview
          template={{ ...customTemplate, type: resolvedTemplate }}
          patientData={booking}
          tests={tests.length > 0 ? (tests as any) : undefined}
          scale={scale}
        />
      </div>
    );
  }

  const templateProps: TemplateProps = {
    report,
    booking,
    branch: rawBranch || booking.branch,
    doctor,
    technician,
    groupedParams,
    generatedOn,
    formatDateTime,
    getFlag,
    containerId,
  };

  return (
    <div
      id={containerId}
      style={{
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        width: '794px',
        minHeight: '1120px',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontSize: '10px',
        lineHeight: '1.35',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {resolvedTemplate === 'DETAILED' ? (
        <DetailedReportTemplate {...templateProps} />
      ) : (
        <StandardReportTemplate {...templateProps} />
      )}
    </div>
  );
};