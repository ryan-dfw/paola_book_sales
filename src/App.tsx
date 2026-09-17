import { useEffect, useMemo } from 'react';

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
import { LangToggle } from './components/LangToggle';
import { FormatToggle } from './components/FormatToggle';
import { SignedToggle } from './components/SignedToggle';
import { PriceDisplay } from './components/PriceDisplay';
import { BuyButton } from './components/BuyButton';
import { AltPaymentToggle } from './components/AltPaymentToggle';
import { ManualPaymentPanel } from './components/ManualPaymentPanel';
import { Footer } from './components/Footer';

export function App() {
  const products = useProducts();
  const { lang, setLang, format, setFormat, signed, setSigned } = useProductSelection();
  const { banner, showBanner } = useBanner();
  useReturnBanner(showBanner);
  const { startCheckout, isRedirecting } = useCheckout(showBanner);

  const content = CONTENT[lang];

  // Which formats actually exist for the selected language, per each
  // Stripe product's metadata.format — e.g. English today has softcover +
  // hardcover, Spanish is softcover only. The EN/ES + softcover/hardcover
  // taxonomy itself is fixed (that's the business), but which combinations
  // exist — and their price/blurb/image — still comes straight from Stripe.
  const formatsForLang = useMemo(() => {
    if (!products) return [];
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const p of products) {
      if (p.lang === lang && p.format && !seen.has(p.format)) {
        seen.add(p.format);
        ordered.push(p.format);
      }
    }
    return ordered;
  }, [products, lang]);

  // Keep the format selection valid as the language changes — e.g. Spanish
  // has no "hardcover", so switching to it falls back to whatever format
  // Spanish actually offers instead of pointing at a nonexistent product.
  useEffect(() => {
    if (formatsForLang.length > 0 && !formatsForLang.includes(format)) {
      setFormat(formatsForLang[0]);
    }
  }, [formatsForLang, format, setFormat]);

  const product =
    products?.find((p) => p.lang === lang && p.format === format) ??
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
        <BookCover title={content.title} image={product?.image ?? null} />

        <section className="details">
          <h1>{content.title}</h1>
          <p className="byline">{content.byline}</p>

          <LangToggle lang={lang} onChange={setLang} />
          {formatsForLang.length > 1 && (
            <FormatToggle
              formats={formatsForLang}
              selected={format}
              labels={content.formatLabels}
              onChange={setFormat}
            />
          )}

          <p className="blurb">{product?.description ?? ''}</p>

          <SignedToggle label={content.signedLabel} checked={signed} onChange={setSigned} />
          <PriceDisplay formatted={priceFormatted} />
          <BuyButton
            label={buyLabel}
            disabled={buyDisabled}
            onClick={() => product && startCheckout(product.id, signed)}
          />

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
