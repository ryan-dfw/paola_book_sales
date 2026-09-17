import type { Edition } from '../content/types';

const OPTIONS: { value: Edition; label: string }[] = [
  { value: 'hardcover', label: 'Hardcover' },
  { value: 'english', label: 'English' },
  { value: 'espanol', label: 'Español' },
];

interface EditionToggleProps {
  edition: Edition;
  onChange: (edition: Edition) => void;
}

/**
 * One flat three-way choice standing in for what used to be two separate
 * toggles (language, then conditionally a format toggle only shown for
 * English). There are only three real products, so this picks directly
 * among them — English (softcover) sits in the middle as the default, with
 * Hardcover and Español on either side.
 */
export function EditionToggle({ edition, onChange }: EditionToggleProps) {
  const activeIndex = OPTIONS.findIndex((o) => o.value === edition);

  return (
    <div className="toggle-group" role="tablist" aria-label="Edition">
      {/* The sliding pill behind the active label — iOS segmented-control
          style. Percentage-based transform, so it tracks the (equal-width)
          buttons exactly regardless of container width. */}
      <div className="toggle-thumb" aria-hidden="true" style={{ transform: `translateX(${activeIndex * 100}%)` }} />
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={`toggle-btn${edition === value ? ' is-active' : ''}`}
          role="tab"
          aria-selected={edition === value}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
