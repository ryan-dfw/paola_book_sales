import { useEffect, useState } from 'react';

interface BookCoverProps {
  title: string;
  image: string | null;
}

// A plain simultaneous crossfade, not a brightness-boosting "additive"
// dissolve and not a sequential fade-out-then-in (which just strobes). See
// the docstring below for the reasoning.
const FADE_MS = 260;

function CoverArt({ title, image }: BookCoverProps) {
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
export function BookCover({ title, image }: BookCoverProps) {
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
    <section className="cover-wrap">
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
    </section>
  );
}
