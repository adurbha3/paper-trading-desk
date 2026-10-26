import { useState } from "react";
import type { OrderResponse, Position } from "../api";

interface OrderTicketProps {
  symbol: string;
  latestPrice: number;
  position: Position | null;
  onSubmit: (side: "buy" | "sell", quantity: number) => Promise<OrderResponse>;
}

export default function OrderTicket({ symbol, latestPrice, position, onSubmit }: OrderTicketProps) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [lastResult, setLastResult] = useState<OrderResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const presets = side === "buy" ? position?.buy_presets : position?.sell_presets;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = Number(quantity);
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    setSubmitting(true);
    try {
      const result = await onSubmit(side, parsed);
      setLastResult(result);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="order-ticket" onSubmit={handleSubmit}>
      <h3>Order Ticket</h3>

      <div className="side-toggle" role="group" aria-label="Side">
        <button type="button" className={side === "buy" ? "active buy" : "buy"} onClick={() => setSide("buy")}>
          Buy
        </button>
        <button type="button" className={side === "sell" ? "active sell" : "sell"} onClick={() => setSide("sell")}>
          Sell
        </button>
      </div>

      <dl className="order-info">
        <dt>Symbol</dt>
        <dd>{symbol}</dd>
        <dt>Last price</dt>
        <dd>{latestPrice.toFixed(2)}</dd>
        <dt>Buying power</dt>
        <dd>{position ? position.buying_power.toFixed(2) : "--"}</dd>
        <dt>Position</dt>
        <dd>{position ? `${position.quantity} @ ${position.avg_price.toFixed(2)}` : "--"}</dd>
      </dl>

      <label htmlFor="order-quantity">Quantity</label>
      <input
        id="order-quantity"
        type="number"
        min="0"
        step="any"
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
        placeholder="0.00"
      />

      {presets && (
        <div className="size-presets" role="group" aria-label="Size presets">
          {Object.entries(presets).map(([label, value]) => (
            <button key={label} type="button" onClick={() => setQuantity(String(value))}>
              {label}
            </button>
          ))}
        </div>
      )}

      <button type="submit" className={`submit ${side}`} disabled={submitting}>
        {submitting ? "Submitting..." : `${side === "buy" ? "Buy" : "Sell"} ${symbol}`}
      </button>

      {lastResult && (
        <p className={`order-result ${lastResult.status}`} role="status">
          {lastResult.status === "filled"
            ? `Filled ${lastResult.quantity} ${lastResult.symbol} at ${lastResult.price.toFixed(2)}`
            : `Rejected: ${lastResult.rejection_reason}`}
        </p>
      )}
    </form>
  );
}
