"""A simulated feed of AI research-agent signals, standing in for the
"narrative pipelines and alerts" the dashboard is meant to make visible --
each signal names which agent produced it, what kind of source it is
watching, and which symbol it concerns, so a viewer can tell at a glance
whether to trust it.
"""
from __future__ import annotations

import itertools
from dataclasses import dataclass

import numpy as np

from app.market_data import SYMBOLS

AGENT_TYPES = ["momentum", "sentiment", "anomaly"]

SOURCE_BY_AGENT = {
    "momentum": "price action",
    "sentiment": "social media and Reddit mentions",
    "anomaly": "order flow and prediction markets",
}

TEMPLATES = {
    "momentum": [
        "{symbol} broke through its prior session high on rising volume",
        "{symbol} is showing a sustained upward move over the last hour",
        "{symbol} momentum is fading after an extended run",
    ],
    "sentiment": [
        "Mention volume for {symbol} spiked sharply on social media",
        "Reddit sentiment on {symbol} turned notably more positive",
        "A cluster of negative posts about {symbol} appeared in the last 30 minutes",
    ],
    "anomaly": [
        "Unusual order flow detected in {symbol}",
        "Prediction market odds tied to {symbol} shifted abruptly",
        "{symbol} volume is running well above its typical range for this time of day",
    ],
}


@dataclass
class AgentSignal:
    signal_id: int
    agent_type: str
    source: str
    symbol: str
    message: str
    confidence: float  # 0 to 1
    timestamp: float


class AgentFeed:
    def __init__(self, seed: int | None = None):
        self._rng = np.random.default_rng(seed)
        self._counter = itertools.count(1)
        self._signals: list[AgentSignal] = []

    def generate_signal(self, now: float) -> AgentSignal:
        agent_type = str(self._rng.choice(AGENT_TYPES))
        symbol = str(self._rng.choice(SYMBOLS))
        template = str(self._rng.choice(TEMPLATES[agent_type]))
        signal = AgentSignal(
            signal_id=next(self._counter),
            agent_type=agent_type,
            source=SOURCE_BY_AGENT[agent_type],
            symbol=symbol,
            message=template.format(symbol=symbol),
            confidence=round(float(self._rng.uniform(0.55, 0.97)), 2),
            timestamp=now,
        )
        self._signals.append(signal)
        return signal

    def recent(self, limit: int = 20) -> list[AgentSignal]:
        return self._signals[-limit:][::-1]  # newest first
