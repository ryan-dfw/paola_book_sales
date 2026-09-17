// Physical specs for the 3D book model.
//
// Everything customer-facing (name, blurb, price, front-cover image, format,
// language) still comes live from Stripe. What Stripe *doesn't* have is the
// full print wrap (back cover + spine) or the trim size, so those are
// measured once from the printer-ready cover PDFs in res/img/covers/ and
// baked in here:
//
//   nloml_eng.pdf  back 422.25pt | spine 49.50pt | front 422.25pt, 683.76pt tall
//   nloml_es.pdf   back 370.90pt | spine 33.40pt | front 370.90pt, 594.00pt tall
//
// minus the standard 0.125" bleed on the outer edges. src/assets/book3d/
// wrap-*.webp are those same PDFs rendered at 160dpi with the bleed trimmed,
// so each texture is exactly [back | spine | front] edge to edge.

import wrapEn from '../assets/book3d/wrap-en.webp';
import wrapEs from '../assets/book3d/wrap-es.webp';

export type BookFormat = 'softcover' | 'hardcover';

export interface WrapArt {
  url: string;
  /** Where the back cover ends / the front cover starts, as a 0..1 fraction of the wrap's width. */
  spineStart: number;
  spineEnd: number;
}

export interface BookSpec {
  format: BookFormat;
  /**
   * How much to scale the model for display. Editions are different real
   * sizes (the Spanish one is a 5×8, the English a 5.74×9.25), and showing
   * that faithfully made the Spanish edition look like the lesser product —
   * so every edition is presented at the same height instead. A hardcover
   * still reads slightly larger, because its boards really do overhang.
   */
  displayScale: number;
  /** Trim size of the text block, inches. */
  width: number;
  height: number;
  /** Total thickness across the spine, inches (what the printer's spine width is). */
  thickness: number;
  /** Mass in kg — from Stripe's package weight when set, otherwise estimated from paper density. */
  mass: number;
  wrap: WrapArt;
}

const WRAPS: Record<'en' | 'es', { art: WrapArt; width: number; height: number; thickness: number }> = {
  en: {
    art: { url: wrapEn, spineStart: 918.33 / 1946.67, spineEnd: 1028.33 / 1946.67 },
    width: 5.74,
    height: 9.25,
    thickness: 0.6875,
  },
  es: {
    art: { url: wrapEs, spineStart: 804.22 / 1682.67, spineEnd: 878.44 / 1682.67 },
    width: 5.026,
    height: 8.0,
    thickness: 0.464,
  },
};

/** Every edition is drawn at this trim height, in inches (the English trim). */
const DISPLAY_HEIGHT = 9.25;

const IN = 0.0254; // metres per inch
const PAPER_DENSITY = 720; // kg/m³ — typical uncoated book stock, pressed into a block
const BOARD_DENSITY = 800; // kg/m³ — greyboard + case wrap

/** Hardcover case construction, inches. */
export const HARDCOVER = {
  board: 0.095, // board thickness
  overhang: 0.125, // "squares": how far the boards stick out past the pages
  joint: 0.3, // width of the hinge groove between board and spine
  spineBulge: 0.16, // how far the rounded spine bows outward
} as const;

/** Softcover construction, inches. */
export const SOFTCOVER = {
  cover: 0.014, // 10pt cover stock
  hinge: 0.3, // score line where the cover flexes, measured from the spine
} as const;

export function bookSpec(lang: string | null, format: string | null, weightOz: number | null): BookSpec {
  const wrap = lang === 'es' ? WRAPS.es : WRAPS.en;
  const fmt: BookFormat = format === 'hardcover' ? 'hardcover' : 'softcover';

  let mass: number;
  if (weightOz && weightOz > 0) {
    mass = weightOz * 0.0283495;
  } else {
    const blockT = fmt === 'hardcover' ? wrap.thickness - 2 * HARDCOVER.board : wrap.thickness;
    mass = wrap.width * wrap.height * blockT * IN ** 3 * PAPER_DENSITY;
    if (fmt === 'hardcover') {
      const bw = wrap.width + HARDCOVER.overhang;
      const bh = wrap.height + 2 * HARDCOVER.overhang;
      mass += 2 * bw * bh * HARDCOVER.board * IN ** 3 * BOARD_DENSITY;
    }
  }

  return {
    format: fmt,
    // Physics works in real inches and real kilograms — only the drawing is
    // scaled, so a smaller book still behaves like a smaller book.
    displayScale: DISPLAY_HEIGHT / wrap.height,
    width: wrap.width,
    height: wrap.height,
    thickness: wrap.thickness,
    mass,
    wrap: wrap.art,
  };
}
