interface SignedToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function SignedToggle({ label, checked, onChange }: SignedToggleProps) {
  return (
    <label className="signed-toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
