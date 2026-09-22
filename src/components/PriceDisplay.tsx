interface PriceDisplayProps {
  formatted: string;
  note?: string;
}

export function PriceDisplay({ formatted, note }: PriceDisplayProps) {
  return (
    <div className="price-row">
      <span className="price">{formatted}</span>
      {note && <span className="price-note">{note}</span>}
    </div>
  );
}
