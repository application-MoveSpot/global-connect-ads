import { it } from 'node:test';
import assert from 'node:assert/strict';
import { cardDimensions, QR_DESTINATION } from '../card-format.ts';
import { isCardStudioPreview } from '../preview-access.ts';

it('business card is 85 × 55 mm at 300 dpi', () => {
  const size = cardDimensions('business');
  assert.equal(size.width, 1004); assert.equal(size.height, 650);
  assert.equal(size.pdfWidth / 72 * 25.4, 85);
  assert.equal(size.pdfHeight / 72 * 25.4, 55);
});
it('digital card is exactly 1080 × 1080 pixels', () => {
  assert.equal(cardDimensions('digital').width, 1080);
  assert.equal(cardDimensions('digital').height, 1080);
});
it('QR always targets the official HTTPS site', () => assert.equal(QR_DESTINATION, 'https://move-spot.com'));
it('published sites cannot open the internal studio', () => {
  for (const host of ['move-spot.com', 'move-spot.lovable.app', 'id-preview--abc.evil.com', 'move-spot.com.evil.com', 'project--6602bfc2-6e2e-40ba-b6c6-422637ac09e4.lovable.app']) assert.equal(isCardStudioPreview(host), false, host);
});
it('main, numbered and commit previews can open the studio', () => {
  for (const host of ['localhost', 'id-preview--6602bfc2-6e2e-40ba-b6c6-422637ac09e4.lovable.app', 'id-preview-6--abc.lovable.app', 'id-preview-a123--abc.lovable.app']) assert.equal(isCardStudioPreview(host), true, host);
});