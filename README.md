# Paper Trading Desk

A full stack trading dashboard prototype built around three things a trading
platform's engineers actually own: a live price surface, an order entry
flow, and a feed that keeps an AI agent's reasoning visible to the trader
instead of hidden behind it.

- **Interactive candlestick charts.** A custom SVG chart (no charting
  library) that traders can click directly on to mark an entry, a target,
  and a stop, across four timeframes (1m, 5m, 1h, 1d) built from one
  underlying 1 minute series through proper OHLC resampling.
- **An order ticket wired to a live position.** Buy and sell size presets
  (25 percent, 50 percent, 75 percent, 100 percent) are computed from the
  account's current buying power or open position, not hardcoded.
- **An AI agent signal feed.** A polling panel that surfaces momentum,
  sentiment, and anomaly signals with their source and a confidence score,
  so the AI's view of the market sits next to the trader's.

## Stack

- **Backend:** Python, FastAPI
- **Frontend:** TypeScript, React, Vite
- **Tests:** pytest (backend), vitest and Testing Library (frontend)

## Project layout

```
backend/
  app/
    market_data.py   candle generation and timeframe resampling
    orders.py         position tracking, order validation, size presets
    agent_feed.py      AI agent signal generation
    main.py            FastAPI routes wiring the above together
  tests/
frontend/
  src/
    api.ts                       typed client for the backend API
    components/
      CandlestickChart.tsx        SVG chart with timeframe and level marking
      OrderTicket.tsx             buy and sell ticket with live presets
      AgentFeed.tsx                polling AI signal panel
    App.tsx
```

## Running it locally

Backend:

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the API at `http://localhost:8000` by default,
configurable through the `VITE_API_BASE` environment variable.

## Testing

```bash
# backend
cd backend && pytest -v

# frontend
cd frontend && npx vitest run
```

## Design notes

Candles for every timeframe are derived from the same underlying 1 minute
series through real OHLC aggregation (first open, max high, min low, last
close, summed volume), so a 1 hour candle is always consistent with the
1 minute candles inside it rather than being generated independently. The
order engine tracks one position and a running weighted average price per
symbol, computing size presets straight from the live buying power or
position rather than fixed share counts.
