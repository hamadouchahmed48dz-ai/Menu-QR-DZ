import QRCode from 'qrcode';

export interface QRCodeCardData {
  restaurantName: string;
  tableNumber: number;
  url: string;
}

/**
 * Generates a high-resolution PNG data URL for a given URL using the qrcode library.
 */
export async function generateQRPngDataUrl(url: string, size = 600): Promise<string> {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 2,
    color: {
      dark: '#1c1917',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
}

/**
 * Downloads a complete high-resolution stand card as a PNG image using an HTML5 Canvas.
 */
export async function downloadTableQRPng(data: QRCodeCardData): Promise<void> {
  const qrDataUrl = await generateQRPngDataUrl(data.url, 700);

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer Decorative Border
  ctx.strokeStyle = '#e7e5e4';
  ctx.lineWidth = 12;
  ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

  // Top Accent Bar
  ctx.fillStyle = '#FF5A1F';
  ctx.fillRect(40, 40, canvas.width - 80, 24);

  // Restaurant Name
  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 64px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(data.restaurantName, canvas.width / 2, 220);

  // Subtitle / Prompt
  ctx.fillStyle = '#78716c';
  ctx.font = '500 36px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('DIGITAL MENU & INSTANT ORDERING', canvas.width / 2, 280);

  // Draw QR Image
  const qrImg = new Image();
  qrImg.src = qrDataUrl;
  await new Promise((resolve) => {
    qrImg.onload = resolve;
  });

  const qrSize = 720;
  const qrX = (canvas.width - qrSize) / 2;
  const qrY = 360;

  // QR Container Card
  ctx.fillStyle = '#fafaf9';
  ctx.strokeStyle = '#e7e5e4';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 32);
  ctx.fill();
  ctx.stroke();

  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // Table Badge
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.roundRect((canvas.width - 440) / 2, 1180, 440, 110, 28);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 48px monospace';
  ctx.fillText(`TABLE ${data.tableNumber}`, canvas.width / 2, 1255);

  // Instructions
  ctx.fillStyle = '#44403c';
  ctx.font = '600 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Point your phone camera to browse & order', canvas.width / 2, 1370);

  ctx.fillStyle = '#a8a29e';
  ctx.font = '400 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Powered by MenuQR — Instant Table Service', canvas.width / 2, 1480);

  // Trigger Download
  const link = document.createElement('a');
  link.download = `MenuQR-Table-${data.tableNumber}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
