import type { ManualOrderPayload, ManualOrderResult } from '../types';

interface ManualOrderErrorResponse {
  error?: string;
}

export async function submitManualOrder(payload: ManualOrderPayload): Promise<ManualOrderResult> {
  const res = await fetch('/api/manual-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as ManualOrderResult & ManualOrderErrorResponse;

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong.');
  }

  // Belt-and-suspenders: the function is supposed to only ever return 200
  // with a fully-formed result, but if Stripe ever hands back a price
  // that's missing an amount/currency (misconfigured price, wrong-mode
  // key, etc.), fail here with a readable message instead of letting a
  // malformed value reach formatMoney()/Intl.NumberFormat downstream,
  // where an empty currency string throws a cryptic
  // "did not match the expected pattern" RangeError during render.
  if (typeof data.amount !== 'number' || !Number.isFinite(data.amount) || !data.currency) {
    throw new Error('The price for this option isn\u2019t set up correctly in Stripe yet.');
  }

  return data;
}
