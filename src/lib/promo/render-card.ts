import QRCode from 'qrcode';
import logo from '@/assets/movespot-logo.png.asset.json';
import { cardDimensions, QR_DESTINATION, type CardFormat, type CardSide } from './card-format';

export interface CardDetails { name: string; role: string; phone: string; email: string; website: string; tagline: string }
export interface CardPalette { dark: string; orange: string; white: string; muted: string }

function wrapped(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, size: number, lines: number, family = 'Space Grotesk', weight = 700) {
  ctx.font = `${weight} ${size}px "${family}"`;
  const words = text.trim().split(/\s+/);
  const rows: string[] = [];
  let line = '';
  for (const word of words) {
    if (ctx.measureText(`${line} ${word}`.trim()).width > width && line) { rows.push(line); line = word; }
    else line = `${line} ${word}`.trim();
  }
  if (line) rows.push(line);
  let actualSize = size;
  while ((rows.length > lines || rows.some(row => ctx.measureText(row).width > width)) && actualSize > 12) {
    return wrapped(ctx, text, x, y, width, size - 1, lines, family, weight);
  }
  rows.slice(0, lines).forEach((row, index) => ctx.fillText(row, x, y + index * actualSize * 1.25));
}

async function loadImage(src: string) {
  const image = new Image(); image.crossOrigin = 'anonymous'; image.src = src; await image.decode(); return image;
}

export async function renderCard(details: CardDetails, format: CardFormat, side: CardSide, palette: CardPalette) {
  await Promise.all([document.fonts.load('700 48px "Space Grotesk"'), document.fonts.load('400 24px "Inter"')]);
  const size = cardDimensions(format);
  const canvas = document.createElement('canvas'); canvas.width = size.width; canvas.height = size.height;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Impossible de préparer la carte.');
  const [brand, qr] = await Promise.all([loadImage(logo.url), QRCode.toDataURL(QR_DESTINATION, { width: 400, margin: 4, errorCorrectionLevel: 'H', color: { dark: palette.dark, light: palette.white } }).then(loadImage)]);
  const digital = format === 'digital';
  const w = size.width, h = size.height, pad = 64;
  ctx.fillStyle = palette.dark; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = palette.orange; ctx.fillRect(0, 0, 12, h);
  // Road-inspired parallel strokes, outside the content safe area.
  ctx.strokeStyle = palette.orange; ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(w - 210 + i * 30, 0); ctx.lineTo(w, 200 - i * 30); ctx.stroke(); }
  const logoWidth = digital ? 180 : 158;
  const logoHeight = logoWidth * brand.naturalHeight / brand.naturalWidth;
  ctx.fillStyle = palette.white; ctx.fillRect(pad, pad, logoWidth + 36, logoHeight + 28);
  ctx.drawImage(brand, pad + 18, pad + 14, logoWidth, logoHeight);
  ctx.textBaseline = 'top';
  if (side === 'back' && !digital) {
    ctx.fillStyle = palette.orange;
    wrapped(ctx, details.tagline, 340, 88, w - 404, 46, 3);
    ctx.drawImage(qr, 350, h - 278, 190, 190);
    ctx.fillStyle = palette.white; wrapped(ctx, details.website, 572, h - 242, w - 628, 26, 2, 'Inter', 600);
    ctx.fillStyle = palette.muted; wrapped(ctx, details.email, 572, h - 150, w - 628, 20, 2, 'Inter', 400);
  } else if (digital) {
    ctx.fillStyle = palette.orange; wrapped(ctx, details.tagline, pad, 380, w - pad * 2, 70, 3);
    ctx.fillStyle = palette.white; wrapped(ctx, details.name, pad, 690, 700, 38, 2);
    ctx.fillStyle = palette.muted; wrapped(ctx, details.role, pad, 790, 650, 24, 2, 'Inter', 400);
    ctx.fillStyle = palette.white;
    [details.phone, details.email, details.website].filter(Boolean).forEach((text, i) => wrapped(ctx, text, pad, 898 + i * 36, 650, 23, 1, 'Inter', 400));
    ctx.drawImage(qr, w - 260, h - 260, 196, 196);
  } else {
    const x = 330;
    ctx.fillStyle = palette.white; wrapped(ctx, details.name || 'MoveSpot', x, 85, w - x - pad, 48, 2);
    ctx.fillStyle = palette.orange; wrapped(ctx, details.role, x, 218, w - x - pad, 26, 2, 'Inter', 600);
    ctx.fillStyle = palette.muted; wrapped(ctx, details.tagline, x, 302, w - x - pad, 29, 2);
    ctx.fillStyle = palette.white;
    [details.phone, details.email, details.website].filter(Boolean).forEach((text, i) => wrapped(ctx, text, x, 434 + i * 43, w - x - pad, 25, 1, 'Inter', 400));
    ctx.drawImage(qr, pad, h - 224, 160, 160);
  }
  ctx.fillStyle = palette.orange; ctx.fillRect(pad, h - 30, w - pad * 2, 3);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Export PNG indisponible.')), 'image/png'));
  return { blob, dataUrl: canvas.toDataURL('image/png') };
}

export async function createCardPdf(front: Blob, back: Blob | undefined, format: CardFormat) {
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  pdf.setTitle('MoveSpot — Carte personnalisée');
  const size = cardDimensions(format);
  for (const blob of [front, back].filter((item): item is Blob => Boolean(item))) {
    const image = await pdf.embedPng(await blob.arrayBuffer());
    pdf.addPage([size.pdfWidth, size.pdfHeight]).drawImage(image, { x: 0, y: 0, width: size.pdfWidth, height: size.pdfHeight });
  }
  return new Blob([new Uint8Array(await pdf.save())], { type: 'application/pdf' });
}

export function downloadCard(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}