interface ShipToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Same visual style as SignedToggle (shares its ".signed-toggle" CSS) — an
 * independent opt-in checkbox, not a mutually-exclusive choice with it. */
export function ShipToggle({ label, checked, onChange }: ShipToggleProps) {
  return (
    <label className="signed-toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
