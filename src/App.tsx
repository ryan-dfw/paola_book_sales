import { useEffect } from 'react';

import { CONTENT } from './content';
import { formatMoney } from './utils/formatMoney';

import { useProducts } from './hooks/useProducts';
import { useProductSelection } from './hooks/useProductSelection';
import { useBanner } from './hooks/useBanner';
import { useReturnBanner } from './hooks/useReturnBanner';
import { useCheckout } from './hooks/useCheckout';
import { useManualPayment } from './hooks/useManualPayment';

import { Banner } from './components/Banner';
import { Header } from './components/Header';
import { BookCover } from './components/BookCover';
import { EditionToggle } from './components/EditionToggle';
import { SignedToggle } from './components/SignedToggle';
import { PriceDisplay } from './components/PriceDisplay';
import { BuyButton } from './components/BuyButton';
import { AltPaymentToggle } from './components/AltPaymentToggle';
import { ManualPaymentPanel } from './components/ManualPaymentPanel';
import { Footer } from './components/Footer';

export function App() {
  const products = useProducts();
  const { edition, setEdition, signed, setSigned } = useProductSelection();
  const { banner, showBanner } = useBanner();
  useReturnBanner(showBanner);
  const { startCheckout, isRedirecting } = useCheckout(showBanner);

  const lang = edition === 'espanol' ? 'es' : 'en';
  const content = CONTENT[lang];

  // Map the three-way edition choice straight onto a Stripe product via its
  // lang/format metadata — 'hardcover'/'english' pick a format within
  // English, 'espanol' just needs the Spanish product (only one format
  // exists there). Falls back to matching on lang alone if a product isn't
  // tagged with a format yet, so a still-being-set-up product doesn't just
  // disappear from the page.
  const targetFormat = edition === 'hardcover' ? 'hardcover' : edition === 'english' ? 'softcover' : null;
  const product =
    products?.find((p) => p.lang === lang && (targetFormat ? p.format === targetFormat : true)) ??
    products?.find((p) => p.lang === lang) ??
    null;

  const manual = useManualPayment(product?.id ?? null, signed);

  useEffect(() => {
    document.title = `${content.title} — a memoir`;
  }, [content.title]);

  const priceFormatted = product ? formatMoney(product.amount, product.currency) : '…';
  const buyLabel = isRedirecting ? 'One moment…' : content.buyPrefix;
  const buyDisabled = !product || isRedirecting;

  const manualMessage = manual.result
    ? content.resultTemplate(
        formatMoney(manual.result.amount, manual.result.currency),
        manual.result.method,
        manual.result.handle,
        manual.result.referenceCode
      )
    : manual.error;

  return (
    <>
      <Banner banner={banner} />
      <Header />

      <main className="layout">
        <BookCover
          title={content.title}
          image={product?.image ?? null}
          lang={product?.lang ?? lang}
          format={product?.format ?? targetFormat ?? 'softcover'}
          weightOz={product?.weightOz ?? null}
        />

        <section className="details">
          <h1>{content.title}</h1>
          <p className="byline">{content.byline}</p>

          <EditionToggle edition={edition} onChange={setEdition} />

          <p className="blurb">{product?.description ?? ''}</p>

          <SignedToggle label={content.signedLabel} checked={signed} onChange={setSigned} />
          <PriceDisplay formatted={priceFormatted} />
          <BuyButton
            label={buyLabel}
            disabled={buyDisabled}
            onClick={() => product && startCheckout(product.id, signed)}
          />
          {/* TEMP DEBUG LABEL — delete this <p> and the ".debug-label" rule
              in src/styles/product.css to remove. Plain text, not a design
              element — doesn't touch the button or block clicks. */}
          <p className="debug-label" aria-hidden="true">DEBUG: CHECKOUT NOT TESTED — DO NOT USE</p>

          <div className="alt-payment">
            <AltPaymentToggle
              label={manual.isOpen ? content.altToggleClose : content.altToggle}
              onClick={manual.toggle}
            />

            {manual.isOpen && (
              <ManualPaymentPanel
                intro={content.manualIntro}
                methodLabels={content.manualMethodLabels}
                method={manual.method}
                onMethodChange={manual.setMethod}
                loading={manual.loading}
                message={manualMessage}
              />
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
