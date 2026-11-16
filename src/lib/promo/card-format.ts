export type CardFormat = 'business' | 'digital';
export type CardSide = 'front' | 'back';
export const QR_DESTINATION = 'https://move-spot.com';
export function cardDimensions(format: CardFormat) {
  return format === 'business'
    ? { width: Math.round(85 / 25.4 * 300), height: Math.round(55 / 25.4 * 300), pdfWidth: 85 / 25.4 * 72, pdfHeight: 55 / 25.4 * 72 }
    : { width: 1080, height: 1080, pdfWidth: 1080 * 72 / 300, pdfHeight: 1080 * 72 / 300 };
}