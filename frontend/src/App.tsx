import { useCallback, useEffect, useState } from "react";
import "./App.css";
import type { Candle, OrderResponse, Position, Timeframe } from "./api";
import { getCandles, getPosition, getPrice, getSymbols, submitOrder } from "./api";
import CandlestickChart from "./components/CandlestickChart";
import OrderTicket from "./components/OrderTicket";
import AgentFeed from "./components/AgentFeed";

const CANDLE_POLL_MS = 5000;
const PRICE_POLL_MS = 2000;

function App() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [symbol, setSymbol] = useState<string>("");
  const [timeframe, setTimeframe] = useState<Timeframe>("5m");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [price, setPrice] = useState<number | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    getSymbols()
      .then((fetched) => {
        setSymbols(fetched);
        setSymbol((current) => current || fetched[0] || "");
      })
      .catch(() => setLoadError("Could not reach the trading API. Is the backend running?"));
  }, []);

  const refreshPosition = useCallback(() => {
    if (!symbol) return;
    getPosition(symbol).then(setPosition).catch(() => undefined);
  }, [symbol]);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;

    getCandles(symbol, timeframe).then((data) => {
      if (!cancelled) setCandles(data);
    });
    const candleInterval = setInterval(() => {
      getCandles(symbol, timeframe).then((data) => {
        if (!cancelled) setCandles(data);
      });
    }, CANDLE_POLL_MS);

    getPrice(symbol).then((data) => {
      if (!cancelled) setPrice(data.price);
    });
    const priceInterval = setInterval(() => {
      getPrice(symbol).then((data) => {
        if (!cancelled) setPrice(data.price);
      });
    }, PRICE_POLL_MS);

    refreshPosition();

    return () => {
      cancelled = true;
      clearInterval(candleInterval);
      clearInterval(priceInterval);
    };
  }, [symbol, timeframe, refreshPosition]);

  async function handleOrderSubmit(side: "buy" | "sell", quantity: number): Promise<OrderResponse> {
    const result = await submitOrder({
      symbol,
      side,
      quantity,
      price: price ?? 0,
    });
    refreshPosition();
    return result;
  }

  if (loadError) {
    return (
      <div className="app-error">
        <h1>Paper Trading Desk</h1>
        <p>{loadError}</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Paper Trading Desk</h1>
        <select
          aria-label="Symbol"
          value={symbol}
          onChange={(event) => setSymbol(event.target.value)}
        >
          {symbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-chart">
          {symbol && (
            <CandlestickChart
              key={symbol}
              symbol={symbol}
              candles={candles}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
            />
          )}
        </section>

        <aside className="dashboard-side">
          {symbol && (
            <OrderTicket
              symbol={symbol}
              latestPrice={price ?? 0}
              position={position}
              onSubmit={handleOrderSubmit}
            />
          )}
          <AgentFeed />
        </aside>
      </main>
    </div>
  );
}

export default App;
