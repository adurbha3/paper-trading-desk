from app.orders import OrderEngine


def test_buy_order_fills_and_updates_position():
    engine = OrderEngine(starting_buying_power=10_000.0)
    order = engine.submit_order("AAPL", "buy", quantity=10, price=200.0)
    assert order.status == "filled"
    position = engine.get_position("AAPL")
    assert position.quantity == 10
    assert position.avg_price == 200.0
    assert engine.buying_power == 10_000.0 - 2000.0


def test_buy_order_rejected_when_insufficient_buying_power():
    engine = OrderEngine(starting_buying_power=100.0)
    order = engine.submit_order("AAPL", "buy", quantity=10, price=200.0)
    assert order.status == "rejected"
    assert order.rejection_reason == "insufficient buying power"
    assert engine.get_position("AAPL").quantity == 0


def test_sell_order_rejected_without_a_position():
    engine = OrderEngine(starting_buying_power=10_000.0)
    order = engine.submit_order("AAPL", "sell", quantity=5, price=200.0)
    assert order.status == "rejected"
    assert order.rejection_reason == "insufficient position to sell"


def test_sell_order_fills_and_returns_buying_power():
    engine = OrderEngine(starting_buying_power=10_000.0)
    engine.submit_order("AAPL", "buy", quantity=10, price=200.0)
    order = engine.submit_order("AAPL", "sell", quantity=4, price=210.0)
    assert order.status == "filled"
    position = engine.get_position("AAPL")
    assert position.quantity == 6
    assert engine.buying_power == 10_000.0 - 2000.0 + 840.0


def test_average_price_updates_across_two_buys():
    engine = OrderEngine(starting_buying_power=100_000.0)
    engine.submit_order("AAPL", "buy", quantity=10, price=100.0)
    engine.submit_order("AAPL", "buy", quantity=10, price=200.0)
    position = engine.get_position("AAPL")
    assert position.quantity == 20
    assert position.avg_price == 150.0


def test_nonpositive_quantity_is_rejected():
    engine = OrderEngine()
    order = engine.submit_order("AAPL", "buy", quantity=0, price=100.0)
    assert order.status == "rejected"
    assert "positive" in order.rejection_reason


def test_size_presets_for_buy_are_fractions_of_buying_power():
    engine = OrderEngine(starting_buying_power=1000.0)
    presets = engine.size_presets("AAPL", "buy", latest_price=100.0)
    assert presets["25%"] == 2.5
    assert presets["100%"] == 10.0


def test_size_presets_for_sell_are_fractions_of_current_position():
    engine = OrderEngine(starting_buying_power=100_000.0)
    engine.submit_order("AAPL", "buy", quantity=20, price=100.0)
    presets = engine.size_presets("AAPL", "sell", latest_price=150.0)
    assert presets["50%"] == 10.0
    assert presets["100%"] == 20.0


def test_closing_a_position_fully_resets_avg_price():
    engine = OrderEngine(starting_buying_power=100_000.0)
    engine.submit_order("AAPL", "buy", quantity=10, price=100.0)
    engine.submit_order("AAPL", "sell", quantity=10, price=120.0)
    position = engine.get_position("AAPL")
    assert position.quantity == 0
    assert position.avg_price == 0.0
