interface PriceDisplayProps {
  formatted: string;
}

export function PriceDisplay({ formatted }: PriceDisplayProps) {
  return (
    <div className="price-row">
      <span className="price">{formatted}</span>
    </div>
  );
}
