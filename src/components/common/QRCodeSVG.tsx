import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeSVGProps {
  value: string;
  size?: number;
  className?: string;
  logoUrl?: string;
  tableNumber?: number;
  showCenterBadge?: boolean;
  fgColor?: string;
  bgColor?: string;
}

export const QRCodeSVG: React.FC<QRCodeSVGProps> = ({
  value,
  size = 200,
  className = '',
  tableNumber,
  showCenterBadge = false,
  fgColor = '#000000',
  bgColor = '#ffffff',
}) => {
  const [svgString, setSvgString] = useState<string>('');

  useEffect(() => {
    QRCode.toString(value, {
      type: 'svg',
      width: size,
      margin: 2,
      color: {
        dark: fgColor,
        light: bgColor,
      },
      errorCorrectionLevel: 'Q',
    })
      .then((svg) => {
        setSvgString(svg);
      })
      .catch((err) => {
        console.error('Failed to generate QR code SVG', err);
      });
  }, [value, size, fgColor, bgColor]);

  if (!svgString) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-stone-100 dark:bg-stone-800 rounded-xl animate-pulse ${className}`}
      >
        <span className="text-xs text-stone-400">Loading QR...</span>
      </div>
    );
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center p-2 bg-white rounded-2xl shadow-sm border border-stone-200/80 dark:border-stone-700 ${className}`}
      style={{ width: size + 16, height: size + 16 }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: svgString }}
        className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
      />
      {showCenterBadge && tableNumber !== undefined && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-7 h-7 rounded-full bg-orange-600 text-white font-bold text-[10px] flex flex-col items-center justify-center shadow-md border border-white">
            <span className="text-[7px] uppercase tracking-tighter leading-none">T</span>
            <span className="text-[11px] font-black leading-none">{tableNumber}</span>
          </div>
        </div>
      )}
    </div>
  );
};
