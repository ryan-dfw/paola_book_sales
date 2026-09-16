// The cover mockup is static regardless of language, same as the original —
// only the details below it (title/byline/blurb) are localized.
export function BookCover() {
  return (
    <section className="cover-wrap">
      <div className="cover" aria-hidden="true">
        <span className="cover-eyebrow">A MEMOIR</span>
        <span className="cover-rule" />
        <span className="cover-title">
          The Narcissist
          <br />
          Love of My Life
        </span>
        <span className="cover-author">Paola Roman</span>
      </div>
    </section>
  );
}
