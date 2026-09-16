import type { ManualMethodLabels } from '../content/types';
import type { ManualPaymentMethod } from '../types';

interface ManualPaymentPanelProps {
  intro: string;
  methodLabels: ManualMethodLabels;
  method: ManualPaymentMethod;
  onMethodChange: (method: ManualPaymentMethod) => void;
  loading: boolean;
  message: string | null;
}

export function ManualPaymentPanel({
  intro,
  methodLabels,
  method,
  onMethodChange,
  loading,
  message,
}: ManualPaymentPanelProps) {
  return (
    <div className="manual-panel">
      <p className="manual-panel-intro">{intro}</p>

      <div className="mf-methods">
        <label className="mf-radio">
          <input
            type="radio"
            name="mf-method"
            value="venmo"
            checked={method === 'venmo'}
            onChange={() => onMethodChange('venmo')}
          />
          <span>{methodLabels.venmo}</span>
        </label>
        <label className="mf-radio">
          <input
            type="radio"
            name="mf-method"
            value="zelle"
            checked={method === 'zelle'}
            onChange={() => onMethodChange('zelle')}
          />
          <span>{methodLabels.zelle}</span>
        </label>
      </div>

      {(loading || message) && <p className="manual-result">{loading ? '…' : message}</p>}
    </div>
  );
}
