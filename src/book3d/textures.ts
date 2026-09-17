import { CanvasTexture, SRGBColorSpace, type WebGLRenderer } from 'three';
import type { BookSpec } from './specs';

function loadImage(url: string, crossOrigin: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });
}

/**
 * The full [back | spine | front] wrap as one texture. The front panel is
 * swapped for the product's live Stripe image when that image is a plain,
 * flat cover (right aspect ratio) and the host allows cross-origin use in
 * WebGL — so a cover change made in Stripe still shows up on the 3D book.
 * Otherwise the printed wrap's own front is used as-is.
 */
export async function loadWrapTexture(spec: BookSpec, frontImage: string | null, renderer: WebGLRenderer) {
  const wrap = await loadImage(spec.wrap.url, false);
  const canvas = document.createElement('canvas');
  canvas.width = wrap.naturalWidth;
  canvas.height = wrap.naturalHeight;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('2D canvas unavailable');
  g.drawImage(wrap, 0, 0);

  if (frontImage) {
    try {
      const img = await loadImage(frontImage, true);
      const fx = Math.round(spec.wrap.spineEnd * canvas.width);
      const fw = canvas.width - fx;
      const fh = canvas.height;
      const want = fw / fh;
      const have = img.naturalWidth / img.naturalHeight;
      if (Math.abs(have / want - 1) < 0.07) {
        // cover-fit into the front panel
        const scale = Math.max(fw / img.naturalWidth, fh / img.naturalHeight);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        g.save();
        g.beginPath();
        g.rect(fx, 0, fw, fh);
        g.clip();
        g.drawImage(img, fx + (fw - dw) / 2, (fh - dh) / 2, dw, dh);
        g.restore();
        g.getImageData(0, 0, 1, 1); // throws now if the canvas got tainted
      }
    } catch {
      g.drawImage(wrap, 0, 0); // fall back to the printed front
    }
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}
