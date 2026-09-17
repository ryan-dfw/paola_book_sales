import type { FormatLabels } from '../content/types';

interface FormatToggleProps {
  formats: string[];
  selected: string;
  labels: FormatLabels;
  onChange: (format: string) => void;
}

/** Only rendered by App.tsx when the selected language actually has more than one format (Spanish, today, doesn't). */
export function FormatToggle({ formats, selected, labels, onChange }: FormatToggleProps) {
  return (
    <div className="toggle-group" role="tablist" aria-label="Format">
      {formats.map((format) => (
        <button
          key={format}
          type="button"
          className={`toggle-btn${format === selected ? ' is-active' : ''}`}
          role="tab"
          aria-selected={format === selected}
          onClick={() => onChange(format)}
        >
          {labels[format as keyof FormatLabels] ?? format}
        </button>
      ))}
    </div>
  );
}
