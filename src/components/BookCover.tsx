interface BookCoverProps {
  title: string;
  image: string | null;
}

/**
 * Shows the selected product's Stripe image when it has one, inside a
 * "book" frame (rotation, drop shadow, and a stripe of page-edges peeking
 * out the side) so it reads as a physical book even when the art itself is
 * a dark cover against this site's dark background. Falls back to the
 * original CSS mockup cover when a product has no image uploaded yet.
 * The frame constrains every cover to the same size/aspect ratio
 * regardless of how each image was originally cropped — Stripe images
 * differ slightly since they're just different crops from the same art,
 * and object-fit: cover (in cover.css) absorbs that without distorting.
 */
export function BookCover({ title, image }: BookCoverProps) {
  return (
    <section className="cover-wrap">
      <div className="cover-frame">
        {image ? (
          <img className="cover-image" src={image} alt={title ? `Cover of ${title}` : 'Book cover'} />
        ) : (
          <div className="cover" aria-hidden="true">
            <span className="cover-eyebrow">A MEMOIR</span>
            <span className="cover-rule" />
            <span className="cover-title">{title}</span>
            <span className="cover-author">Paola Roman</span>
          </div>
        )}
      </div>
    </section>
  );
}
