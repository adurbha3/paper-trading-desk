"""Synthetic multi-timeframe candlestick data.

A single seeded 1-minute random-walk series is generated per symbol, and
every other timeframe (5m, 1h, 1d) is built by resampling that same base
series (open = first, high = max, low = min, close = last, volume = sum)
rather than generated independently per timeframe -- the same relationship
real OHLC data has, so a 5-minute candle is actually consistent with the
five 1-minute candles inside it.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

SYMBOLS = ["BTCUSD", "ETHUSD", "AAPL", "TSLA"]
BASE_PRICE = {"BTCUSD": 64000.0, "ETHUSD": 3100.0, "AAPL": 227.0, "TSLA": 248.0}
VOLATILITY = {"BTCUSD": 0.0009, "ETHUSD": 0.0011, "AAPL": 0.0003, "TSLA": 0.0006}

TIMEFRAMES = {"1m": 1, "5m": 5, "1h": 60, "1d": 1440}


@dataclass
class Candle:
    timestamp: int  # minutes since series start
    open: float
    high: float
    low: float
    close: float
    volume: float


def _generate_1m_series(symbol: str, n_minutes: int, seed: int) -> list[Candle]:
    rng = np.random.default_rng(seed)
    price = BASE_PRICE[symbol]
    sigma = VOLATILITY[symbol]
    candles = []

    for minute in range(n_minutes):
        open_price = price
        # A short random walk of sub-ticks within the minute, so high/low are
        # not just a coin flip around open/close.
        n_ticks = 6
        ticks = [open_price]
        for _ in range(n_ticks):
            ticks.append(ticks[-1] * math.exp(rng.normal(0, sigma)))
        close_price = ticks[-1]
        high = max(ticks)
        low = min(ticks)
        volume = float(abs(rng.normal(100, 30)) * (1 + 50 * abs(close_price - open_price) / open_price))

        candles.append(Candle(
            timestamp=minute, open=round(open_price, 2), high=round(high, 2),
            low=round(low, 2), close=round(close_price, 2), volume=round(volume, 2),
        ))
        price = close_price

    return candles


def resample(candles_1m: list[Candle], minutes_per_candle: int) -> list[Candle]:
    if minutes_per_candle == 1:
        return candles_1m

    resampled = []
    for i in range(0, len(candles_1m), minutes_per_candle):
        chunk = candles_1m[i : i + minutes_per_candle]
        if not chunk:
            continue
        resampled.append(Candle(
            timestamp=chunk[0].timestamp,
            open=chunk[0].open,
            high=max(c.high for c in chunk),
            low=min(c.low for c in chunk),
            close=chunk[-1].close,
            volume=round(sum(c.volume for c in chunk), 2),
        ))
    return resampled


class MarketDataStore:
    """Generates and caches the base 1-minute series per symbol, and serves
    any timeframe by resampling from it on demand."""

    def __init__(self, n_minutes: int = 1440 * 5, seed: int = 0):
        self.n_minutes = n_minutes
        self._base_series: dict[str, list[Candle]] = {}
        rng = np.random.default_rng(seed)
        for symbol in SYMBOLS:
            sub_seed = int(rng.integers(0, 2**31 - 1))
            self._base_series[symbol] = _generate_1m_series(symbol, n_minutes, sub_seed)

    def get_candles(self, symbol: str, timeframe: str, limit: int = 200) -> list[Candle]:
        if symbol not in self._base_series:
            raise ValueError(f"unknown symbol: {symbol}")
        if timeframe not in TIMEFRAMES:
            raise ValueError(f"unknown timeframe: {timeframe}")
        resampled = resample(self._base_series[symbol], TIMEFRAMES[timeframe])
        return resampled[-limit:]

    def latest_price(self, symbol: str) -> float:
        return self._base_series[symbol][-1].close
