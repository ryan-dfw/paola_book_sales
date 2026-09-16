interface AltPaymentToggleProps {
  label: string;
  onClick: () => void;
}

export function AltPaymentToggle({ label, onClick }: AltPaymentToggleProps) {
  return (
    <button type="button" className="alt-payment-toggle" onClick={onClick}>
      {label}
    </button>
  );
}
