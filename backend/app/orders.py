"""A mock order engine: tracks one position and one buying-power balance per
symbol, validates an order against them before filling it, and computes
quick-size presets straight from the live position or available buying
power -- "sizing straight from the live position" is one of the trading
surface requirements this is built against.
"""
from __future__ import annotations

from dataclasses import dataclass, field

PRESET_FRACTIONS = [0.25, 0.5, 0.75, 1.0]


@dataclass
class Position:
    symbol: str
    quantity: float = 0.0
    avg_price: float = 0.0


@dataclass
class Order:
    order_id: int
    symbol: str
    side: str  # "buy" or "sell"
    quantity: float
    price: float
    status: str  # "filled" or "rejected"
    rejection_reason: str | None = None


class InsufficientFundsError(ValueError):
    pass


class InsufficientPositionError(ValueError):
    pass


class OrderEngine:
    def __init__(self, starting_buying_power: float = 100_000.0):
        self.buying_power = starting_buying_power
        self.positions: dict[str, Position] = {}
        self._next_order_id = 1

    def _position_for(self, symbol: str) -> Position:
        return self.positions.setdefault(symbol, Position(symbol=symbol))

    def get_position(self, symbol: str) -> Position:
        return self._position_for(symbol)

    def size_presets(self, symbol: str, side: str, latest_price: float) -> dict[str, float]:
        """Quick-size buttons: fractions of buying power for a buy, fractions
        of the current held position for a sell."""
        position = self._position_for(symbol)
        if side == "buy":
            base_quantity = self.buying_power / latest_price if latest_price > 0 else 0.0
        elif side == "sell":
            base_quantity = position.quantity
        else:
            raise ValueError(f"unknown side: {side!r}")

        return {f"{int(f * 100)}%": round(base_quantity * f, 6) for f in PRESET_FRACTIONS}

    def submit_order(self, symbol: str, side: str, quantity: float, price: float) -> Order:
        order_id = self._next_order_id
        self._next_order_id += 1

        if quantity <= 0:
            return Order(order_id, symbol, side, quantity, price, "rejected", "quantity must be positive")

        position = self._position_for(symbol)
        cost = quantity * price

        if side == "buy":
            if cost > self.buying_power:
                return Order(order_id, symbol, side, quantity, price, "rejected", "insufficient buying power")
            new_quantity = position.quantity + quantity
            position.avg_price = (position.avg_price * position.quantity + cost) / new_quantity if new_quantity else 0.0
            position.quantity = new_quantity
            self.buying_power -= cost
        elif side == "sell":
            if quantity > position.quantity:
                return Order(order_id, symbol, side, quantity, price, "rejected", "insufficient position to sell")
            position.quantity -= quantity
            self.buying_power += cost
            if position.quantity == 0:
                position.avg_price = 0.0
        else:
            return Order(order_id, symbol, side, quantity, price, "rejected", f"unknown side: {side!r}")

        return Order(order_id, symbol, side, quantity, price, "filled")
