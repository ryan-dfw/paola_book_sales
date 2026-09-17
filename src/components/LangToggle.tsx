import type { UiLocale } from '../content/types';

interface LangToggleProps {
  lang: UiLocale;
  onChange: (lang: UiLocale) => void;
}

export function LangToggle({ lang, onChange }: LangToggleProps) {
  return (
    <div className="toggle-group" role="tablist" aria-label="Language">
      <button
        type="button"
        className={`toggle-btn${lang === 'en' ? ' is-active' : ''}`}
        role="tab"
        aria-selected={lang === 'en'}
        onClick={() => onChange('en')}
      >
        English
      </button>
      <button
        type="button"
        className={`toggle-btn${lang === 'es' ? ' is-active' : ''}`}
        role="tab"
        aria-selected={lang === 'es'}
        onClick={() => onChange('es')}
      >
        Español
      </button>
    </div>
  );
}
