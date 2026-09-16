import { useEffect } from 'react';

import { CONTENT } from './content';
import { formatMoney } from './utils/formatMoney';

import { usePrices } from './hooks/usePrices';
import { useProductSelection } from './hooks/useProductSelection';
import { useBanner } from './hooks/useBanner';
import { useReturnBanner } from './hooks/useReturnBanner';
import { useCheckout } from './hooks/useCheckout';
import { useManualPayment } from './hooks/useManualPayment';

import { Banner } from './components/Banner';
import { Header } from './components/Header';
import { BookCover } from './components/BookCover';
import { LangToggle } from './components/LangToggle';
import { SignedToggle } from './components/SignedToggle';
import { PriceDisplay } from './components/PriceDisplay';
import { BuyButton } from './components/BuyButton';
import { AltPaymentToggle } from './components/AltPaymentToggle';
import { ManualPaymentPanel } from './components/ManualPaymentPanel';
import { Footer } from './components/Footer';

export function App() {
  const { locale, setLocale, signed, setSigned } = useProductSelection();
  const prices = usePrices();
  const { banner, showBanner } = useBanner();
  useReturnBanner(showBanner);
  const { startCheckout, isRedirecting } = useCheckout(showBanner);
  const manual = useManualPayment(locale, signed);

  const content = CONTENT[locale];
  const priceEntry = prices?.[locale] ?? null;

  useEffect(() => {
    document.title = `${content.title} — a memoir`;
  }, [content.title]);

  const priceFormatted = priceEntry ? formatMoney(priceEntry.amount, priceEntry.currency) : '…';
  const buyLabel = isRedirecting
    ? 'One moment…'
    : priceEntry
      ? `${content.buyPrefix} — ${priceFormatted}`
      : content.buyPrefix;
  const buyDisabled = !priceEntry || isRedirecting;

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
        <BookCover />

        <section className="details">
          <h1>{content.title}</h1>
          <p className="byline">{content.byline}</p>

          <LangToggle locale={locale} onChange={setLocale} />

          <p className="blurb">{content.blurb}</p>

          <SignedToggle label={content.signedLabel} checked={signed} onChange={setSigned} />
          <PriceDisplay formatted={priceFormatted} />
          <BuyButton label={buyLabel} disabled={buyDisabled} onClick={() => startCheckout(locale, signed)} />

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
