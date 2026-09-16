interface BuyButtonProps {
  label: string;
  disabled: boolean;
  onClick: () => void;
}

export function BuyButton({ label, disabled, onClick }: BuyButtonProps) {
  return (
    <button type="button" className="buy-button" disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}
