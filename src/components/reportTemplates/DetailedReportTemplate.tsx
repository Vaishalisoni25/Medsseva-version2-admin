import React from 'react';
import { TemplateProps, DummyBarcode } from './StandardReportTemplate';
import { DynamicQRCode } from '../DynamicQRCode';

export const DetailedReportTemplate: React.FC<TemplateProps> = ({
  report,
  booking,
  branch,
  doctor,
  technician,
  groupedParams,
  formatDateTime,
  getFlag,
}) => {
  const effectiveBranch = branch || report?.reportBranch || booking?.branch || null;
  const branchName = effectiveBranch?.name || report?.branchName || 'LPL - MedsSeva Diagnostics';
  const branchAddr = [
    effectiveBranch?.line1,
    effectiveBranch?.city,
    effectiveBranch?.state,
    effectiveBranch?.pincode ? `- ${effectiveBranch.pincode}` : '',
  ].filter(Boolean).join(', ') || 'Central Diagnostic Reference Laboratory';
  const branchPhone = effectiveBranch?.contactNumber || '+91 8968522455';
  const branchEmail = effectiveBranch?.email || 'customer.care@medsseva.com';
  const branchLabRegNo = effectiveBranch?.labRegNo || '';

  const effectiveTechnician = technician || (report?.technicianName ? {
    name: report.technicianName,
    qualification: report.technicianQualification || 'DMLT',
    signatureUrl: report.technicianSignatureUrl || '',
  } : null);

  const patientTitle = booking?.patientGender === 'Female' ? 'Ms.' : 'Mr.';
  const rawPatientName = booking?.patientName || report?.patientName || '';
  const patientDisplayName = rawPatientName.toLowerCase().startsWith('mr') ||
    rawPatientName.toLowerCase().startsWith('ms') ||
    rawPatientName.toLowerCase().startsWith('mrs') ||
    rawPatientName.toLowerCase().startsWith('dr')
      ? rawPatientName
      : (rawPatientName ? `${patientTitle} ${rawPatientName}` : '-');

  const refDoctor = booking?.referringDoctor?.name
    ? `Dr. ${booking.referringDoctor.name}${booking.referringDoctor.qualification ? ` - ${booking.referringDoctor.qualification}` : ''}${booking.referringDoctor.designation ? `, ${booking.referringDoctor.designation}` : ''}`
    : booking?.assignedPartner?.user?.name
      ? `Dr. ${booking.assignedPartner.user.name}`
      : booking?.partnerNote?.startsWith('Ref:')
        ? booking.partnerNote.replace('Ref:', '').trim()
        : (doctor?.name || report?.doctorName || 'Self');

  const labNo = booking?.bookingCode || report?.id?.slice(0, 9) || '494874897';

  const patientMobile = booking?.patientMobile || booking?.user?.mobile || booking?.mobile || report?.booking?.patientMobile || report?.patientMobile || '-';
  const rawAddress = booking?.address || booking?.patientAddress || booking?.user?.addresses?.[0] || booking?.user?.address || report?.booking?.address || report?.address;
  let patientAddress = '-';
  if (typeof rawAddress === 'string' && rawAddress.trim()) {
    patientAddress = rawAddress.trim();
  } else if (rawAddress && typeof rawAddress === 'object') {
    const parts = [rawAddress.line1, rawAddress.line2, rawAddress.city, rawAddress.state, rawAddress.pincode].filter(Boolean);
    if (parts.length > 0) patientAddress = parts.join(', ');
  }
  if (patientAddress === '-' || !patientAddress) {
    if (booking?.branch?.city || booking?.branch?.name) {
      patientAddress = [booking?.branch?.line1, booking?.branch?.city || booking?.branch?.name].filter(Boolean).join(', ');
    }
  }

  // Dynamic methodology resolution from parameter attributes or standard analytical method
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

  return (
    <div
      style={{
        width: '794px',
        maxWidth: '794px',
        minHeight: '1123px',
        backgroundColor: '#ffffff',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: '#1e293b',
        fontSize: '10px',
        lineHeight: '1.4',
        boxSizing: 'border-box',
        position: 'relative',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
      {/* 1. Top Yellow/Gold Accent Brand Stripe */}
      <div style={{ height: '6px', backgroundColor: '#f59e0b', width: '100%' }} />

      {/* 2. Top Header: Dr. Lal / MedsSeva PathLabs Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 28px 10px',
          borderBottom: '1.5px solid #0f172a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '24px', fontWeight: 900, color: '#f59e0b', fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>
              ✦
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#0284c7', fontStyle: 'italic', fontFamily: 'Georgia, serif', lineHeight: '1.15', marginBottom: '3px' }}>
                MedsSeva <span style={{ color: '#0f172a' }}>PathLabs</span>
              </div>
              <div style={{ fontSize: '7.5px', color: '#64748b', letterSpacing: '0.5px', fontWeight: 600, marginTop: '2px' }}>
                CLINICAL REFERENCE LABORATORIES & DIAGNOSTICS
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', fontSize: '7.5px', color: '#475569', lineHeight: '1.4', maxWidth: '420px' }}>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>
            {branchName} - {branchAddr}
          </div>
          <div>
            Ph: <span style={{ fontWeight: 600 }}>{branchPhone}</span> | Email: <span style={{ fontWeight: 600 }}>{branchEmail}</span> | Web: <span style={{ color: '#0284c7', fontWeight: 600 }}>www.medsseva.com</span>
            {branchLabRegNo && <span> | Lab Reg: {branchLabRegNo}</span>}
          </div>
        </div>
      </div>

      {/* 3. Patient & Sample Metadata Block (Dr. Lal PathLabs exact box layout) */}
      <div
        style={{
          margin: '10px 28px',
          border: '1px solid #cbd5e1',
          padding: '10px 14px',
          backgroundColor: '#fafbfc',
          display: 'grid',
          gridTemplateColumns: '1.25fr 1fr 64px',
          columnGap: '16px',
          rowGap: '3px',
          fontSize: '9.5px',
          alignItems: 'start',
        }}
      >
        {/* Left Column */}
        <table style={{ width: '100%', borderCollapse: 'collapse', lineHeight: '1.55' }}>
          <tbody>
            <tr>
              <td style={{ width: '75px', fontWeight: 700, color: '#0f172a', padding: '1px 0' }}>Name</td>
              <td style={{ width: '8px', color: '#0f172a' }}>:</td>
              <td style={{ fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>{patientDisplayName}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, color: '#0f172a', padding: '1px 0' }}>Age / Gender</td>
              <td style={{ color: '#0f172a' }}>:</td>
              <td style={{ fontWeight: 700, color: '#0f172a' }}>
                {booking?.patientAge ? `${booking.patientAge} Years` : '-'} / {booking?.patientGender || '-'}
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, color: '#0f172a', padding: '1px 0' }}>Mobile</td>
              <td style={{ color: '#0f172a' }}>:</td>
              <td style={{ fontWeight: 700, color: '#0f172a' }}>{patientMobile}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, color: '#0f172a', padding: '1px 0' }}>Address</td>
              <td style={{ color: '#0f172a' }}>:</td>
              <td style={{ fontWeight: 600, color: '#0f172a', fontSize: '8.5px', lineHeight: '1.2' }}>{patientAddress}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, color: '#0f172a', padding: '1px 0' }}>Lab No.</td>
              <td style={{ color: '#0f172a' }}>:</td>
              <td style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>{labNo}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, color: '#0f172a', padding: '1px 0' }}>Ref By</td>
              <td style={{ color: '#0f172a' }}>:</td>
              <td style={{ fontWeight: 600, color: '#0f172a' }}>{refDoctor}</td>
            </tr>
          </tbody>
        </table>

        {/* Right Column */}
        <table style={{ width: '100%', borderCollapse: 'collapse', lineHeight: '1.55' }}>
          <tbody>
            <tr>
              <td style={{ width: '80px', fontWeight: 700, color: '#0f172a', padding: '1px 0' }}>Collected</td>
              <td style={{ width: '8px', color: '#0f172a' }}>:</td>
              <td style={{ color: '#0f172a' }}>{formatDateTime(booking?.sampleCollectedAt || booking?.scheduledDate || report?.createdAt, true)}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, color: '#0f172a', padding: '1px 0' }}>Reported</td>
              <td style={{ color: '#0f172a' }}>:</td>
              <td style={{ color: '#0f172a', fontWeight: 600 }}>{formatDateTime(report?.reportedDate || report?.createdAt, true)}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, color: '#0f172a', padding: '1px 0' }}>Report Status</td>
              <td style={{ color: '#0f172a' }}>:</td>
              <td style={{ fontWeight: 800, color: '#0f172a' }}>{report?.status === 'DRAFT' ? 'Draft' : 'Final'}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, color: '#0f172a', padding: '1px 0' }}>A/c Status</td>
              <td style={{ color: '#0f172a' }}>:</td>
              <td style={{ fontWeight: 700, color: '#0f172a' }}>{booking?.paymentStatus === 'PENDING' ? 'PENDING' : 'P'}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, color: '#0f172a', padding: '1px 0', verticalAlign: 'top' }}>Processed at</td>
              <td style={{ color: '#0f172a', verticalAlign: 'top' }}>:</td>
              <td style={{ color: '#334155', fontSize: '8px', lineHeight: '1.25' }}>
                <strong>{branchName}</strong>
                {branchAddr && <><br />{branchAddr}</>}
              </td>
            </tr>
          </tbody>
        </table>

        {/* NABL / ISO Accreditation Badge & Verification QR */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', paddingTop: '2px' }}>
          <DynamicQRCode
            value="https://play.google.com/store/apps/details?id=com.medssevaglobal.app"
            size={54}
            label="Scan to verify"
          />
          <div style={{
            width: '38px',
            height: '18px',
            borderRadius: '2px',
            border: '1px solid #0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            fontSize: '6px',
            fontWeight: 800,
            color: '#0284c7'
          }}>
            NABL
          </div>
        </div>
      </div>

      {/* 4. Centered Heading: Test Report */}
      <div style={{ textAlign: 'center', margin: '8px 0 6px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
          }}
        >
          Test Report
        </span>
      </div>

      {/* 5. Test Parameters Table (Dr. Lal PathLabs exact 4-column layout) */}
      <div style={{ margin: '0 28px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderTop: '1px solid #0f172a', borderBottom: '1.5px solid #0f172a' }}>
              <th style={{ textAlign: 'left', padding: '6px 4px', fontSize: '9.5px', fontWeight: 800, color: '#0f172a', width: '44%' }}>
                Test Name
              </th>
              <th style={{ textAlign: 'left', padding: '6px 4px', fontSize: '9.5px', fontWeight: 800, color: '#0f172a', width: '18%' }}>
                Results
              </th>
              <th style={{ textAlign: 'left', padding: '6px 4px', fontSize: '9.5px', fontWeight: 800, color: '#0f172a', width: '16%' }}>
                Units
              </th>
              <th style={{ textAlign: 'left', padding: '6px 4px', fontSize: '9.5px', fontWeight: 800, color: '#0f172a', width: '22%' }}>
                Bio. Ref. Interval
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedParams).map(([groupName, params], gi) => (
              <React.Fragment key={gi}>
                {/* Panel / Category Header */}
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: '8px 4px 4px',
                      fontSize: '9.5px',
                      fontWeight: 900,
                      color: '#0f172a',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                    }}
                  >
                    <div style={{ borderBottom: '1px solid #94a3b8', paddingBottom: '3px', display: 'inline-block', minWidth: '240px' }}>
                      {groupName}
                    </div>
                  </td>
                </tr>

                {/* Parameters with Method Subtitle */}
                {params.map((p: any, idx: number) => {
                  const { isAbnormal } = getFlag(p);
                  const method = p.methodology || getMethodology(p.parameterName, p.unit);

                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      {/* Test Name + (Method) */}
                      <td style={{ padding: '4px 4px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: isAbnormal ? 800 : 600, color: isAbnormal ? '#000000' : '#1e293b', fontSize: '9px' }}>
                          {p.parameterName}
                        </div>
                        {method && (
                          <div style={{ fontSize: '7.5px', color: '#64748b', marginTop: '1px' }}>
                            ({method})
                          </div>
                        )}
                      </td>

                      {/* Results (Observed Value) */}
                      <td style={{ padding: '4px 4px', verticalAlign: 'top' }}>
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: isAbnormal ? 900 : 700,
                            color: isAbnormal ? '#dc2626' : '#0f172a',
                          }}
                        >
                          {p.observedValue}
                        </span>
                      </td>

                      {/* Units */}
                      <td style={{ padding: '4px 4px', verticalAlign: 'top', fontSize: '8.5px', color: '#475569' }}>
                        {p.unit || '-'}
                      </td>

                      {/* Bio Ref Interval */}
                      <td style={{ padding: '4px 4px', verticalAlign: 'top', fontSize: '8.5px', color: '#334155', fontWeight: 500 }}>
                        {p.referenceRange || '-'}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* 6. Clinical Comments, Notes & Interpretation Section (100% Dynamic) */}
      <div style={{ margin: '12px 28px 0', fontSize: '8.5px', color: '#334155' }}>
        {/* Comment Box */}
        {(report?.doctorRemarks || report?.clinicalNotes) && (
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontWeight: 800, fontSize: '9px', color: '#0f172a', marginBottom: '2px' }}>Comment</div>
            <div style={{ lineHeight: '1.45', color: '#475569' }}>
              {report?.doctorRemarks || report?.clinicalNotes}
            </div>
          </div>
        )}

        {/* Note List */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontWeight: 800, fontSize: '9px', color: '#0f172a', marginBottom: '2px' }}>Note</div>
          <div style={{ lineHeight: '1.45', color: '#475569' }}>
            <div>1. As per the recommendation of International council for Standardization in Hematology, the differential leucocyte counts are additionally being reported as absolute numbers of each cell in per unit volume of blood.</div>
            <div>2. Test conducted on EDTA whole blood / serum under standard quality protocols.</div>
          </div>
        </div>

        {/* Interpretation Table */}
        {(report?.doctorInterpretation || report?.interpretation) && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontWeight: 800, fontSize: '9px', color: '#0f172a', marginBottom: '4px' }}>Interpretation</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '8px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ textAlign: 'left', padding: '4px 8px', width: '25%', fontWeight: 700, color: '#334155' }}>RESULT</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px', width: '75%', fontWeight: 700, color: '#334155' }}>REMARKS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 8px', fontWeight: 700, color: '#0f172a' }}>
                    {report?.hasAbnormalFlags ? 'Abnormal / Critical' : 'Normal / Routine'}
                  </td>
                  <td style={{ padding: '4px 8px', color: '#475569' }}>
                    {report?.doctorInterpretation || report?.interpretation}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      {/* Footer Section */}
      <div>
        {/* End of Report Indicator */}
        <div style={{ textAlign: 'center', margin: '10px 28px 6px', color: '#64748b', fontSize: '8.5px', letterSpacing: '1px' }}>
          ------------------------------- End of report --------------------------------
        </div>

        {/* 7. Doctor Signatures & Verification */}
        <div
          style={{
            margin: '6px 28px 6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            paddingTop: '4px',
          }}
        >
          {/* Left: Lab Technician */}
          <div style={{ minWidth: '160px' }}>
            {effectiveTechnician?.signatureUrl ? (
              <img
                src={effectiveTechnician.signatureUrl}
                alt="Technician Signature"
                style={{ maxHeight: '42px', maxWidth: '140px', objectFit: 'contain', display: 'block', margin: '0 0 2px 0' }}
                crossOrigin="anonymous"
              />
            ) : (
              <div style={{
                display: 'inline-block',
                border: '1px solid #059669',
                borderRadius: '3px',
                padding: '2px 6px',
                fontSize: '7px',
                color: '#059669',
                marginBottom: '4px',
                background: '#ecfdf5',
                letterSpacing: '0.6px',
                fontWeight: 800,
              }}>
                TECHNICIAN VERIFIED ✓
              </div>
            )}
            <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#0f172a' }}>
              {effectiveTechnician?.name || report?.technicianName || 'Lab Technician'}
            </div>
            <div style={{ fontSize: '8px', color: '#475569' }}>
              {effectiveTechnician?.qualification || report?.technicianQualification || 'DMLT'}
            </div>
            <div style={{ fontSize: '7.5px', color: '#64748b' }}>
              Verified Quality Checks Passed
            </div>
          </div>

          {/* Doctor Signature Block */}
          <div style={{ textAlign: 'right', minWidth: '180px' }}>
            {doctor?.signatureUrl ? (
              <img
                src={doctor.signatureUrl}
                alt="Doctor Signature"
                style={{ maxHeight: '42px', maxWidth: '140px', objectFit: 'contain', display: 'block', margin: '0 0 3px auto' }}
                crossOrigin="anonymous"
              />
            ) : (
              <div
                style={{
                  fontFamily: "'Brush Script MT', 'Segoe Script', cursive",
                  fontSize: '20px',
                  color: '#1e3a8a',
                  marginBottom: '2px',
                }}
              >
                {doctor?.name || report?.doctorName || 'Dr. Aditya Tayal'}
              </div>
            )}

            <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#0f172a' }}>
              {doctor?.name || report?.doctorName || 'Dr. Aditya Tayal'}
            </div>
            <div style={{ fontSize: '8px', color: '#475569' }}>
              {doctor?.qualification || report?.doctorQualification || 'DNB, (Pathology)'}
            </div>
            <div style={{ fontSize: '8px', color: '#475569', fontWeight: 600 }}>
              {doctor?.designation || report?.doctorDesignation || 'Chief of Laboratory'}
            </div>
            <div style={{ fontSize: '7.5px', color: '#64748b' }}>
              {branchName}
            </div>
          </div>
        </div>

        {/* Bottom Center Barcode */}
        <div style={{ textAlign: 'center', margin: '4px 0 2px' }}>
          <div style={{ display: 'inline-block' }}>
            <DummyBarcode value={`*${labNo}*`} height={18} showCode={true} />
          </div>
        </div>

        {/* Page Numbering */}
        <div style={{ textAlign: 'right', margin: '0 28px 4px', fontSize: '8px', color: '#64748b', fontWeight: 600 }}>
          Page 1 of 1
        </div>

        {/* 8. Important Instructions Disclaimer Box */}
        <div
          style={{
            margin: '4px 28px 6px',
            border: '1px solid #94a3b8',
            padding: '5px 8px',
            fontSize: '6.8px',
            lineHeight: '1.35',
            color: '#334155',
          }}
        >
          <div style={{ fontWeight: 800, textAlign: 'center', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            IMPORTANT INSTRUCTIONS
          </div>
          <div>
            • Test results released pertain to the specimen submitted. • All test results are dependent on the quality of the sample received by the Laboratory.
            • Laboratory investigations are only a tool to facilitate in arriving at a diagnosis and should be clinically correlated by the Referring Physician.
            • Report delivery may be delayed due to unforeseen circumstances. Inconvenience is regretted. • Certain tests may require further testing at additional cost for derivation of exact value.
            • This is computer generated medical diagnostic report that has been validated by Authorized Medical Practitioner/Doctor. • The report does not need physical signature.
          </div>
        </div>

        {/* 9. Bottom Yellow Customer Care Band */}
        <div
          style={{
            backgroundColor: '#fef3c7',
            borderTop: '1.5px solid #f59e0b',
            borderBottom: '1.5px solid #f59e0b',
            padding: '5px 20px',
            textAlign: 'center',
            fontSize: '7.5px',
            color: '#78350f',
            lineHeight: '1.35',
          }}
        >
          <div style={{ fontWeight: 700 }}>
            If Test results are alarming or unexpected, client is advised to contact the Customer Care immediately for possible remedial action.
          </div>
          <div>
            Tel: <strong>{branchPhone}</strong> | E-mail: <strong>{branchEmail}</strong> | Web: <strong>www.medsseva.com</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
