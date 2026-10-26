"""FastAPI app wiring market data, the order engine, and the agent feed
together for the dashboard frontend."""
from __future__ import annotations

import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.agent_feed import AgentFeed
from app.market_data import MarketDataStore, SYMBOLS, TIMEFRAMES
from app.orders import OrderEngine

app = FastAPI(title="Paper Trading Desk API")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

_market = MarketDataStore(seed=0)
_orders = OrderEngine(starting_buying_power=100_000.0)
_agent_feed = AgentFeed(seed=1)


class CandleResponse(BaseModel):
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float


class OrderRequest(BaseModel):
    symbol: str
    side: str
    quantity: float
    price: float


class OrderResponse(BaseModel):
    order_id: int
    symbol: str
    side: str
    quantity: float
    price: float
    status: str
    rejection_reason: str | None = None


@app.get("/api/symbols")
def get_symbols() -> list[str]:
    return SYMBOLS


@app.get("/api/candles/{symbol}", response_model=list[CandleResponse])
def get_candles(symbol: str, timeframe: str = "5m", limit: int = 200) -> list[CandleResponse]:
    if timeframe not in TIMEFRAMES:
        raise HTTPException(status_code=400, detail=f"unknown timeframe {timeframe!r}")
    try:
        candles = _market.get_candles(symbol, timeframe, limit)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return [CandleResponse(**vars(c)) for c in candles]


@app.get("/api/price/{symbol}")
def get_price(symbol: str) -> dict:
    if symbol not in SYMBOLS:
        raise HTTPException(status_code=404, detail=f"unknown symbol {symbol!r}")
    return {"symbol": symbol, "price": _market.latest_price(symbol)}


@app.get("/api/positions/{symbol}")
def get_position(symbol: str) -> dict:
    if symbol not in SYMBOLS:
        raise HTTPException(status_code=404, detail=f"unknown symbol {symbol!r}")
    position = _orders.get_position(symbol)
    latest_price = _market.latest_price(symbol)
    return {
        "symbol": symbol,
        "quantity": position.quantity,
        "avg_price": position.avg_price,
        "buying_power": _orders.buying_power,
        "buy_presets": _orders.size_presets(symbol, "buy", latest_price),
        "sell_presets": _orders.size_presets(symbol, "sell", latest_price),
    }


@app.post("/api/orders", response_model=OrderResponse)
def submit_order(request: OrderRequest) -> OrderResponse:
    if request.symbol not in SYMBOLS:
        raise HTTPException(status_code=404, detail=f"unknown symbol {request.symbol!r}")
    order = _orders.submit_order(request.symbol, request.side, request.quantity, request.price)
    return OrderResponse(**vars(order))


@app.get("/api/agent-feed")
def get_agent_feed(generate: bool = True, limit: int = 20) -> list[dict]:
    if generate:
        _agent_feed.generate_signal(now=time.time())
    return [vars(s) for s in _agent_feed.recent(limit)]
