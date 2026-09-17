import { lazy, Suspense, useEffect, useState } from 'react';

const Book3D = lazy(() => import('./Book3D'));

interface BookCoverProps {
  title: string;
  image: string | null;
  /** From the Stripe product's metadata (falls back to the edition picker). */
  lang: string | null;
  format: string | null;
  /** Stripe package weight, if set — makes a heavier book coast longer. */
  weightOz: number | null;
}

interface FlatCoverProps {
  title: string;
  image: string | null;
}

// A plain simultaneous crossfade, not a brightness-boosting "additive"
// dissolve and not a sequential fade-out-then-in (which just strobes). See
// the docstring below for the reasoning.
const FADE_MS = 260;

function CoverArt({ title, image }: FlatCoverProps) {
  return image ? (
    <img className="cover-image" src={image} alt={title ? `Cover of ${title}` : 'Book cover'} />
  ) : (
    // No image yet (products still loading, or a matched product has none) —
    // a plain shimmering placeholder rather than a fake book mockup. It's a
    // plain child of .cover-frame, so it inherits that frame's tilt/rotation
    // for free, same as the real cover art does.
    <div className="cover-skeleton" aria-hidden="true" />
  );
}

/**
 * The flat cover: shown while the 3D book is still loading, and as the
 * permanent fallback where WebGL isn't available.
 *
 * Shows the selected product's Stripe image when it has one, inside a
 * "book" frame (rotation, drop shadow, and a stripe of page-edges peeking
 * out the side) so it reads as a physical book even when the art itself is
 * a dark cover against this site's dark background. Falls back to a
 * shimmering skeleton placeholder while there's no image yet — before the
 * product list has loaded, or if a matched product has none.
 *
 * Switching editions (e.g. Español <-> English) swaps to a different cover
 * image. Rather than a hard cut, or fading the old one all the way out
 * before bringing the new one in (which reads as a strobe/blackout), this
 * layers the new cover on top of the old one and fades only the new
 * layer's opacity in — the old cover stays put underneath the whole time.
 * That's a plain overlap dissolve, like Premiere's "Film Dissolve": the two
 * images cross-blend smoothly with no gap. It's deliberately not an
 * "Additive Dissolve" either — that combines the two images' brightness on
 * top of each other, producing a flash/pop mid-transition, which is its
 * own kind of distracting.
 */
function FlatCover({ title, image }: FlatCoverProps) {
  const [current, setCurrent] = useState(image);
  const [incoming, setIncoming] = useState<{ image: string | null; entered: boolean } | null>(null);

  useEffect(() => {
    if (image === current) return undefined;

    setIncoming({ image, entered: false });

    // Wait a couple of paints before flipping to opacity 1, so the browser
    // actually has something to transition from — flipping in the same
    // tick the layer mounts would just render it already-visible.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setIncoming((inc) => (inc ? { ...inc, entered: true } : inc)));
    });

    const timeout = setTimeout(() => {
      setCurrent(image);
      setIncoming(null);
    }, FADE_MS + 40);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timeout);
    };
  }, [image, current]);

  return (
    <div className="cover-frame">
      <div className="cover-layer">
        <CoverArt title={title} image={current} />
      </div>
      {incoming && (
        <div className={`cover-layer cover-layer-incoming${incoming.entered ? ' is-in' : ''}`}>
          <CoverArt title={title} image={incoming.image} />
        </div>
      )}
    </div>
  );
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

/**
 * The book on the product page: a real 3D model you can turn, fling, and
 * watch tumble (see src/book3d), with the flat cover standing in until the
 * model's first frame is drawn — or for good, if WebGL isn't available.
 */
export function BookCover({ title, image, lang, format, weightOz }: BookCoverProps) {
  const [supported] = useState(hasWebGL);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const use3D = supported && !failed;

  if (!use3D) {
    return (
      <section className="cover-wrap">
        <FlatCover title={title} image={image} />
      </section>
    );
  }

  return (
    <section className="cover-wrap">
      <div className={`book3d-stage${ready ? ' is-ready' : ''}`}>
        <div className="book3d-fallback" aria-hidden={ready}>
          <FlatCover title={title} image={image} />
        </div>
        <Suspense fallback={null}>
          <Book3D
            title={title}
            lang={lang}
            format={format}
            weightOz={weightOz}
            frontImage={image}
            onReady={() => setReady(true)}
            onFail={() => setFailed(true)}
          />
        </Suspense>
      </div>
    </section>
  );
}
