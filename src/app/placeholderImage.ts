/**
 * Prototype: there are no real screenshots, so Copy image and Save make a grey 960×540 PNG with the caption (D90).
 * The real app copies or saves the stored screenshot instead.
 */
export function placeholderPng(caption: string): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#F6F7F9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#5B6370';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(caption, canvas.width / 2, canvas.height / 2);
  }
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't make the image."))), 'image/png'));
}
