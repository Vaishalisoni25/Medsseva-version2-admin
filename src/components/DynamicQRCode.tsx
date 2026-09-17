import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export const MEDSSEVA_PLAYSTORE_URL = 'https://play.google.com/store/apps/details?id=com.medssevaglobal.app';

interface DynamicQRCodeProps {
  value?: string;
  size?: number;
  label?: string;
  className?: string;
}

export const DynamicQRCode: React.FC<DynamicQRCodeProps> = ({
  value = MEDSSEVA_PLAYSTORE_URL,
  size = 58,
  label = 'SCAN TO VERIFY',
  className = '',
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const qrValue = value || MEDSSEVA_PLAYSTORE_URL;

  useEffect(() => {
    let isMounted = true;
    if (!qrValue) return;

    QRCode.toDataURL(qrValue, {
      margin: 2,
      width: Math.max(300, size * 4),
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) setDataUrl(url);
      })
      .catch((err) => {
        console.error('[DynamicQRCode] Generation error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [qrValue, size]);

  return (
    <div
      className={className}
      onClick={() => {
        if (qrValue && (qrValue.startsWith('http://') || qrValue.startsWith('https://'))) {
          window.open(qrValue, '_blank', 'noopener,noreferrer');
        }
      }}
      title={qrValue ? `Scan or click to open: ${qrValue}` : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '3px',
        cursor: 'pointer',
      }}
    >
      {dataUrl ? (
        <div
          style={{
            padding: '2px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '2px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={dataUrl}
            alt="MedsSeva App QR Code"
            width={size}
            height={size}
            style={{
              display: 'block',
              width: `${size}px`,
              height: `${size}px`,
              imageRendering: 'pixelated',
            }}
          />
        </div>
      ) : (
        <div
          style={{
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '2px',
          }}
        />
      )}
      {label && (
        <div
          style={{
            fontSize: '7px',
            color: '#475569',
            fontWeight: 700,
            textAlign: 'center',
            letterSpacing: '0.3px',
            lineHeight: '1.1',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};

export default DynamicQRCode;
