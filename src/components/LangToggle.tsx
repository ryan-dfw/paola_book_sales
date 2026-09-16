import type { Locale } from '../types';

interface LangToggleProps {
  locale: Locale;
  onChange: (locale: Locale) => void;
}

export function LangToggle({ locale, onChange }: LangToggleProps) {
  return (
    <div className="lang-toggle" role="tablist" aria-label="Edition language">
      <button
        type="button"
        className={`lang-btn${locale === 'en' ? ' is-active' : ''}`}
        role="tab"
        aria-selected={locale === 'en'}
        onClick={() => onChange('en')}
      >
        English
      </button>
      <button
        type="button"
        className={`lang-btn${locale === 'es' ? ' is-active' : ''}`}
        role="tab"
        aria-selected={locale === 'es'}
        onClick={() => onChange('es')}
      >
        Español
      </button>
    </div>
  );
}
